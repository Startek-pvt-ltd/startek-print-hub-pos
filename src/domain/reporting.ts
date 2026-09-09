import Decimal from "decimal.js";
import type { ExpenseCategory, OrderStatus, PaymentMethod } from "@/generated/prisma/client";
import { money } from "@/domain/financial";

export const SHOP_TIME_ZONE = "Asia/Colombo";
export const PENDING_ORDER_STATUSES: readonly OrderStatus[] = [
  "PENDING",
  "DESIGNING",
  "WAITING_APPROVAL",
  "APPROVED",
  "PRINTING",
  "FINISHING",
];
export const TERMINAL_ORDER_STATUSES: readonly OrderStatus[] = ["DELIVERED", "CANCELLED"];
export const PAYMENT_METHODS: readonly PaymentMethod[] = ["CASH", "CARD", "BANK_TRANSFER", "QR"];
export const EXPENSE_CATEGORIES: readonly ExpenseCategory[] = [
  "MATERIALS",
  "ELECTRICITY",
  "SALARY",
  "TRANSPORT",
  "MAINTENANCE",
  "RENT",
  "PETTY_CASH",
  "OTHER",
];

export type ReportPreset = "today" | "week" | "month" | "custom";
export type BusinessDateRange = {
  from: string;
  to: string;
  start: Date;
  endExclusive: Date;
  label: string;
  preset: ReportPreset;
};

export class ReportRuleError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "ReportRuleError";
  }
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function assertDateKey(value: string) {
  if (!DATE_PATTERN.test(value)) throw new ReportRuleError("INVALID_DATE", "Enter a valid date");
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ReportRuleError("INVALID_DATE", "Enter a valid date");
  }
  return value;
}

export function shopDateKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SHOP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addCalendarDays(dateKey: string, days: number) {
  const date = new Date(`${assertDateKey(dateKey)}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function monthBounds(today: string) {
  const [year, month] = today.split("-").map(Number);
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = new Date(Date.UTC(year, month, 1));
  const to = addCalendarDays(nextMonth.toISOString().slice(0, 10), -1);
  return { from, to };
}

function weekBounds(today: string) {
  const midday = new Date(`${today}T12:00:00.000Z`);
  const weekday = midday.getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const from = addCalendarDays(today, mondayOffset);
  return { from, to: addCalendarDays(from, 6) };
}

export function businessDateRange(input: { preset?: ReportPreset; from?: string; to?: string; month?: string; now?: Date }): BusinessDateRange {
  const preset = input.preset ?? "month";
  const today = shopDateKey(input.now);
  let from: string;
  let to: string;
  if (preset === "today") ({ from, to } = { from: today, to: today });
  else if (preset === "week") ({ from, to } = weekBounds(today));
  else if (preset === "month") {
    const selected = input.month;
    if (selected && !/^\d{4}-(0[1-9]|1[0-2])$/.test(selected)) throw new ReportRuleError("INVALID_MONTH", "Choose a valid month");
    ({ from, to } = monthBounds(selected ? `${selected}-01` : today));
  }
  else {
    if (!input.from || !input.to) throw new ReportRuleError("DATE_RANGE_REQUIRED", "Choose both a start date and an end date");
    from = assertDateKey(input.from);
    to = assertDateKey(input.to);
  }
  if (from > to) throw new ReportRuleError("INVALID_RANGE", "Start date cannot be after end date");
  return {
    from,
    to,
    start: new Date(`${from}T00:00:00.000+05:30`),
    endExclusive: new Date(`${addCalendarDays(to, 1)}T00:00:00.000+05:30`),
    label: from === to ? from : `${from} to ${to}`,
    preset,
  };
}

export type ReportPayment = { amount: Decimal.Value; reversed?: boolean; method?: PaymentMethod };
export type ReportInvoice = { status: "FINALIZED" | "VOID"; grandTotal: Decimal.Value; payments: readonly ReportPayment[] };
export type ReportExpense = { status: "FINALIZED" | "VOID"; amount: Decimal.Value; category?: ExpenseCategory };

export function validPaymentTotal(payments: readonly ReportPayment[]) {
  return payments.reduce((sum, payment) => payment.reversed ? sum : sum.add(money(payment.amount)), new Decimal(0));
}

export function salesSummary(invoices: readonly ReportInvoice[]) {
  return invoices.reduce((summary, invoice) => {
    if (invoice.status === "VOID") return summary;
    const paid = validPaymentTotal(invoice.payments);
    const total = money(invoice.grandTotal);
    const outstanding = Decimal.max(total.sub(paid), 0);
    return {
      count: summary.count + 1,
      sales: summary.sales.add(total),
      paid: summary.paid.add(paid),
      outstanding: summary.outstanding.add(outstanding),
    };
  }, { count: 0, sales: new Decimal(0), paid: new Decimal(0), outstanding: new Decimal(0) });
}

export function expenseSummary(expenses: readonly ReportExpense[]) {
  const byCategory = Object.fromEntries(EXPENSE_CATEGORIES.map((category) => [category, new Decimal(0)])) as Record<ExpenseCategory, Decimal>;
  let count = 0;
  let total = new Decimal(0);
  for (const expense of expenses) {
    if (expense.status === "VOID") continue;
    const amount = money(expense.amount);
    count += 1;
    total = total.add(amount);
    if (expense.category) byCategory[expense.category] = byCategory[expense.category].add(amount);
  }
  return { count, total, byCategory };
}

export function operationalNetIncome(sales: Decimal.Value, expenses: Decimal.Value) {
  return money(sales).sub(money(expenses)).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function paymentMethodSummary(payments: readonly ReportPayment[]) {
  const groups = Object.fromEntries(PAYMENT_METHODS.map((method) => [method, { count: 0, total: new Decimal(0) }])) as Record<PaymentMethod, { count: number; total: Decimal }>;
  for (const payment of payments) {
    if (payment.reversed || !payment.method) continue;
    groups[payment.method].count += 1;
    groups[payment.method].total = groups[payment.method].total.add(money(payment.amount));
  }
  const total = PAYMENT_METHODS.reduce((sum, method) => sum.add(groups[method].total), new Decimal(0));
  return { groups, total };
}

export function isOrderOverdue(order: { dueDate: Date | null; status: OrderStatus }, today = shopDateKey()) {
  if (!order.dueDate || TERMINAL_ORDER_STATUSES.includes(order.status)) return false;
  return order.dueDate.toISOString().slice(0, 10) < today;
}

export function orderReportGroup(status: OrderStatus, overdue: boolean) {
  if (overdue) return "OVERDUE" as const;
  if (PENDING_ORDER_STATUSES.includes(status)) return "PENDING" as const;
  return status;
}

export function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function toCsv(headers: readonly string[], rows: readonly (readonly unknown[])[]) {
  return [headers.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\r\n");
}

export function formatReportMoney(value: Decimal.Value) {
  return money(value).toFixed(2);
}

export function formatShopDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: "short", timeZone: SHOP_TIME_ZONE }).format(value);
}

export function formatShopDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: SHOP_TIME_ZONE }).format(value);
}
