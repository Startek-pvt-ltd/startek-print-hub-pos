import "dotenv/config";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { compare } from "bcryptjs";
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
const { createInvoice, addInvoicePayment, addInvoicePayment: addPayment } = await import("../../src/server/invoice-service");
const { createQuotation, changeQuotationStatus, convertQuotation } = await import("../../src/server/quotation-service");
const { createExpense, voidExpense } = await import("../../src/server/expense-service");
const { changeOrderStatus } = await import("../../src/server/order-service");
const { openCashSession, closeCashSession, getOpenCashSession } = await import("../../src/server/cash-register-service");
const { startFreshOperationalPeriod } = await import("../../src/server/maintenance-service");
const { createStaffAccount, resetStaffPassword, updateStaffAccount } = await import("../../src/server/staff-service");
const { getDashboardData, getReportData } = await import("../../src/server/report-service");
const { createBusinessBackup } = await import("../../src/server/backup-service");
const { authenticateStaff } = await import("../../src/lib/auth-service");

const run = randomUUID();
const phoneBase = run.replaceAll("-", "").replace(/\D/g, "").padEnd(7, "1").slice(0, 7);
const createdStaffIds: string[] = [];
let admin: { id: string; name: string; username: string; email: string; role: "ADMIN" };
let previousCutoff: Date | null;
let oldInvoiceId: string;
let oldPaymentId: string;
let oldQuotationId: string;
let oldOrderId: string;
let oldExpenseId: string;
let oldCashSessionId: string;
let cutoff: Date;

async function closeAnyRegister(note: string) {
  const open = await getOpenCashSession();
  if (!open) return;
  await closeCashSession({ cashSessionId: open.session.id, idempotencyKey: randomUUID(), actualCash: open.summary.expectedCash.toFixed(2), closingNote: note }, admin.id);
}

beforeAll(async () => {
  const seeded = await db.user.findUniqueOrThrow({ where: { email: process.env.SEED_ADMIN_EMAIL!.trim().toLowerCase() } });
  admin = { id: seeded.id, name: seeded.name, username: seeded.username, email: seeded.email, role: "ADMIN" };
  previousCutoff = (await db.setting.findUniqueOrThrow({ where: { id: "primary" }, select: { operationalDataStartAt: true } })).operationalDataStartAt;
  await db.setting.update({ where: { id: "primary" }, data: { operationalDataStartAt: null } });
  await closeAnyRegister(`Closed before v1.0.1 integration ${run}`);

  const invoice = await createInvoice({
    idempotencyKey: randomUUID(), customerName: `Archived Customer ${run}`, customerPhone: `071${phoneBase}`,
    discount: "0.00", items: [{ description: `Archived invoice ${run}`, quantity: "1", unitPrice: "940.00" }], initialPayment: null,
  }, admin.id);
  oldInvoiceId = invoice.id;
  oldPaymentId = (await addInvoicePayment({ invoiceId: invoice.id, amount: "400.00", method: "BANK_TRANSFER", reference: `archived-${run}` }, admin.id)).paymentId;

  const quotation = await createQuotation({
    idempotencyKey: randomUUID(), customerName: `Archived Quote ${run}`, customerPhone: `072${phoneBase}`,
    discount: "0.00", notes: `v1.0.1 ${run}`, validUntil: "2099-12-31", issueNow: true,
    items: [{ description: `Archived order ${run}`, quantity: "1", unitPrice: "500.00" }],
  }, admin.id);
  oldQuotationId = quotation.id;
  await changeQuotationStatus(quotation.id, "ACCEPTED", "v1.0.1 acceptance fixture", admin.id);
  oldOrderId = (await convertQuotation({ quotationId: quotation.id, jobName: "Archived print job", dueDate: null, assignedStaffId: null, notes: null }, admin.id)).id;

  oldExpenseId = (await createExpense({ idempotencyKey: randomUUID(), category: "OTHER", description: `Archived expense ${run}`, amount: "125.00", paymentMethod: "BANK_TRANSFER" }, admin.id)).id;
  const cash = await openCashSession({ idempotencyKey: randomUUID(), openingCash: "1000.00" }, admin.id);
  oldCashSessionId = cash.id;
  await closeCashSession({ cashSessionId: cash.id, idempotencyKey: randomUUID(), actualCash: "1000.00", closingNote: `Archived session ${run}` }, admin.id);
});

afterAll(async () => {
  await closeAnyRegister(`v1.0.1 integration cleanup ${run}`);
  await db.setting.update({ where: { id: "primary" }, data: { operationalDataStartAt: previousCutoff } });
  for (const id of createdStaffIds) await db.user.update({ where: { id }, data: { status: "DISABLED" } });
  await db.$disconnect();
});

test("Start Fresh is role-guarded and blocked while the register is open", async () => {
  for (const role of ["STAFF", "MANAGER", "CASHIER", "DESIGNER", "PRODUCTION"] as const) {
    await expect(startFreshOperationalPeriod({ id: admin.id, role }, { backupConfirmed: true })).rejects.toThrow("Only an administrator");
  }
  const staff = await createStaffAccount({ name: `Guard Staff ${run}`, username: `guard-${run.slice(0, 8)}`, role: "STAFF", status: "ACTIVE", password: "Temporary#123", confirmPassword: "Temporary#123" }, admin);
  createdStaffIds.push(staff.id);
  await expect(startFreshOperationalPeriod({ id: staff.id, role: "ADMIN" }, { backupConfirmed: true })).rejects.toThrow("active administrator");

  const open = await openCashSession({ idempotencyKey: randomUUID(), openingCash: "0.00" }, admin.id);
  await expect(startFreshOperationalPeriod(admin, { backupConfirmed: true })).rejects.toThrow("Close the active Cash Register session");
  await closeCashSession({ cashSessionId: open.id, idempotencyKey: randomUUID(), actualCash: "0.00", closingNote: "Start Fresh guard verified" }, admin.id);
});

test("Start Fresh retains old data but excludes it from operational queries and backups", async () => {
  const startedAt = await startFreshOperationalPeriod(admin, { backupConfirmed: true, now: new Date() });
  if (!startedAt) throw new Error("Start Fresh did not persist an operational cutoff");
  cutoff = startedAt;
  const setting = await db.setting.findUniqueOrThrow({ where: { id: "primary" } });
  expect(setting.operationalDataStartAt).toEqual(cutoff);
  const audit = await db.auditLog.findFirstOrThrow({ where: { action: "START_FRESH", userId: admin.id, createdAt: { gte: cutoff } }, orderBy: { createdAt: "desc" } });
  expect(audit.metadata).toMatchObject({ backupConfirmed: true, newOperationalDataStartAt: cutoff.toISOString() });

  expect(await db.invoice.count({ where: { id: oldInvoiceId } })).toBe(1);
  expect(await db.payment.count({ where: { id: oldPaymentId } })).toBe(1);
  expect(await db.quotation.count({ where: { id: oldQuotationId } })).toBe(1);
  expect(await db.order.count({ where: { id: oldOrderId } })).toBe(1);
  expect(await db.expense.count({ where: { id: oldExpenseId } })).toBe(1);
  expect(await db.cashSession.count({ where: { id: oldCashSessionId } })).toBe(1);
  expect(await db.auditLog.count({ where: { entityId: oldInvoiceId } })).toBeGreaterThan(0);
  await expect(addInvoicePayment({ invoiceId: oldInvoiceId, amount: "1.00", method: "CARD", reference: "archived mutation probe" }, admin.id)).rejects.toThrow("Archived pre-go-live records are read-only");
  await expect(changeOrderStatus(oldOrderId, "DESIGNING", null, admin)).rejects.toThrow("Archived pre-go-live records are read-only");
  await expect(changeQuotationStatus(oldQuotationId, "REJECTED", null, admin.id)).rejects.toThrow("Archived pre-go-live records are read-only");
  await expect(voidExpense(oldExpenseId, "archived mutation probe", admin.id)).rejects.toThrow("Archived pre-go-live records are read-only");

  const dashboard = await getDashboardData(admin);
  expect(dashboard.recentInvoices.some((row) => row.id === oldInvoiceId)).toBe(false);
  expect(dashboard.orders.some((row) => row.id === oldOrderId)).toBe(false);
  const report = await getReportData({ preset: "custom", from: "2020-01-01", to: "2099-12-31" });
  expect(report.invoices.some((row) => row.id === oldInvoiceId)).toBe(false);
  expect(report.expenses.some((row) => row.id === oldExpenseId)).toBe(false);
  expect(report.orders.some((row) => row.id === oldOrderId)).toBe(false);
  expect(report.cashSessions.some((row) => row.id === oldCashSessionId)).toBe(false);
  expect(await db.invoice.count({ where: { id: oldInvoiceId, createdAt: { gte: cutoff } } })).toBe(0);
  expect(await db.expense.count({ where: { id: oldExpenseId, expenseDate: { gte: cutoff } } })).toBe(0);

  const backup = await createBusinessBackup(admin);
  expect(backup.manifest.operationalDataStartAt).toBe(cutoff.toISOString());
  expect(backup.manifest.recordCounts.invoices).toBe(await db.invoice.count());
});

test("new-period records appear and business-number counters continue without duplicates", async () => {
  const invoice = await createInvoice({
    idempotencyKey: randomUUID(), customerName: `Current Customer ${run}`, customerPhone: `073${phoneBase}`,
    discount: "0.00", items: [{ description: `Current invoice ${run}`, quantity: "1", unitPrice: "250.00" }], initialPayment: null,
  }, admin.id);
  await addPayment({ invoiceId: invoice.id, amount: "250.00", method: "CARD", reference: `current-${run}` }, admin.id);
  const expense = await createExpense({ idempotencyKey: randomUUID(), category: "OTHER", description: `Current expense ${run}`, amount: "25.00", paymentMethod: "CARD" }, admin.id);
  const quotation = await createQuotation({ idempotencyKey: randomUUID(), customerName: `Current Quote ${run}`, customerPhone: `074${phoneBase}`, discount: "0.00", notes: null, validUntil: null, issueNow: false, items: [{ description: "Current quote", quantity: "1", unitPrice: "100.00" }] }, admin.id);

  const report = await getReportData({ preset: "custom", from: "2020-01-01", to: "2099-12-31" });
  expect(report.invoices.some((row) => row.id === invoice.id)).toBe(true);
  expect(report.expenses.some((row) => row.id === expense.id)).toBe(true);
  expect(await db.quotation.count({ where: { id: quotation.id, createdAt: { gte: cutoff } } })).toBe(1);
  const numbers = await db.invoice.findMany({ select: { invoiceNumber: true } });
  expect(new Set(numbers.map((row) => row.invoiceNumber)).size).toBe(numbers.length);
});

test("ADMIN manages final ADMIN/STAFF roles and normalized usernames with revocation and audit", async () => {
  const roles = ["STAFF", "ADMIN"] as const;
  const created = [];
  for (const role of roles) {
    const password = `Temporary#${role}123`;
    const staff = await createStaffAccount({ name: `${role} ${run}`, username: `  ${role.toLowerCase()}-${run.slice(0, 8)}  `, role, status: "ACTIVE", password, confirmPassword: password }, admin);
    createdStaffIds.push(staff.id); created.push({ ...staff, password });
  }
  const staff = created[0];
  const stored = await db.user.findUniqueOrThrow({ where: { id: staff.id } });
  expect(stored.username).toBe(`staff-${run.slice(0, 8)}`);
  expect(stored.passwordHash).not.toContain(staff.password);
  expect(await compare(staff.password, stored.passwordHash)).toBe(true);
  await expect(createStaffAccount({ name: "Duplicate", username: staff.username.toUpperCase(), role: "STAFF", status: "ACTIVE", password: "Temporary#123", confirmPassword: "Temporary#123" }, admin)).rejects.toThrow("already uses");
  for (const role of ["STAFF", "MANAGER", "CASHIER", "DESIGNER", "PRODUCTION"] as const) {
    await expect(createStaffAccount({ name: "Denied", username: `denied-${run.slice(0, 8)}`, role: "STAFF", status: "ACTIVE", password: "Temporary#123", confirmPassword: "Temporary#123" }, { id: staff.id, role })).rejects.toThrow("Only an administrator");
  }

  await db.session.create({ data: { userId: staff.id, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 60_000) } });
  await updateStaffAccount({ id: staff.id, name: staff.name, username: staff.username, role: "STAFF", status: "DISABLED" }, admin);
  expect(await db.session.count({ where: { userId: staff.id } })).toBe(0);
  const disabled = await authenticateStaff({ username: staff.username, password: staff.password }, {
    findUser: (username) => db.user.findUnique({ where: { username } }), verifyPassword: compare,
    writeAudit: (event) => db.auditLog.create({ data: { ...event, entityType: "User" } }), dummyPasswordHash: stored.passwordHash,
  });
  expect(disabled).toBeNull();

  const secondAdmin = created.find((row) => row.role === "ADMIN")!;
  const oldHash = (await db.user.findUniqueOrThrow({ where: { id: secondAdmin.id } })).passwordHash;
  await resetStaffPassword({ id: secondAdmin.id, password: "Replacement#456", confirmPassword: "Replacement#456" }, admin);
  const newHash = (await db.user.findUniqueOrThrow({ where: { id: secondAdmin.id } })).passwordHash;
  expect(await compare(secondAdmin.password, newHash)).toBe(false);
  expect(await compare("Replacement#456", newHash)).toBe(true);
  expect(newHash).not.toBe(oldHash);
  expect(await db.auditLog.count({ where: { entityId: secondAdmin.id, action: "ADMIN_PASSWORD_RESET" } })).toBeGreaterThanOrEqual(1);
  expect(await db.auditLog.count({ where: { entityId: { in: created.map((row) => row.id) }, action: { in: ["STAFF_CREATED", "STAFF_DISABLED", "ADMIN_PASSWORD_RESET"] } } })).toBeGreaterThanOrEqual(4);
});
