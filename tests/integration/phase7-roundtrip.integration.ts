import "dotenv/config";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import pg from "pg";
import { afterAll, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
const project = "fbnwigknxlapnemmmugd";
if (process.env.DATABASE_ENVIRONMENT !== "development") throw new Error("Development environment required");
const originalDirect = new URL(process.env.DIRECT_URL ?? "");
if (originalDirect.username !== `postgres.${project}` || originalDirect.hostname !== "aws-0-ap-northeast-2.pooler.supabase.com" || originalDirect.port !== "5432") throw new Error("Unapproved integration database");
execFileSync("git", ["check-ignore", "-q", ".env"]);

const schemaName = `phase7_restore_${randomUUID().replaceAll("-", "")}`;
if (!/^phase7_restore_[a-f0-9]{32}$/.test(schemaName)) throw new Error("Unsafe temporary schema name");
const adminUrl = new URL(originalDirect); adminUrl.searchParams.delete("schema"); adminUrl.searchParams.delete("sslmode");
const admin = new pg.Client({ connectionString: adminUrl.toString(), ssl: process.env.SUPABASE_CA_CERT ? { ca: process.env.SUPABASE_CA_CERT, rejectUnauthorized: true } : undefined });
await admin.connect();

const testUrl = new URL(originalDirect); testUrl.searchParams.set("schema", schemaName);
const migrate = () => execFileSync("/usr/local/bin/corepack", ["pnpm", "exec", "prisma", "migrate", "deploy"], {
  cwd: process.cwd(), env: { ...process.env, DATABASE_URL: testUrl.toString(), DIRECT_URL: testUrl.toString() }, stdio: "pipe",
});

await admin.query(`CREATE SCHEMA "${schemaName}"`);
migrate();
process.env.DATABASE_URL = testUrl.toString();
process.env.DIRECT_URL = testUrl.toString();

const { db } = await import("../../src/lib/db");
const { createBusinessBackup, restoreBusinessBackup } = await import("../../src/server/backup-service");
const sourceUserId = `source-${randomUUID()}`;
const targetUserId = `target-${randomUUID()}`;
const sourceEmail = `phase7-${randomUUID()}@example.invalid`;
const actor = { id: sourceUserId, name: "Phase 7 Admin", email: sourceEmail };
let cleaned = false;

afterAll(async () => {
  await db.$disconnect().catch(() => undefined);
  if (!cleaned) await admin.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
  await admin.end();
});

test("portable backup restores financial history atomically into an isolated empty DEVELOPMENT schema", async () => {
  await db.user.create({ data: { id: sourceUserId, name: actor.name, email: actor.email, passwordHash: "test-only-unusable", role: "ADMIN", status: "ACTIVE" } });
  const customerId = `customer-${randomUUID()}`; const invoiceId = `invoice-${randomUUID()}`; const paymentId = `payment-${randomUUID()}`;
  await db.customer.create({ data: { id: customerId, name: "Round-trip Customer", phoneNumber: "0770000001" } });
  await db.invoice.create({ data: { id: invoiceId, invoiceNumber: "SPH-INV-990001", idempotencyKey: randomUUID(), customerId, customerNameSnapshot: "Round-trip Customer", customerPhoneSnapshot: "0770000001", subtotal: "940.00", discount: "0.00", grandTotal: "940.00", createdById: sourceUserId, items: { create: { id: `item-${randomUUID()}`, description: "Round-trip manual item", quantity: "1", unitPrice: "940.00", lineTotal: "940.00", sortOrder: 0 } } } });
  await db.payment.create({ data: { id: paymentId, invoiceId, amount: "940.00", method: "CASH", recordedById: sourceUserId, cashTendered: "1000.00", changeGiven: "60.00" } });
  await db.auditLog.create({ data: { userId: sourceUserId, action: "ROUND_TRIP_SOURCE", entityType: "Invoice", entityId: invoiceId } });
  const backup = await createBusinessBackup(actor);

  await db.$disconnect();
  await admin.query(`DROP SCHEMA "${schemaName}" CASCADE`);
  await admin.query(`CREATE SCHEMA "${schemaName}"`);
  migrate();
  await db.$connect();
  await db.user.create({ data: { id: targetUserId, name: "Recovery Admin", email: sourceEmail, passwordHash: "target-password-preserved", role: "ADMIN", status: "ACTIVE" } });

  const result = await restoreBusinessBackup(backup.bytes, { id: targetUserId, name: "Recovery Admin", email: sourceEmail });
  expect(result.restored).toMatchObject({ customers: 1, invoices: 1, payments: 1 });
  const invoice = await db.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { items: true, payments: true } });
  expect(invoice.createdById).toBe(targetUserId);
  expect(invoice.items).toHaveLength(1); expect(invoice.grandTotal.toFixed(2)).toBe("940.00");
  expect(invoice.payments[0]).toMatchObject({ id: paymentId, recordedById: targetUserId });
  expect(invoice.payments[0].cashTendered?.toFixed(2)).toBe("1000.00"); expect(invoice.payments[0].changeGiven?.toFixed(2)).toBe("60.00");
  expect(await db.auditLog.count({ where: { action: "BACKUP_RESTORED", userId: targetUserId } })).toBe(1);
  expect((await db.user.findUniqueOrThrow({ where: { id: targetUserId } })).passwordHash).toBe("target-password-preserved");

  await db.$disconnect(); await admin.query(`DROP SCHEMA "${schemaName}" CASCADE`); cleaned = true;
});
