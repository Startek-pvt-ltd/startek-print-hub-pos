import Decimal from "decimal.js";
import { money, type PaymentAmount } from "@/domain/financial";

export type DrawerPayment = PaymentAmount & {
  method: "CASH" | "CARD" | "BANK_TRANSFER" | "QR";
};
export type DrawerExpense = {
  amount: Decimal.Value;
  paymentMethod: "CASH" | "CARD" | "BANK_TRANSFER" | "QR";
  voided?: boolean;
};
export type DrawerMovement = {
  amount: Decimal.Value;
  type: "CASH_DEPOSIT" | "CASH_WITHDRAWAL";
};

export class CashRegisterRuleError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "CashRegisterRuleError";
  }
}

export function positiveMoney(value: Decimal.Value, label: string) {
  const amount = money(value);
  if (amount.lte(0)) {
    throw new CashRegisterRuleError("INVALID_AMOUNT", `${label} must be greater than zero`);
  }
  return amount;
}

export function nonNegativeMoney(value: Decimal.Value, label: string) {
  const amount = money(value);
  if (amount.lt(0)) {
    throw new CashRegisterRuleError("INVALID_AMOUNT", `${label} cannot be negative`);
  }
  return amount;
}

export function calculateCashSummary(input: {
  openingCash: Decimal.Value;
  payments: readonly DrawerPayment[];
  expenses: readonly DrawerExpense[];
  movements: readonly DrawerMovement[];
}) {
  const openingCash = nonNegativeMoney(input.openingCash, "Opening cash");
  const cashReceipts = input.payments.reduce(
    (sum, item) => item.method === "CASH" && !item.reversed ? sum.add(money(item.amount)) : sum,
    new Decimal(0),
  );
  const cashExpenses = input.expenses.reduce(
    (sum, item) => item.paymentMethod === "CASH" && !item.voided ? sum.add(money(item.amount)) : sum,
    new Decimal(0),
  );
  const cashDeposits = input.movements.reduce(
    (sum, item) => item.type === "CASH_DEPOSIT" ? sum.add(money(item.amount)) : sum,
    new Decimal(0),
  );
  const cashWithdrawals = input.movements.reduce(
    (sum, item) => item.type === "CASH_WITHDRAWAL" ? sum.add(money(item.amount)) : sum,
    new Decimal(0),
  );
  const expectedCash = openingCash
    .add(cashReceipts)
    .add(cashDeposits)
    .sub(cashExpenses)
    .sub(cashWithdrawals);

  return { openingCash, cashReceipts, cashExpenses, cashDeposits, cashWithdrawals, expectedCash };
}

export function calculateDifference(actualCash: Decimal.Value, expectedCash: Decimal.Value) {
  return nonNegativeMoney(actualCash, "Actual cash").sub(money(expectedCash));
}
