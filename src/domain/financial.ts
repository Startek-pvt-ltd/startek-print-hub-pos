import Decimal from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export class FinancialRuleError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "FinancialRuleError";
  }
}

export type ManualItemAmount = { quantity: Decimal.Value; unitPrice: Decimal.Value };
export type PaymentAmount = { amount: Decimal.Value; reversed?: boolean };

function decimal(value: Decimal.Value, label: string) {
  try {
    const result = new Decimal(value);
    if (!result.isFinite()) throw new Error();
    return result;
  } catch {
    throw new FinancialRuleError("INVALID_NUMBER", `${label} must be a valid number`);
  }
}

export function money(value: Decimal.Value) {
  return decimal(value, "Amount").toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function calculateLineTotal(quantity: Decimal.Value, unitPrice: Decimal.Value) {
  const parsedQuantity = decimal(quantity, "Quantity");
  const parsedPrice = money(unitPrice);
  if (parsedQuantity.lte(0)) throw new FinancialRuleError("INVALID_QUANTITY", "Quantity must be greater than zero");
  if (parsedQuantity.decimalPlaces() > 3) throw new FinancialRuleError("INVALID_QUANTITY_PRECISION", "Quantity supports up to three decimal places");
  if (parsedPrice.lt(0)) throw new FinancialRuleError("INVALID_PRICE", "Unit price cannot be negative");
  return parsedQuantity.mul(parsedPrice).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function calculateInvoiceTotals(items: readonly ManualItemAmount[], discountValue: Decimal.Value = 0) {
  if (items.length === 0) throw new FinancialRuleError("NO_ITEMS", "Add at least one valid billing item");
  const lineTotals = items.map((item) => calculateLineTotal(item.quantity, item.unitPrice));
  const subtotal = lineTotals.reduce((sum, line) => sum.add(line), new Decimal(0));
  const discount = money(discountValue);
  if (discount.lt(0)) throw new FinancialRuleError("INVALID_DISCOUNT", "Discount cannot be negative");
  if (discount.gt(subtotal)) throw new FinancialRuleError("DISCOUNT_TOO_LARGE", "Discount cannot exceed subtotal");
  const grandTotal = subtotal.sub(discount);
  if (grandTotal.lt(0)) throw new FinancialRuleError("NEGATIVE_TOTAL", "Invoice total cannot be negative");
  return { lineTotals, subtotal, discount, grandTotal };
}

export function calculateValidPaidTotal(payments: readonly PaymentAmount[]) {
  return payments.reduce((sum, payment) => payment.reversed ? sum : sum.add(money(payment.amount)), new Decimal(0));
}

export function calculateOutstanding(grandTotalValue: Decimal.Value, payments: readonly PaymentAmount[]) {
  const outstanding = money(grandTotalValue).sub(calculateValidPaidTotal(payments));
  if (outstanding.lt(0)) throw new FinancialRuleError("OVERPAID", "Recorded payments exceed the invoice total");
  return outstanding;
}

export function validatePayment(amountValue: Decimal.Value, outstandingValue: Decimal.Value) {
  const amount = money(amountValue);
  const outstanding = money(outstandingValue);
  if (amount.lte(0)) throw new FinancialRuleError("INVALID_PAYMENT", "Payment must be greater than zero");
  if (amount.gt(outstanding)) throw new FinancialRuleError("OVERPAYMENT", "Payment cannot exceed the outstanding balance");
  return amount;
}

export function formatMoney(value: Decimal.Value) {
  return money(value).toFixed(2);
}
