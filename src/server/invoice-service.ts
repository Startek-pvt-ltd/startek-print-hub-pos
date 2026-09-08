import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { calculateOutstanding, calculateValidPaidTotal, formatMoney, validatePayment } from "@/domain/financial";
import { allocateInvoiceNumber } from "@/domain/invoice-number";
import { assertInvoiceCanBeVoided, buildReceiptReprintAudit } from "@/domain/invoice-rules";
import { prepareInvoicePlan } from "@/domain/invoice-plan";
import type { InvoiceInput, BalancePaymentInput } from "@/lib/validations/invoice";

export class InvoiceOperationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "InvoiceOperationError";
  }
}

const invoiceInclude = {
  createdBy: { select: { name: true } },
  voidedBy: { select: { name: true } },
  customer: true,
  items: { orderBy: { sortOrder: "asc" as const } },
  payments: {
    orderBy: { createdAt: "asc" as const },
    include: { recordedBy: { select: { name: true } }, reversal: true },
  },
} satisfies Prisma.InvoiceInclude;

export async function createInvoice(input: InvoiceInput, actorId: string) {
  const { totals, snapshot, initialPayment } = prepareInvoicePlan(input);

  return db.$transaction(async (tx) => {
    const duplicate = await tx.invoice.findUnique({ where: { idempotencyKey: input.idempotencyKey }, include: invoiceInclude });
    if (duplicate) {
      if (duplicate.createdById !== actorId) throw new InvoiceOperationError("DUPLICATE_SUBMISSION", "This submission key is already in use");
      return summarizeInvoice(duplicate);
    }

    let customerId: string | null = null;
    if (snapshot.name && snapshot.phoneNumber) {
      const existing = await tx.customer.findUnique({ where: { phoneNumber: snapshot.phoneNumber } });
      const customer = existing
        ? await tx.customer.update({ where: { id: existing.id }, data: { name: snapshot.name } })
        : await tx.customer.create({ data: { name: snapshot.name, phoneNumber: snapshot.phoneNumber } });
      customerId = customer.id;
      if (!existing) {
        await tx.auditLog.create({ data: { userId: actorId, action: "CUSTOMER_CREATED", entityType: "Customer", entityId: customer.id, metadata: { name: customer.name, phoneNumber: customer.phoneNumber } } });
      }
    }

    const settings = await tx.setting.findUnique({ where: { id: "primary" }, select: { invoicePrefix: true } });
    const invoiceNumber = await allocateInvoiceNumber(settings?.invoicePrefix ?? "SPH-INV", async () => {
      const counter = await tx.numberCounter.upsert({
        where: { key: "invoice" },
        create: { key: "invoice", nextValue: BigInt(2) },
        update: { nextValue: { increment: BigInt(1) } },
        select: { nextValue: true },
      });
      return counter.nextValue;
    });

    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        idempotencyKey: input.idempotencyKey,
        customerId,
        customerNameSnapshot: snapshot.name,
        customerPhoneSnapshot: snapshot.phoneNumber,
        subtotal: totals.subtotal.toFixed(2),
        discount: totals.discount.toFixed(2),
        grandTotal: totals.grandTotal.toFixed(2),
        createdById: actorId,
        items: { create: input.items.map((item, index) => ({ description: item.description, quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: totals.lineTotals[index].toFixed(2), sortOrder: index })) },
        payments: initialPayment && input.initialPayment ? { create: { amount: initialPayment.toFixed(2), method: input.initialPayment.method, reference: input.initialPayment.reference || null, recordedById: actorId } } : undefined,
      },
      include: invoiceInclude,
    });

    await tx.auditLog.create({
      data: {
        userId: actorId, action: "INVOICE_FINALIZED", entityType: "Invoice", entityId: invoice.id,
        metadata: { invoiceNumber, subtotal: totals.subtotal.toFixed(2), discount: totals.discount.toFixed(2), grandTotal: totals.grandTotal.toFixed(2), initialPayment: initialPayment?.toFixed(2) ?? "0.00" },
      },
    });
    if (initialPayment && invoice.payments[0]) {
      await tx.auditLog.create({ data: { userId: actorId, action: "PAYMENT_RECORDED", entityType: "Payment", entityId: invoice.payments[0].id, metadata: { invoiceId: invoice.id, invoiceNumber, amount: initialPayment.toFixed(2), method: invoice.payments[0].method } } });
    }
    return summarizeInvoice(invoice);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function addInvoicePayment(input: BalancePaymentInput, actorId: string) {
  return db.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id: input.invoiceId }, include: { payments: { include: { reversal: true } } } });
    if (!invoice) throw new InvoiceOperationError("NOT_FOUND", "Invoice was not found");
    if (invoice.status === "VOID") throw new InvoiceOperationError("INVOICE_VOID", "Payments cannot be added to a void invoice");
    const outstanding = calculateOutstanding(invoice.grandTotal.toString(), invoice.payments.map((payment) => ({ amount: payment.amount.toString(), reversed: Boolean(payment.reversal) })));
    const amount = validatePayment(input.amount, outstanding);
    const payment = await tx.payment.create({ data: { invoiceId: invoice.id, amount: amount.toFixed(2), method: input.method, reference: input.reference || null, recordedById: actorId } });
    await tx.auditLog.create({ data: { userId: actorId, action: "PAYMENT_RECORDED", entityType: "Payment", entityId: payment.id, metadata: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, amount: amount.toFixed(2), method: input.method } } });
    return { paymentId: payment.id, paid: formatMoney(calculateValidPaidTotal([...invoice.payments.map((item) => ({ amount: item.amount.toString(), reversed: Boolean(item.reversal) })), { amount }])), outstanding: formatMoney(outstanding.sub(amount)) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function voidInvoiceRecord(invoiceId: string, reason: string, actorId: string) {
  return db.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new InvoiceOperationError("NOT_FOUND", "Invoice was not found");
    const cleanReason = assertInvoiceCanBeVoided(invoice.status, reason);
    const voided = await tx.invoice.update({ where: { id: invoice.id }, data: { status: "VOID", voidedAt: new Date(), voidedById: actorId, voidReason: cleanReason } });
    await tx.auditLog.create({ data: { userId: actorId, action: "INVOICE_VOIDED", entityType: "Invoice", entityId: invoice.id, metadata: { invoiceNumber: invoice.invoiceNumber, reason: cleanReason, grandTotal: invoice.grandTotal.toString() } } });
    return voided;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function recordReceiptReprint(invoiceId: string, actorId: string) {
  return db.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id: invoiceId }, select: { id: true, invoiceNumber: true } });
    if (!invoice) throw new InvoiceOperationError("NOT_FOUND", "Invoice was not found");
    const audit = await tx.auditLog.create({ data: buildReceiptReprintAudit(invoice, actorId) });
    return { ...invoice, auditId: audit.id };
  });
}

export async function getInvoiceById(id: string) {
  return db.invoice.findUnique({ where: { id }, include: invoiceInclude });
}

export function summarizeInvoice(invoice: Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>) {
  const payments = invoice.payments.map((payment) => ({ amount: payment.amount.toString(), reversed: Boolean(payment.reversal) }));
  const paid = calculateValidPaidTotal(payments);
  const outstanding = calculateOutstanding(invoice.grandTotal.toString(), payments);
  return {
    id: invoice.id, invoiceNumber: invoice.invoiceNumber,
    customerName: invoice.customerNameSnapshot ?? "Walk-in customer",
    grandTotal: formatMoney(invoice.grandTotal.toString()), paid: formatMoney(paid), outstanding: formatMoney(outstanding), status: invoice.status,
  };
}

export { invoiceInclude };
