import type { CashMovementType, ExpenseCategory, PaymentMethod } from "@/generated/prisma/client";

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  MATERIALS: "Materials",
  ELECTRICITY: "Electricity",
  SALARY: "Salary",
  TRANSPORT: "Transport",
  MAINTENANCE: "Maintenance",
  RENT: "Rent",
  PETTY_CASH: "Petty Cash",
  OTHER: "Other",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
  QR: "QR",
};

export const cashMovementLabels: Record<CashMovementType, string> = {
  CASH_DEPOSIT: "Cash Deposit",
  CASH_WITHDRAWAL: "Cash Withdrawal",
};

export function formatShopDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Colombo",
  }).format(value);
}
