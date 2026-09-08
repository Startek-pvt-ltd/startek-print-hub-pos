export class InvoiceRuleError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "InvoiceRuleError";
  }
}

export function customerSnapshot(name: string, phoneNumber: string) {
  const cleanName = name.trim();
  const cleanPhone = phoneNumber.trim();
  if (!cleanName && !cleanPhone) return { name: null, phoneNumber: null };
  if (!cleanName || !cleanPhone) throw new InvoiceRuleError("INCOMPLETE_CUSTOMER", "Enter both customer name and phone, or leave both blank");
  return { name: cleanName, phoneNumber: cleanPhone };
}

export function assertInvoiceCanBeVoided(status: "FINALIZED" | "VOID", reason: string) {
  if (status === "VOID") throw new InvoiceRuleError("ALREADY_VOID", "Invoice is already void");
  if (reason.trim().length < 3) throw new InvoiceRuleError("VOID_REASON_REQUIRED", "Enter a void reason");
  return reason.trim();
}

export function buildReceiptReprintAudit(invoice: { id: string; invoiceNumber: string }, userId: string) {
  return { userId, action: "RECEIPT_REPRINTED", entityType: "Invoice", entityId: invoice.id, metadata: { invoiceNumber: invoice.invoiceNumber, physicalPrintConfirmed: false } } as const;
}
