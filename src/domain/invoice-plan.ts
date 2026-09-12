import { calculateInvoiceTotals, resolvePayment } from "@/domain/financial";
import { customerSnapshot } from "@/domain/invoice-rules";
import type { InvoiceInput } from "@/lib/validations/invoice";

export function prepareInvoicePlan(input: InvoiceInput) {
  const totals = calculateInvoiceTotals(input.items, input.discount);
  const snapshot = customerSnapshot(input.customerName, input.customerPhone);
  const initialPayment = input.initialPayment
    ? resolvePayment(input.initialPayment.amount, totals.grandTotal, input.initialPayment.method)
    : null;
  return { totals, snapshot, initialPayment };
}
