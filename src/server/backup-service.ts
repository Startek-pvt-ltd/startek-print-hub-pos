import "server-only";

import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import {
  APPLICATION_VERSION,
  assertNoBackupSecrets,
  backupTables,
  BACKUP_FORMAT_VERSION,
  createBackupPackage,
  parseBackupPackage,
  SCHEMA_VERSION,
  type BackupData,
} from "@/domain/backup";

type Actor = { id: string; name: string; email: string };

function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item)) as T;
}

export async function createBusinessBackup(actor: Actor) {
  const data = await db.$transaction(async (tx) => jsonSafe<BackupData>({
    settings: await tx.setting.findMany(),
    users: await tx.user.findMany({ select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, updatedAt: true } }),
    numberCounters: await tx.numberCounter.findMany(),
    customers: await tx.customer.findMany(),
    quotations: await tx.quotation.findMany(),
    quotationItems: await tx.quotationItem.findMany(),
    quotationStatusHistory: await tx.quotationStatusHistory.findMany(),
    orders: await tx.order.findMany(),
    orderItems: await tx.orderItem.findMany(),
    orderStatusHistory: await tx.orderStatusHistory.findMany(),
    invoices: await tx.invoice.findMany(),
    invoiceItems: await tx.invoiceItem.findMany(),
    cashSessions: await tx.cashSession.findMany(),
    payments: await tx.payment.findMany(),
    paymentReversals: await tx.paymentReversal.findMany(),
    expenses: await tx.expense.findMany(),
    cashMovements: await tx.cashMovement.findMany(),
    auditLogs: await tx.auditLog.findMany(),
  }), { isolationLevel: "RepeatableRead", maxWait: 15_000, timeout: 60_000 });

  assertNoBackupSecrets(data);
  const settings = data.settings[0];
  const recordCounts = Object.fromEntries(backupTables.map((table) => [table, data[table].length]));
  const result = createBackupPackage(data, {
    formatVersion: BACKUP_FORMAT_VERSION,
    applicationVersion: APPLICATION_VERSION,
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    generatedBy: actor,
    businessName: typeof settings?.businessName === "string" ? settings.businessName : "Startek Print Hub",
    operationalDataStartAt: settings?.operationalDataStartAt == null ? null : String(settings.operationalDataStartAt),
    recordCounts,
    sensitive: true,
    credentialPolicy: "password-hashes-excluded",
  });

  await db.auditLog.create({
    data: {
      userId: actor.id,
      action: "BACKUP_CREATED",
      entityType: "Backup",
      metadata: { checksum: result.manifest.checksum, recordCounts, applicationVersion: APPLICATION_VERSION, schemaVersion: SCHEMA_VERSION },
    },
  });
  return result;
}

export function previewBusinessBackup(bytes: Uint8Array) {
  const parsed = parseBackupPackage(bytes);
  assertNoBackupSecrets(parsed.data);
  return {
    manifest: parsed.manifest,
    warnings: [
      "Restore is available only against an empty DEVELOPMENT business dataset.",
      "User passwords and browser sessions are intentionally not included.",
      "Existing users are matched by email; unmatched users are restored disabled.",
    ],
  };
}

const businessCounts = async (tx: Prisma.TransactionClient) => ({
  customers: await tx.customer.count(), quotations: await tx.quotation.count(), orders: await tx.order.count(),
  invoices: await tx.invoice.count(), cashSessions: await tx.cashSession.count(), payments: await tx.payment.count(),
  paymentReversals: await tx.paymentReversal.count(), expenses: await tx.expense.count(), cashMovements: await tx.cashMovement.count(),
});

function remap(rows: Array<Record<string, unknown>>, fields: readonly string[], userIds: Map<string, string>) {
  return rows.map((row) => {
    const next = { ...row };
    for (const field of fields) {
      const value = next[field];
      if (typeof value === "string") next[field] = userIds.get(value) ?? value;
    }
    return next;
  });
}

export async function restoreBusinessBackup(bytes: Uint8Array, actor: Actor) {
  if (process.env.DATABASE_ENVIRONMENT !== "development") throw new Error("Restore is disabled outside the development database");
  const { data, manifest } = parseBackupPackage(bytes);
  assertNoBackupSecrets(data);

  const restored = await db.$transaction(async (tx) => {
    const before = await businessCounts(tx);
    if (Object.values(before).some((count) => count !== 0)) throw new Error("Restore requires an empty development business dataset");

    const existingUsers = await tx.user.findMany({ select: { id: true, email: true } });
    const byEmail = new Map(existingUsers.map((user) => [user.email.toLowerCase(), user.id]));
    const userIds = new Map<string, string>();
    for (const source of data.users) {
      const sourceId = String(source.id);
      const email = String(source.email).toLowerCase();
      const existingId = byEmail.get(email);
      if (existingId) {
        userIds.set(sourceId, existingId);
        continue;
      }
      const passwordHash = await hash(randomBytes(48).toString("base64url"), 12);
      const created = await tx.user.create({ data: {
        id: sourceId, name: String(source.name), email, passwordHash,
        role: source.role as Prisma.UserCreateInput["role"], status: "DISABLED",
        createdAt: new Date(String(source.createdAt)), updatedAt: new Date(String(source.updatedAt)),
      }, select: { id: true } });
      userIds.set(sourceId, created.id);
    }

    await tx.$executeRawUnsafe("SET LOCAL app.restore_mode = 'on'");
    for (const row of data.settings) {
      const setting = {
        ...row,
        operationalDataStartAt: row.operationalDataStartAt ? new Date(String(row.operationalDataStartAt)) : null,
      } as Prisma.SettingCreateManyInput;
      await tx.setting.upsert({ where: { id: setting.id }, create: setting, update: setting });
    }
    for (const row of data.numberCounters) {
      const counter = { ...row, nextValue: BigInt(String(row.nextValue)) } as Prisma.NumberCounterCreateManyInput;
      await tx.numberCounter.upsert({ where: { key: counter.key }, create: counter, update: counter });
    }
    await tx.customer.createMany({ data: data.customers as Prisma.CustomerCreateManyInput[] });
    await tx.quotation.createMany({ data: remap(data.quotations, ["createdById", "convertedById"], userIds) as Prisma.QuotationCreateManyInput[] });
    await tx.quotationItem.createMany({ data: data.quotationItems as Prisma.QuotationItemCreateManyInput[] });
    await tx.quotationStatusHistory.createMany({ data: remap(data.quotationStatusHistory, ["changedById"], userIds) as Prisma.QuotationStatusHistoryCreateManyInput[] });
    await tx.order.createMany({ data: remap(data.orders, ["createdById", "assignedStaffId"], userIds) as Prisma.OrderCreateManyInput[] });
    await tx.orderItem.createMany({ data: data.orderItems as Prisma.OrderItemCreateManyInput[] });
    await tx.orderStatusHistory.createMany({ data: remap(data.orderStatusHistory, ["changedById"], userIds) as Prisma.OrderStatusHistoryCreateManyInput[] });
    await tx.invoice.createMany({ data: remap(data.invoices, ["createdById", "voidedById"], userIds) as Prisma.InvoiceCreateManyInput[] });
    await tx.invoiceItem.createMany({ data: data.invoiceItems as Prisma.InvoiceItemCreateManyInput[] });
    await tx.cashSession.createMany({ data: remap(data.cashSessions, ["openedById", "closedById"], userIds) as Prisma.CashSessionCreateManyInput[] });
    await tx.payment.createMany({ data: remap(data.payments, ["recordedById"], userIds) as Prisma.PaymentCreateManyInput[] });
    await tx.paymentReversal.createMany({ data: remap(data.paymentReversals, ["reversedById"], userIds) as Prisma.PaymentReversalCreateManyInput[] });
    await tx.expense.createMany({ data: remap(data.expenses, ["createdById", "voidedById"], userIds) as Prisma.ExpenseCreateManyInput[] });
    await tx.cashMovement.createMany({ data: remap(data.cashMovements, ["createdById"], userIds) as Prisma.CashMovementCreateManyInput[] });
    await tx.auditLog.createMany({ data: remap(data.auditLogs, ["userId"], userIds) as Prisma.AuditLogCreateManyInput[], skipDuplicates: true });

    const after = await businessCounts(tx);
    for (const [table, count] of Object.entries(after)) {
      if (count !== manifest.recordCounts[table]) throw new Error(`Restore verification failed for ${table}`);
    }
    await tx.auditLog.create({ data: { userId: actor.id, action: "BACKUP_RESTORED", entityType: "Backup", metadata: { checksum: manifest.checksum, recordCounts: manifest.recordCounts } } });
    return after;
  }, { isolationLevel: "Serializable", maxWait: 15_000, timeout: 120_000 });
  return { manifest, restored };
}

export async function getLastBackupAudit() {
  return db.auditLog.findFirst({
    where: { action: "BACKUP_CREATED" }, orderBy: { createdAt: "desc" },
    select: { createdAt: true, user: { select: { name: true } }, metadata: true },
  });
}
