"use server";

import { revalidatePath } from "next/cache";
import { FinancialRuleError } from "@/domain/financial";
import { Phase4RuleError } from "@/domain/phase4";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { assignmentSchema, conversionSchema, invoiceFromOrderSchema, orderEditSchema, orderStatusSchema, quotationEditSchema, quotationInputSchema, quotationStatusSchema } from "@/lib/validations/phase4";
import { Phase4OperationError, changeQuotationStatus, convertQuotation, createQuotation, editQuotation } from "@/server/quotation-service";
import { assignOrder, changeOrderStatus, createInvoiceFromOrder, editOrder } from "@/server/order-service";
import { InvoiceOperationError } from "@/server/invoice-service";

export type Phase4State<T = never> = { error?: string; data?: T };
function safe(error: unknown) { return error instanceof FinancialRuleError || error instanceof Phase4RuleError || error instanceof Phase4OperationError || error instanceof InvoiceOperationError ? error.message : "The operation could not be completed. Please try again."; }

export async function saveQuotation(input: unknown): Promise<Phase4State<{ id: string }>> {
  const user = await requirePermission("quotations:manage"); const parsed = quotationInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the quotation details" };
  try { const result = await createQuotation(parsed.data, user.id); revalidatePath("/quotations"); return { data: { id: result.id } }; } catch (e) { return { error: safe(e) }; }
}
export async function updateQuotation(input: unknown): Promise<Phase4State<{ id: string }>> {
  const user = await requirePermission("quotations:manage"); const parsed = quotationEditSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the quotation details" };
  try { const result = await editQuotation(parsed.data, user.id); revalidatePath(`/quotations/${result.id}`); revalidatePath("/quotations"); return { data: { id: result.id } }; } catch (e) { return { error: safe(e) }; }
}
export async function setQuotationStatus(input: unknown): Promise<Phase4State> {
  const user = await requirePermission("quotations:manage"); const parsed = quotationStatusSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid quotation status" };
  try { await changeQuotationStatus(parsed.data.quotationId, parsed.data.status, parsed.data.note, user.id); revalidatePath(`/quotations/${parsed.data.quotationId}`); revalidatePath("/quotations"); return {}; } catch (e) { return { error: safe(e) }; }
}
export async function convertQuotationAction(input: unknown): Promise<Phase4State<{ id: string }>> {
  const user = await requirePermission("quotations:convert"); const parsed = conversionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the order details" };
  try { const result = await convertQuotation(parsed.data, user.id); revalidatePath("/quotations"); revalidatePath("/orders"); return { data: { id: result.id } }; } catch (e) { return { error: safe(e) }; }
}
export async function setOrderStatus(input: unknown): Promise<Phase4State> {
  const user = await requirePermission("orders:update-status"); const parsed = orderStatusSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid order status" };
  try { await changeOrderStatus(parsed.data.orderId, parsed.data.status, parsed.data.note, user); revalidatePath(`/orders/${parsed.data.orderId}`); revalidatePath("/orders"); return {}; } catch (e) { return { error: safe(e) }; }
}
export async function assignOrderAction(input: unknown): Promise<Phase4State> {
  const user = await requirePermission("orders:assign"); const parsed = assignmentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid assignment" };
  try { await assignOrder(parsed.data.orderId, parsed.data.assignedStaffId, user.id); revalidatePath(`/orders/${parsed.data.orderId}`); revalidatePath("/orders"); return {}; } catch (e) { return { error: safe(e) }; }
}
export async function updateOrderAction(input: unknown): Promise<Phase4State> {
  const user = await requirePermission("orders:edit"); const parsed = orderEditSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the print-job details" };
  try { await editOrder(parsed.data, user.id); revalidatePath(`/orders/${parsed.data.orderId}`); return {}; } catch (e) { return { error: safe(e) }; }
}
export async function invoiceOrderAction(input: unknown): Promise<Phase4State<{ id: string }>> {
  const user = await requirePermission("orders:create-invoice"); const parsed = invoiceFromOrderSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the advance amount" };
  try { const result = await createInvoiceFromOrder(parsed.data.orderId, parsed.data.initialPayment, user.id); revalidatePath(`/orders/${parsed.data.orderId}`); revalidatePath("/invoices"); return { data: { id: result.id } }; } catch (e) { return { error: safe(e) }; }
}
export async function lookupQuotationCustomer(phoneNumber: string) {
  await requirePermission("quotations:manage");
  if (!/^0\d{9}$/.test(phoneNumber)) return null;
  return db.customer.findUnique({ where: { phoneNumber }, select: { name: true, phoneNumber: true } });
}
