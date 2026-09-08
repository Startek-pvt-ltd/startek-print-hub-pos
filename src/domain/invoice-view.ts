import { calculateOutstanding, calculateValidPaidTotal, formatMoney, type PaymentAmount } from "@/domain/financial";

export type PaymentState = "UNPAID" | "PARTIAL" | "PAID" | "VOID";

export function derivePaymentState(status: "FINALIZED" | "VOID", grandTotal: string, payments: readonly PaymentAmount[]): PaymentState {
  if (status === "VOID") return "VOID";
  const paid = calculateValidPaidTotal(payments);
  if (paid.eq(0)) return "UNPAID";
  return calculateOutstanding(grandTotal, payments).eq(0) ? "PAID" : "PARTIAL";
}

export function invoiceAmounts(grandTotal: string, payments: readonly PaymentAmount[]) {
  const paid = calculateValidPaidTotal(payments);
  return { paid: formatMoney(paid), outstanding: formatMoney(calculateOutstanding(grandTotal, payments)) };
}
