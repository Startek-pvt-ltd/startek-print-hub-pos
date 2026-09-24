import "dotenv/config";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { Client } from "pg";

vi.mock("server-only", () => ({}));
const project = "fbnwigknxlapnemmmugd";
if (process.env.DATABASE_ENVIRONMENT !== "development") throw new Error("Development environment required");
for (const key of ["DATABASE_URL", "DIRECT_URL"] as const) {
  const url = new URL(process.env[key] ?? "");
  if (url.username !== `postgres.${project}` || url.hostname !== "aws-0-ap-northeast-2.pooler.supabase.com" || url.port !== (key === "DATABASE_URL" ? "6543" : "5432")) throw new Error("Unapproved integration database");
}
execFileSync("git", ["check-ignore", "-q", ".env"]);

const { db } = await import("../../src/lib/db");
const { createInvoice, addInvoicePayment, getInvoiceById } = await import("../../src/server/invoice-service");
const { createExpense, voidExpense } = await import("../../src/server/expense-service");
const { addCashMovement, closeCashSession, getCashSessionSummary, openCashSession } = await import("../../src/server/cash-register-service");
const { hasPermission } = await import("../../src/lib/permissions");
const directUrl = new URL(process.env.DIRECT_URL!); directUrl.searchParams.delete("sslmode");
const sql = new Client({ connectionString: directUrl.toString(), ssl: process.env.SUPABASE_CA_CERT ? { ca: process.env.SUPABASE_CA_CERT, rejectUnauthorized: true } : undefined });
let actorId: string;
let sessionId: string;
let cashExpenseId: string;
let expectedAtClose = "0.00";
const run = randomUUID();
const invoiceInput = (amount: string, method: "CASH" | "CARD" | "BANK_TRANSFER" | "QR" | null = null) => ({
  idempotencyKey: randomUUID(), customerName: "", customerPhone: "", discount: "0.00",
  items: [{ description: `Phase 5 acceptance ${run}`, quantity: "1", unitPrice: amount }],
  initialPayment: method ? { amount, method, reference: run } : null,
});

beforeAll(async () => {
  await sql.connect();
  const admin = await db.user.findUniqueOrThrow({ where: { email: process.env.SEED_ADMIN_EMAIL!.trim().toLowerCase() } });
  actorId = admin.id;
  const existing = await db.cashSession.findUnique({ where: { openGuard: "PRIMARY" } });
  if (existing) {
    const summary = await getCashSessionSummary(existing.id);
    await closeCashSession({ cashSessionId: existing.id, idempotencyKey: randomUUID(), actualCash: summary.expectedCash.isNegative() ? "0.00" : summary.expectedCash.toFixed(2), closingNote: "Closed before Phase 5 integration run" }, actorId);
  }
});
afterAll(async () => { await sql.end(); await db.$disconnect(); });

test("cash requires an open register while non-cash remains available", async () => {
  await expect(createInvoice(invoiceInput("100.00", "CASH"), actorId)).rejects.toThrow("Open the cash register");
  const bank = await createInvoice(invoiceInput("5000.00", "BANK_TRANSFER"), actorId);
  expect(bank.outstanding).toBe("0.00");
});

test("concurrent opens enforce one active drawer and opening cash is authoritative", async () => {
  const attempts = await Promise.allSettled([
    openCashSession({ idempotencyKey: randomUUID(), openingCash: "5000.00" }, actorId),
    openCashSession({ idempotencyKey: randomUUID(), openingCash: "5000.00" }, actorId),
  ]);
  expect(attempts.filter((item) => item.status === "fulfilled")).toHaveLength(1);
  const session = await db.cashSession.findUniqueOrThrow({ where: { openGuard: "PRIMARY" } });
  sessionId = session.id;
  expect(session.openingCash.toFixed(2)).toBe("5000.00");
  expect((await getCashSessionSummary(session.id)).expectedCash.toFixed(2)).toBe("5000.00");
});

test("payments, expenses, movements, numbering, audits, and idempotency follow drawer rules", async () => {
  const cashInvoice = await createInvoice(invoiceInput("10000.00", "CASH"), actorId);
  const nonCashInvoice = await createInvoice(invoiceInput("5000.00"), actorId);
  await addInvoicePayment({ invoiceId: nonCashInvoice.id, amount: "5000.00", method: "BANK_TRANSFER", reference: run }, actorId);
  const expenseInput = { idempotencyKey: randomUUID(), category: "MATERIALS" as const, description: "Banner material purchase", amount: "2000.00", paymentMethod: "CASH" as const };
  const cashExpense = await createExpense(expenseInput, actorId); cashExpenseId = cashExpense.id;
  expect((await createExpense(expenseInput, actorId)).id).toBe(cashExpense.id);
  expect(cashExpense.expenseNumber).toMatch(/^SPH-EXP-\d{6}$/);
  const nonCashExpense = await createExpense({ idempotencyKey: randomUUID(), category: "ELECTRICITY", description: "Electricity payment", amount: "1000.00", paymentMethod: "BANK_TRANSFER" }, actorId);
  expect(nonCashExpense.cashSessionId).toBeNull();
  await addCashMovement({ idempotencyKey: randomUUID(), type: "CASH_DEPOSIT", amount: "1000.00", reason: "Owner change money" }, actorId);
  await addCashMovement({ idempotencyKey: randomUUID(), type: "CASH_WITHDRAWAL", amount: "500.00", reason: "Excess drawer cash" }, actorId);
  const summary = await getCashSessionSummary(sessionId);
  expect(summary.cashReceipts.toFixed(2)).toBe("10000.00");
  expect(summary.cashExpenses.toFixed(2)).toBe("2000.00");
  expect(summary.expectedCash.toFixed(2)).toBe("13500.00");
  expect((await getInvoiceById(cashInvoice.id))!.payments[0].cashSessionId).toBe(sessionId);
  expect(await db.auditLog.count({ where: { entityId: { in: [cashExpense.id, nonCashExpense.id] }, action: "EXPENSE_CREATED" } })).toBe(2);
});

test("void and reversal adjust only an open session and retain source rows", async () => {
  const temporary = await createExpense({ idempotencyKey: randomUUID(), category: "OTHER", description: "Correction probe", amount: "25.00", paymentMethod: "CASH" }, actorId);
  await voidExpense(temporary.id, "Incorrect duplicate entry", actorId);
  expect((await db.expense.findUniqueOrThrow({ where: { id: temporary.id } })).status).toBe("VOID");
  const reversalInvoice = await createInvoice(invoiceInput("100.00", "CASH"), actorId);
  const payment = (await getInvoiceById(reversalInvoice.id))!.payments[0];
  await db.paymentReversal.create({ data: { paymentId: payment.id, reason: "Open-session reversal acceptance", reversedById: actorId } });
  const summary = await getCashSessionSummary(sessionId);
  expect(summary.expectedCash.toFixed(2)).toBe("13500.00");
  expect(await db.payment.count({ where: { id: payment.id } })).toBe(1);
});

test("concurrent close stores expected, actual, difference and becomes terminal", async () => {
  expectedAtClose = (await getCashSessionSummary(sessionId)).expectedCash.toFixed(2);
  expect(expectedAtClose).toBe("13500.00");
  const attempts = await Promise.allSettled([
    closeCashSession({ cashSessionId: sessionId, idempotencyKey: randomUUID(), actualCash: "13400.00", closingNote: "Phase 5 acceptance close" }, actorId),
    closeCashSession({ cashSessionId: sessionId, idempotencyKey: randomUUID(), actualCash: "13400.00", closingNote: null }, actorId),
  ]);
  expect(attempts.filter((item) => item.status === "fulfilled")).toHaveLength(1);
  const closed = await db.cashSession.findUniqueOrThrow({ where: { id: sessionId } });
  expect(closed.status).toBe("CLOSED");
  expect(closed.expectedCash?.toFixed(2)).toBe("13500.00");
  expect(closed.actualCash?.toFixed(2)).toBe("13400.00");
  expect(closed.difference?.toFixed(2)).toBe("-100.00");
  await expect(voidExpense(cashExpenseId, "Late correction", actorId)).rejects.toThrow("closed session");
  const unpaid = await createInvoice(invoiceInput("1.00"), actorId);
  await expect(addInvoicePayment({ invoiceId: unpaid.id, amount: "1.00", method: "CASH", reference: run }, actorId)).rejects.toThrow("Open the cash register");
});

test("database constraints preserve closed history and a new session starts clean", async () => {
  await expect(db.cashSession.update({ where: { id: sessionId }, data: { openingCash: "1.00" } })).rejects.toThrow();
  await expect(db.cashSession.delete({ where: { id: sessionId } })).rejects.toThrow();
  await expect(db.expense.delete({ where: { id: cashExpenseId } })).rejects.toThrow();
  const unreversed = await db.payment.findFirstOrThrow({ where: { cashSessionId: sessionId, reversal: null } });
  await expect(db.paymentReversal.create({ data: { paymentId: unreversed.id, reason: "Late reversal probe", reversedById: actorId } })).rejects.toThrow();
  await sql.query("BEGIN");
  try {
    await expect(sql.query('UPDATE expenses SET amount=0 WHERE id=$1', [cashExpenseId])).rejects.toMatchObject({ code: "23514" });
  } finally { await sql.query("ROLLBACK"); }
  const next = await openCashSession({ idempotencyKey: randomUUID(), openingCash: "250.00" }, actorId);
  expect((await getCashSessionSummary(next.id)).expectedCash.toFixed(2)).toBe("250.00");
  const previous = await db.cashSession.findUniqueOrThrow({ where: { id: sessionId } });
  expect(previous.expectedCash?.toFixed(2)).toBe(expectedAtClose);
});

test("role permission matrix keeps financial access server-checkable", () => {
  expect(hasPermission("ADMIN", "expenses:manage")).toBe(true);
  expect(hasPermission("MANAGER", "cash-register:adjust")).toBe(true);
  expect(hasPermission("CASHIER", "cash-register:operate")).toBe(true);
  expect(hasPermission("CASHIER", "expenses:manage")).toBe(false);
  expect(hasPermission("DESIGNER", "cash-register:operate")).toBe(false);
  expect(hasPermission("PRODUCTION", "expenses:manage")).toBe(false);
});
