import "server-only";
import { Prisma, type OrderStatus, type Role } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { assertOrderTransition } from "@/domain/phase4";
import { createInvoiceInTransaction } from "@/server/invoice-service";
import { Phase4OperationError } from "@/server/quotation-service";
import type { OrderEditInput } from "@/lib/validations/phase4";
import { assertCurrentOperationalRecord } from "@/lib/operational-period";

export async function changeOrderStatus(orderId: string, next: OrderStatus, note: string | null, actor: { id: string; role: Role }) {
  return db.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id: orderId } });
    if (!current) throw new Phase4OperationError("NOT_FOUND", "Order was not found");
    await assertCurrentOperationalRecord(tx, current.createdAt);
    if ((actor.role === "DESIGNER" || actor.role === "PRODUCTION") && current.assignedStaffId && current.assignedStaffId !== actor.id) throw new Phase4OperationError("NOT_ASSIGNED", "This order is assigned to another staff member");
    assertOrderTransition(current.status, next, actor.role);
    const updated = await tx.order.update({ where: { id: orderId }, data: { status: next } });
    await tx.orderStatusHistory.create({ data: { orderId, previousStatus: current.status, newStatus: next, note, changedById: actor.id } });
    await tx.auditLog.create({ data: { userId: actor.id, action: next === "CANCELLED" ? "ORDER_CANCELLED" : "ORDER_STATUS_CHANGED", entityType: "Order", entityId: orderId, metadata: { orderNumber: current.orderNumber, from: current.status, to: next, note } } });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function assignOrder(orderId: string, assignedStaffId: string | null, actorId: string) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Phase4OperationError("NOT_FOUND", "Order was not found");
    await assertCurrentOperationalRecord(tx, order.createdAt);
    if (order.status === "DELIVERED" || order.status === "CANCELLED") throw new Phase4OperationError("TERMINAL_ORDER", "A terminal order cannot be reassigned");
    if (assignedStaffId && !await tx.user.findFirst({ where: { id: assignedStaffId, status: "ACTIVE" } })) throw new Phase4OperationError("INVALID_STAFF", "Select an active staff member");
    const updated = await tx.order.update({ where: { id: orderId }, data: { assignedStaffId } });
    await tx.auditLog.create({ data: { userId: actorId, action: "ORDER_ASSIGNMENT_CHANGED", entityType: "Order", entityId: orderId, metadata: { orderNumber: order.orderNumber, previousStaffId: order.assignedStaffId, assignedStaffId } } });
    return updated;
  });
}

export async function editOrder(input: OrderEditInput, actorId: string) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: input.orderId }, include: { items: true } });
    if (!order) throw new Phase4OperationError("NOT_FOUND", "Order was not found");
    await assertCurrentOperationalRecord(tx, order.createdAt);
    if (order.status === "DELIVERED" || order.status === "CANCELLED") throw new Phase4OperationError("TERMINAL_ORDER", "A terminal order cannot be edited");
    const ids = new Set(order.items.map((item) => item.id));
    if (input.items.some((item) => !ids.has(item.id))) throw new Phase4OperationError("INVALID_ITEM", "Order item does not belong to this order");
    await tx.order.update({ where: { id: order.id }, data: { jobName: input.jobName, dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : null, notes: input.notes } });
    for (const item of input.items) await tx.orderItem.update({ where: { id: item.id }, data: { size: item.size, material: item.material, finishing: item.finishing, designInstructions: item.designInstructions, additionalNotes: item.additionalNotes } });
    await tx.auditLog.create({ data: { userId: actorId, action: "ORDER_JOB_UPDATED", entityType: "Order", entityId: order.id, metadata: { orderNumber: order.orderNumber, itemCount: input.items.length } } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function createInvoiceFromOrder(orderId: string, initialPayment: string | null, actorId: string) {
  try {
    return await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: { orderBy: { sortOrder: "asc" } }, quotation: true, invoice: true } });
      if (!order) throw new Phase4OperationError("NOT_FOUND", "Order was not found");
      await assertCurrentOperationalRecord(tx, order.createdAt);
      if (order.invoice) throw new Phase4OperationError("INVOICE_EXISTS", "This order already has an invoice");
      if (order.status === "CANCELLED") throw new Phase4OperationError("CANCELLED_ORDER", "A cancelled order cannot be invoiced");
      const invoice = await createInvoiceInTransaction(tx, { idempotencyKey: `order:${order.id}`, customerName: order.customerNameSnapshot, customerPhone: order.customerPhoneSnapshot, discount: order.quotation?.discount.toFixed(2) ?? "0.00", items: order.items.map((item) => ({ description: item.description, quantity: item.quantity.toString(), unitPrice: item.unitPrice.toFixed(2) })), initialPayment: initialPayment ? { amount: initialPayment, method: "CASH", reference: `Advance for ${order.orderNumber}` } : null }, actorId, order.id);
      await tx.auditLog.create({ data: { userId: actorId, action: "INVOICE_CREATED_FROM_ORDER", entityType: "Order", entityId: order.id, metadata: { orderNumber: order.orderNumber, invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber } } });
      return invoice;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new Phase4OperationError("INVOICE_EXISTS", "This order already has an invoice");
    throw error;
  }
}
