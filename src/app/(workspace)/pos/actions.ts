"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { FinancialRuleError } from "@/domain/financial";
import { InvoiceRuleError } from "@/domain/invoice-rules";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { balancePaymentSchema, customerLookupSchema, invoiceInputSchema, voidInvoiceSchema } from "@/lib/validations/invoice";
import { addInvoicePayment, createInvoice, InvoiceOperationError, recordReceiptReprint, voidInvoiceRecord } from "@/server/invoice-service";

export type MutationState<T = never> = { error?: string; data?: T };

function safeError(error: unknown) {
  if (error instanceof FinancialRuleError || error instanceof InvoiceRuleError || error instanceof InvoiceOperationError) return error.message;
  return "The operation could not be completed. Please try again.";
}

export async function finalizeInvoice(input: unknown): Promise<MutationState<Awaited<ReturnType<typeof createInvoice>>>> {
  const user = await requirePermission("pos:use");
  const parsed = invoiceInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the invoice details" };
  try {
    return { data: await createInvoice(parsed.data, user.id) };
  } catch (error) {
    return { error: safeError(error) };
  }
}

export async function findCustomerByPhone(input: unknown): Promise<MutationState<{ id: string; name: string; phoneNumber: string } | null>> {
  await requirePermission("pos:use");
  const parsed = customerLookupSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid phone number" };
  try {
    return { data: await db.customer.findUnique({ where: { phoneNumber: parsed.data.phoneNumber }, select: { id: true, name: true, phoneNumber: true } }) };
  } catch {
    return { error: "Customer lookup is unavailable. Please try again." };
  }
}

export async function recordBalancePayment(input: unknown): Promise<MutationState<{ paymentId: string; paid: string; outstanding: string; cashTendered: string | null; changeGiven: string | null }>> {
  const user = await requirePermission("payments:create");
  const parsed = balancePaymentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the payment details" };
  try {
    const data = await addInvoicePayment(parsed.data, user.id);
    revalidatePath(`/invoices/${parsed.data.invoiceId}`);
    revalidatePath("/invoices");
    return { data };
  } catch (error) {
    return { error: safeError(error) };
  }
}

export async function voidInvoice(input: unknown): Promise<MutationState<{ id: string }>> {
  const user = await requirePermission("invoices:void");
  const parsed = voidInvoiceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid void reason" };
  try {
    const invoice = await voidInvoiceRecord(parsed.data.invoiceId, parsed.data.reason, user.id);
    revalidatePath(`/invoices/${invoice.id}`);
    revalidatePath("/invoices");
    return { data: { id: invoice.id } };
  } catch (error) {
    return { error: safeError(error) };
  }
}

export async function reprintReceipt(invoiceId: string) {
  const user = await requirePermission("receipts:reprint");
  const parsedId = voidInvoiceSchema.shape.invoiceId.safeParse(invoiceId);
  if (!parsedId.success) redirect("/invoices");
  let result;
  try {
    result = await recordReceiptReprint(parsedId.data, user.id);
  } catch {
    redirect(`/invoices/${parsedId.data}?error=reprint`);
  }
  redirect(`/invoices/${invoiceId}/receipt?reprint=${result.auditId}`);
}
