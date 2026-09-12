import "dotenv/config";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { Client } from "pg";

vi.mock("server-only", () => ({}));

// Explicitly invoked only; all financial fixtures remain as development history.
const project = "fbnwigknxlapnemmmugd";
if (process.env.DATABASE_ENVIRONMENT !== "development") throw new Error("Development environment required");
for (const key of ["DATABASE_URL", "DIRECT_URL"] as const) {
  const url = new URL(process.env[key] ?? "");
  if (url.username !== `postgres.${project}` || url.hostname !== "aws-0-ap-northeast-2.pooler.supabase.com" || url.port !== (key === "DATABASE_URL" ? "6543" : "5432")) throw new Error("Unapproved integration database");
}
execFileSync("git", ["check-ignore", "-q", ".env"]);

const { db } = await import("../../src/lib/db");
const { createInvoice, addInvoicePayment, getInvoiceById, voidInvoiceRecord, recordReceiptReprint } = await import("../../src/server/invoice-service");
const { openCashSession } = await import("../../src/server/cash-register-service");
const { invoiceInputSchema } = await import("../../src/lib/validations/invoice");
const sql = new Client({ connectionString: process.env.DIRECT_URL });
let actorId: string;
const run = randomUUID();
const makeInput = (amount = "100.00") => invoiceInputSchema.parse({
  idempotencyKey: randomUUID(), customerName: "", customerPhone: "",
  items: [{ description: `Development acceptance ${run}`, quantity: "1", unitPrice: amount }], discount: "0.00", initialPayment: null,
});

beforeAll(async () => {
  await sql.connect();
  const admin = await db.user.findUniqueOrThrow({ where: { email: process.env.SEED_ADMIN_EMAIL!.trim().toLowerCase() } });
  expect(admin.role).toBe("ADMIN");
  actorId = admin.id;
  if (!await db.cashSession.findUnique({ where: { openGuard: "PRIMARY" } })) {
    await openCashSession({ idempotencyKey: randomUUID(), openingCash: "0.00" }, actorId);
  }
});
afterAll(async () => { await sql.end(); await db.$disconnect(); });

test("authoritative invoice creation, idempotency, independent cash and bank ledger entries", async () => {
  const input = makeInput();
  input.items = [{ description: "Banner Printing", quantity: "1", unitPrice: "3500.00" }, { description: "Design Charge", quantity: "1", unitPrice: "1000.00" }];
  input.initialPayment = { amount: "2000.00", method: "CASH", reference: "Development acceptance" };
  const created = await createInvoice(input, actorId);
  expect(created.grandTotal).toBe("4500.00");
  expect(created.outstanding).toBe("2500.00");
  expect((await createInvoice(input, actorId)).id).toBe(created.id);
  await addInvoicePayment({ invoiceId: created.id, amount: "2500.00", method: "BANK_TRANSFER", reference: "Development acceptance" }, actorId);
  const saved = await getInvoiceById(created.id);
  expect(saved!.payments.map(p => p.amount.toFixed(2))).toEqual(["2000.00", "2500.00"]);
  expect(saved!.invoiceNumber).toBe(created.invoiceNumber);
});

test("non-cash overpayment is rejected and concurrent payments cannot exceed balance", async () => {
  const invoice = await createInvoice(makeInput(), actorId);
  await expect(addInvoicePayment({ invoiceId: invoice.id, amount: "101.00", method: "CARD", reference: "" }, actorId)).rejects.toThrow();
  expect(await db.payment.count({ where: { invoiceId: invoice.id } })).toBe(0);
  const attempts = await Promise.allSettled(["CASH", "QR"].map(method => addInvoicePayment({ invoiceId: invoice.id, amount: "75.00", method: method as "CASH" | "QR", reference: "" }, actorId)));
  expect(attempts.filter(r => r.status === "fulfilled")).toHaveLength(1);
  const saved = await getInvoiceById(invoice.id);
  expect(saved!.payments).toHaveLength(1);
  expect(saved!.payments[0].amount.toFixed(2)).toBe("75.00");
});

test("cash over-tender persists tender and change while applying only the balance", async () => {
  const invoice = await createInvoice(makeInput("940.00"), actorId);
  const result = await addInvoicePayment({ invoiceId: invoice.id, amount: "1000.00", method: "CASH", reference: "Cash change acceptance" }, actorId);
  expect(result).toMatchObject({ paid: "940.00", outstanding: "0.00", cashTendered: "1000.00", changeGiven: "60.00" });
  const payment = await db.payment.findUniqueOrThrow({ where: { id: result.paymentId } });
  expect(payment.amount.toFixed(2)).toBe("940.00");
  expect(payment.cashTendered?.toFixed(2)).toBe("1000.00");
  expect(payment.changeGiven?.toFixed(2)).toBe("60.00");

  await sql.query("BEGIN");
  try {
    await expect(sql.query('UPDATE payments SET "changeGiven"=61 WHERE id=$1', [payment.id])).rejects.toMatchObject({ code: "23514" });
  } finally { await sql.query("ROLLBACK"); }
});

test("void preserves records, rejects second void and payments; reprint only appends audit", async () => {
  const input = makeInput(); input.initialPayment = { amount: "25.00", method: "CASH", reference: "" };
  const invoice = await createInvoice(input, actorId);
  await expect(voidInvoiceRecord(invoice.id, " ", actorId)).rejects.toThrow();
  await voidInvoiceRecord(invoice.id, "Development acceptance void", actorId);
  await expect(voidInvoiceRecord(invoice.id, "Second void", actorId)).rejects.toThrow();
  await expect(addInvoicePayment({ invoiceId: invoice.id, amount: "1.00", method: "CASH", reference: "" }, actorId)).rejects.toThrow();
  const before = await getInvoiceById(invoice.id);
  expect(before!.status).toBe("VOID"); expect(before!.voidedById).toBe(actorId); expect(before!.voidedAt).not.toBeNull();
  expect(before!.items).toHaveLength(1); expect(before!.payments).toHaveLength(1);
  const reprint = await recordReceiptReprint(invoice.id, actorId);
  expect(reprint.invoiceNumber).toBe(invoice.invoiceNumber);
  expect(await getInvoiceById(invoice.id)).toEqual(before);
  expect(await db.auditLog.findUnique({ where: { id: reprint.auditId } })).not.toBeNull();
});

test("customer reuse preserves old snapshots; cash and QR payments settle independently", async () => {
  const input = makeInput("300.00");
  input.customerName = "Acceptance Snapshot Original";
  input.customerPhone = "0771234568";
  input.initialPayment = { amount: "100.00", method: "CASH", reference: run };
  const old = await createInvoice(input, actorId);
  const later = { ...input, idempotencyKey: randomUUID(), customerName: "Acceptance Snapshot Updated", initialPayment: null };
  await createInvoice(later, actorId);
  const saved = await getInvoiceById(old.id);
  expect(saved!.customerNameSnapshot).toBe("Acceptance Snapshot Original");
  expect(saved!.customerPhoneSnapshot).toBe("0771234568");
  expect(saved!.customer!.name).toBe("Acceptance Snapshot Updated");
  const result = await addInvoicePayment({ invoiceId: old.id, amount: "200.00", method: "QR", reference: run }, actorId);
  expect(result.outstanding).toBe("0.00");
  const paid = await getInvoiceById(old.id);
  expect(paid!.invoiceNumber).toBe(old.invoiceNumber);
  expect(paid!.payments.map(p => p.method)).toEqual(["CASH", "QR"]);
  expect(paid!.payments[0].createdAt.getTime()).toBeLessThanOrEqual(paid!.payments[1].createdAt.getTime());
  // The nullable customer relation may be removed; snapshots survive. Roll back the probe.
  await sql.query('BEGIN');
  try {
    await sql.query('DELETE FROM customers WHERE id=$1', [saved!.customerId]);
    const row = (await sql.query('SELECT "customerId", "customerNameSnapshot" FROM invoices WHERE id=$1', [old.id])).rows[0];
    expect(row.customerId).toBeNull(); expect(row.customerNameSnapshot).toBe("Acceptance Snapshot Original");
  } finally { await sql.query('ROLLBACK'); }
});

test("reversal constraints preserve original payment and valid paid total excludes reversal", async () => {
  const input = makeInput(); input.initialPayment = { amount: "25.00", method: "CASH", reference: run };
  const invoice = await createInvoice(input, actorId);
  const saved = await getInvoiceById(invoice.id);
  const paymentId = saved!.payments[0].id;
  await sql.query('BEGIN');
  try {
    await expect(sql.query('INSERT INTO payment_reversals (id,"paymentId",reason,"reversedById") VALUES ($1,$2,$3,$4)', [randomUUID(), paymentId, ' ', actorId])).rejects.toMatchObject({ code: '23514' });
  } finally { await sql.query('ROLLBACK'); }
  await sql.query('BEGIN');
  try {
    await sql.query('INSERT INTO payment_reversals (id,"paymentId",reason,"reversedById") VALUES ($1,$2,$3,$4)', [randomUUID(), paymentId, 'Development rollback-only probe', actorId]);
    const result = await sql.query('SELECT COALESCE(SUM(p.amount) FILTER (WHERE r.id IS NULL),0)::text AS paid FROM payments p LEFT JOIN payment_reversals r ON r."paymentId"=p.id WHERE p."invoiceId"=$1', [invoice.id]);
    expect(Number(result.rows[0].paid)).toBe(0);
    await expect(sql.query('DELETE FROM payments WHERE id=$1', [paymentId])).rejects.toMatchObject({ code: '23503' });
  } finally { await sql.query('ROLLBACK'); }
  expect(await db.payment.count({ where: { id: paymentId } })).toBe(1);
});

test("PostgreSQL rejects invalid values, duplicate identities and financial-history deletion", async () => {
  const invoice = await createInvoice(makeInput(), actorId);
  const checks: [string, unknown[], string][] = [
    ['UPDATE invoices SET subtotal=-1 WHERE id=$1', [invoice.id], '23514'],
    ['UPDATE invoice_items SET description=\' \' WHERE "invoiceId"=$1', [invoice.id], '23514'],
    ['UPDATE invoice_items SET quantity=0 WHERE "invoiceId"=$1', [invoice.id], '23514'],
    ['UPDATE invoice_items SET "unitPrice"=-1 WHERE "invoiceId"=$1', [invoice.id], '23514'],
    ['UPDATE invoices SET status=\'VOID\' WHERE id=$1', [invoice.id], '23514'],
    ['UPDATE invoices SET status=\'VOID\', "voidedAt"=now(), "voidedById"=$2, "voidReason"=NULL WHERE id=$1', [invoice.id, actorId], '23514'],
    ['DELETE FROM invoices WHERE id=$1', [invoice.id], '23503'],
  ];
  for (const [query, params, code] of checks) {
    await sql.query('BEGIN');
    try { await expect(sql.query(query, params)).rejects.toMatchObject({ code }); }
    finally { await sql.query('ROLLBACK'); }
  }
  const other = await createInvoice(makeInput(), actorId);
  for (const field of ["invoiceNumber", "idempotencyKey"]) {
    await sql.query('BEGIN');
    try { await expect(sql.query(`UPDATE invoices SET "${field}"=(SELECT "${field}" FROM invoices WHERE id=$1) WHERE id=$2`, [invoice.id, other.id])).rejects.toMatchObject({ code: '23505' }); }
    finally { await sql.query('ROLLBACK'); }
  }
});
