import "dotenv/config";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
const project = "fbnwigknxlapnemmmugd";
if (process.env.DATABASE_ENVIRONMENT !== "development") throw new Error("Development environment required");
for (const key of ["DATABASE_URL", "DIRECT_URL"] as const) {
  const url = new URL(process.env[key] ?? "");
  if (url.username !== `postgres.${project}` || url.hostname !== "aws-0-ap-northeast-2.pooler.supabase.com" || url.port !== (key === "DATABASE_URL" ? "6543" : "5432")) throw new Error("Unapproved integration database");
}
execFileSync("git", ["check-ignore", "-q", ".env"]);

const { db } = await import("../../src/lib/db");
const { createInvoice, addInvoicePayment, voidInvoiceRecord } = await import("../../src/server/invoice-service");
const { createExpense, voidExpense: voidExpenseRecord } = await import("../../src/server/expense-service");
const { getDashboardData, getReportData, resetDashboardTodaySales } = await import("../../src/server/report-service");
const { hasPermission } = await import("../../src/lib/permissions");
let actorId: string;
const run = randomUUID();
let activeInvoiceId: string;
let voidInvoiceId: string;
let validPaymentId: string;
let reversedPaymentId: string;
let activeExpenseId: string;
let voidExpenseId: string;
let orderId: string;
const orderIds: string[] = [];

beforeAll(async () => {
  const admin = await db.user.findUniqueOrThrow({ where: { email: process.env.SEED_ADMIN_EMAIL!.trim().toLowerCase() } });
  actorId = admin.id;
  const invoice = (amount: string) => ({ idempotencyKey: randomUUID(), customerName: `Phase 6 ${run}`, customerPhone: `077${run.replaceAll("-", "").slice(0, 7)}`, discount: "0.00", items: [{ description: `Report test ${run}`, quantity: "1", unitPrice: amount }], initialPayment: null });
  const active = await createInvoice(invoice("1200.00"), actorId); activeInvoiceId = active.id;
  validPaymentId = (await addInvoicePayment({ invoiceId: active.id, amount: "400.00", method: "BANK_TRANSFER", reference: `valid-${run}` }, actorId)).paymentId;
  reversedPaymentId = (await addInvoicePayment({ invoiceId: active.id, amount: "100.00", method: "QR", reference: `reversed-${run}` }, actorId)).paymentId;
  await db.paymentReversal.create({ data: { paymentId: reversedPaymentId, reason: "Phase 6 reporting reversal", reversedById: actorId } });
  const voided = await createInvoice(invoice("900.00"), actorId); voidInvoiceId = voided.id; await voidInvoiceRecord(voided.id, "Phase 6 void exclusion", actorId);
  activeExpenseId = (await createExpense({ idempotencyKey: randomUUID(), category: "MATERIALS", description: `Phase 6 active ${run}`, amount: "250.00", paymentMethod: "BANK_TRANSFER" }, actorId)).id;
  const voidedExpense = await createExpense({ idempotencyKey: randomUUID(), category: "OTHER", description: `Phase 6 void ${run}`, amount: "75.00", paymentMethod: "CARD" }, actorId); voidExpenseId = voidedExpense.id; await voidExpenseRecord(voidedExpense.id, "Phase 6 void exclusion", actorId);
  const order = await db.order.create({ data: { orderNumber: `P6-OVERDUE-${run}`, customerNameSnapshot: `Phase 6 ${run}`, customerPhoneSnapshot: `076${run.replaceAll("-", "").slice(0, 7)}`, jobName: "Overdue report probe", status: "PRINTING", dueDate: new Date("2020-01-01T00:00:00Z"), createdById: actorId } }); orderId = order.id; orderIds.push(order.id);
  for (const status of ["PENDING", "READY", "DELIVERED", "CANCELLED"] as const) { const row = await db.order.create({ data: { orderNumber: `P6-${status}-${run}`, customerNameSnapshot: `Phase 6 ${run}`, customerPhoneSnapshot: `075${run.replaceAll("-", "").slice(0, 7)}`, jobName: `${status} report probe`, status, createdById: actorId } }); orderIds.push(row.id); }
});

afterAll(async () => { await db.$disconnect(); });

test("reports use source rows and exclude void or reversed financial activity", async () => {
  const report = await getReportData({ preset: "today" });
  expect(report.invoices.some((row) => row.id === activeInvoiceId && row.paid === "400.00" && row.outstanding === "800.00")).toBe(true);
  expect(report.invoices.some((row) => row.id === voidInvoiceId)).toBe(false);
  expect(report.payments.some((row) => row.id === validPaymentId)).toBe(true);
  expect(report.payments.some((row) => row.id === reversedPaymentId)).toBe(false);
  expect(report.expenses.some((row) => row.id === activeExpenseId && row.status === "FINALIZED")).toBe(true);
  expect(report.expenses.some((row) => row.id === voidExpenseId && row.status === "VOID")).toBe(true);
  expect(report.orders.some((row) => row.id === orderId && row.group === "OVERDUE")).toBe(true);
  expect(new Set(report.orders.filter((row) => orderIds.includes(row.id)).map((row) => row.group))).toEqual(new Set(["OVERDUE", "PENDING", "READY", "DELIVERED", "CANCELLED"]));
  expect(report.customers.some((row) => row.name.startsWith("Phase 6") && Number(row.sales) >= 1200 && Number(row.paid) >= 400)).toBe(true);
  expect(report.staff.some((row) => row.id === actorId && row.role === "ADMIN" && row.salesCount > 0 && row.paymentCount > 0 && row.expenseCount > 0)).toBe(true);
});

test("dashboard totals and role scopes are server-derived", async () => {
  const admin = await getDashboardData({ id: actorId, role: "ADMIN" });
  expect(Number(admin.todaySales)).toBeGreaterThanOrEqual(1200);
  expect(Number(admin.todayExpenses)).toBeGreaterThanOrEqual(250);
  expect(admin.canViewExpenses).toBe(true);
  const production = await getDashboardData({ id: actorId, role: "PRODUCTION" });
  expect(production.canViewFinancials).toBe(false);
  expect(production.canViewExpenses).toBe(false);
  expect(production.orders.every((row) => ["APPROVED", "PRINTING", "FINISHING", "READY"].includes(row.status) || row.assignedStaff?.name)).toBe(true);
});

test("only authorized management roles can access reports", () => {
  expect(hasPermission("ADMIN", "reports:view")).toBe(true);
  expect(hasPermission("MANAGER", "reports:view")).toBe(true);
  expect(hasPermission("CASHIER", "reports:view")).toBe(false);
  expect(hasPermission("DESIGNER", "reports:view")).toBe(false);
  expect(hasPermission("PRODUCTION", "reports:view")).toBe(false);
});

test("only management can reset the dashboard sales display", () => {
  expect(hasPermission("ADMIN", "dashboard:reset-sales")).toBe(true);
  expect(hasPermission("MANAGER", "dashboard:reset-sales")).toBe(true);
  expect(hasPermission("CASHIER", "dashboard:reset-sales")).toBe(false);
});

test("cash report retains stored closed-session reconciliation and activity detail", async () => {
  const report = await getReportData({ preset: "today" });
  const closed = report.cashSessions.find((row) => row.status === "CLOSED");
  expect(closed).toBeDefined();
  const persisted = await db.cashSession.findUniqueOrThrow({ where: { id: closed!.id } });
  expect(closed!.expectedCash?.toFixed(2)).toBe(persisted.expectedCash?.toFixed(2));
  expect(closed!.actualCash?.toFixed(2)).toBe(persisted.actualCash?.toFixed(2));
  expect(closed!.difference?.toFixed(2)).toBe(persisted.difference?.toFixed(2));
  expect(Number(closed!.cashReceipts)).toBeGreaterThanOrEqual(0);
});

test("dashboard reset changes only the current-day display and preserves reports", async () => {
  const before = await createInvoice({ idempotencyKey: randomUUID(), customerName: "", customerPhone: "", discount: "0.00", items: [{ description: `Before dashboard reset ${run}`, quantity: "1", unitPrice: "1100.00" }], initialPayment: null }, actorId);
  const reportBefore = await getReportData({ view: "sales", preset: "today" });
  expect(reportBefore.invoices.some((row) => row.id === before.id)).toBe(true);
  await resetDashboardTodaySales(actorId);
  const resetView = await getDashboardData({ id: actorId, role: "ADMIN" });
  expect(resetView.todaySales).toBe("0.00");
  const after = await createInvoice({ idempotencyKey: randomUUID(), customerName: "", customerPhone: "", discount: "0.00", items: [{ description: `After dashboard reset ${run}`, quantity: "1", unitPrice: "2000.00" }], initialPayment: null }, actorId);
  const dashboard = await getDashboardData({ id: actorId, role: "ADMIN" });
  expect(dashboard.todaySales).toBe("2000.00");
  const reportAfter = await getReportData({ view: "sales", preset: "today" });
  expect(reportAfter.invoices.some((row) => row.id === before.id)).toBe(true);
  expect(reportAfter.invoices.some((row) => row.id === after.id)).toBe(true);
});
