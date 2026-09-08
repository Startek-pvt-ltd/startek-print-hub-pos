import "server-only";
import { Prisma, type QuotationStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { calculateInvoiceTotals } from "@/domain/financial";
import { assertQuotationEditable, assertQuotationTransition, formatBusinessNumber } from "@/domain/phase4";
import type { ConversionInput, QuotationEditInput, QuotationInput } from "@/lib/validations/phase4";

export class Phase4OperationError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = "Phase4OperationError"; }
}

export const quotationInclude = { items: { orderBy: { sortOrder: "asc" as const } }, createdBy: { select: { name: true } }, convertedBy: { select: { name: true } }, statusHistory: { orderBy: { createdAt: "asc" as const }, include: { changedBy: { select: { name: true } } } }, order: { select: { id: true, orderNumber: true } } } satisfies Prisma.QuotationInclude;

async function number(tx: Prisma.TransactionClient, kind: "quote" | "order", fallback: string) {
  const settings = await tx.setting.findUnique({ where: { id: "primary" }, select: { quotePrefix: true, orderPrefix: true } });
  const counter = await tx.numberCounter.upsert({ where: { key: kind }, create: { key: kind, nextValue: 2n }, update: { nextValue: { increment: 1n } }, select: { nextValue: true } });
  return formatBusinessNumber(kind === "quote" ? settings?.quotePrefix ?? fallback : settings?.orderPrefix ?? fallback, counter.nextValue - 1n);
}

function date(value: string | null) { return value ? new Date(`${value}T00:00:00.000Z`) : null; }

async function customer(tx: Prisma.TransactionClient, name: string, phoneNumber: string, actorId: string) {
  const existing = await tx.customer.findUnique({ where: { phoneNumber } });
  if (existing) return tx.customer.update({ where: { id: existing.id }, data: { name } });
  const created = await tx.customer.create({ data: { name, phoneNumber } });
  await tx.auditLog.create({ data: { userId: actorId, action: "CUSTOMER_CREATED", entityType: "Customer", entityId: created.id, metadata: { name, phoneNumber } } });
  return created;
}

export async function createQuotation(input: QuotationInput, actorId: string) {
  const totals = calculateInvoiceTotals(input.items, input.discount);
  return db.$transaction(async (tx) => {
    const duplicate = await tx.quotation.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: quotationInclude });
    if (duplicate) return duplicate;
    if (input.issueNow && input.validUntil) assertQuotationTransition("DRAFT", "ISSUED", date(input.validUntil));
    const linkedCustomer = await customer(tx, input.customerName, input.customerPhone, actorId);
    const quotationNumber = await number(tx, "quote", "SPH-QT");
    const status: QuotationStatus = input.issueNow ? "ISSUED" : "DRAFT";
    const quotation = await tx.quotation.create({ data: {
      quotationNumber, idempotencyKey: input.idempotencyKey, customerId: linkedCustomer.id, customerNameSnapshot: input.customerName, customerPhoneSnapshot: input.customerPhone,
      subtotal: totals.subtotal.toFixed(2), discount: totals.discount.toFixed(2), grandTotal: totals.grandTotal.toFixed(2), status, notes: input.notes, validUntil: date(input.validUntil), createdById: actorId,
      items: { create: input.items.map((item, i) => ({ ...item, lineTotal: totals.lineTotals[i].toFixed(2), sortOrder: i })) },
      statusHistory: { create: { newStatus: status, changedById: actorId, note: input.issueNow ? "Created and issued" : "Draft created" } },
    }, include: quotationInclude });
    await tx.auditLog.create({ data: { userId: actorId, action: input.issueNow ? "QUOTATION_ISSUED" : "QUOTATION_CREATED", entityType: "Quotation", entityId: quotation.id, metadata: { quotationNumber, grandTotal: totals.grandTotal.toFixed(2), status } } });
    return quotation;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function editQuotation(input: QuotationEditInput, actorId: string) {
  const totals = calculateInvoiceTotals(input.items, input.discount);
  return db.$transaction(async (tx) => {
    const current = await tx.quotation.findUnique({ where: { id: input.quotationId } });
    if (!current) throw new Phase4OperationError("NOT_FOUND", "Quotation was not found");
    assertQuotationEditable(current.status);
    const linkedCustomer = await customer(tx, input.customerName, input.customerPhone, actorId);
    await tx.quotationItem.deleteMany({ where: { quotationId: current.id } });
    const updated = await tx.quotation.update({ where: { id: current.id }, data: { customerId: linkedCustomer.id, customerNameSnapshot: input.customerName, customerPhoneSnapshot: input.customerPhone, subtotal: totals.subtotal.toFixed(2), discount: totals.discount.toFixed(2), grandTotal: totals.grandTotal.toFixed(2), notes: input.notes, validUntil: date(input.validUntil), items: { create: input.items.map((item, i) => ({ ...item, lineTotal: totals.lineTotals[i].toFixed(2), sortOrder: i })) } }, include: quotationInclude });
    await tx.auditLog.create({ data: { userId: actorId, action: "QUOTATION_EDITED", entityType: "Quotation", entityId: current.id, metadata: { quotationNumber: current.quotationNumber, grandTotal: totals.grandTotal.toFixed(2) } } });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function changeQuotationStatus(id: string, next: QuotationStatus, note: string | null, actorId: string) {
  return db.$transaction(async (tx) => {
    const current = await tx.quotation.findUnique({ where: { id } });
    if (!current) throw new Phase4OperationError("NOT_FOUND", "Quotation was not found");
    assertQuotationTransition(current.status, next, current.validUntil);
    const updated = await tx.quotation.update({ where: { id }, data: { status: next } });
    await tx.quotationStatusHistory.create({ data: { quotationId: id, previousStatus: current.status, newStatus: next, note, changedById: actorId } });
    await tx.auditLog.create({ data: { userId: actorId, action: `QUOTATION_${next}`, entityType: "Quotation", entityId: id, metadata: { quotationNumber: current.quotationNumber, from: current.status, to: next, note } } });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function convertQuotation(input: ConversionInput, actorId: string) {
  try {
    return await db.$transaction(async (tx) => {
      const quotation = await tx.quotation.findUnique({ where: { id: input.quotationId }, include: { items: { orderBy: { sortOrder: "asc" } }, order: true } });
      if (!quotation) throw new Phase4OperationError("NOT_FOUND", "Quotation was not found");
      if (quotation.order || quotation.status === "CONVERTED") throw new Phase4OperationError("ALREADY_CONVERTED", "Quotation has already been converted");
      assertQuotationTransition(quotation.status, "CONVERTED", quotation.validUntil);
      if (quotation.validUntil && quotation.validUntil.toISOString().slice(0, 10) < new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())) throw new Phase4OperationError("QUOTATION_EXPIRED", "Expired quotations cannot be converted");
      if (input.assignedStaffId) {
        const staff = await tx.user.findFirst({ where: { id: input.assignedStaffId, status: "ACTIVE" } });
        if (!staff) throw new Phase4OperationError("INVALID_STAFF", "Select an active staff member");
      }
      const orderNumber = await number(tx, "order", "SPH-ORD");
      const order = await tx.order.create({ data: { orderNumber, quotationId: quotation.id, customerId: quotation.customerId, customerNameSnapshot: quotation.customerNameSnapshot, customerPhoneSnapshot: quotation.customerPhoneSnapshot, jobName: input.jobName, dueDate: date(input.dueDate), assignedStaffId: input.assignedStaffId, notes: input.notes, createdById: actorId, items: { create: quotation.items.map((item) => ({ description: item.description, quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: item.lineTotal, sortOrder: item.sortOrder })) }, statusHistory: { create: { newStatus: "PENDING", changedById: actorId, note: "Created from accepted quotation" } } } });
      await tx.quotation.update({ where: { id: quotation.id }, data: { status: "CONVERTED", convertedAt: new Date(), convertedById: actorId } });
      await tx.quotationStatusHistory.create({ data: { quotationId: quotation.id, previousStatus: quotation.status, newStatus: "CONVERTED", changedById: actorId, note: `Converted to ${orderNumber}` } });
      await tx.auditLog.createMany({ data: [
        { userId: actorId, action: "QUOTATION_CONVERTED", entityType: "Quotation", entityId: quotation.id, metadata: { quotationNumber: quotation.quotationNumber, orderId: order.id, orderNumber } },
        { userId: actorId, action: "ORDER_CREATED", entityType: "Order", entityId: order.id, metadata: { orderNumber, quotationId: quotation.id, quotationNumber: quotation.quotationNumber } },
      ] });
      return order;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new Phase4OperationError("ALREADY_CONVERTED", "Quotation has already been converted");
    throw error;
  }
}
