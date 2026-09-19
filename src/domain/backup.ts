import { createHash } from "node:crypto";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import Decimal from "decimal.js";
import { z } from "zod";

export const BACKUP_FORMAT_VERSION = 1;
export const APPLICATION_VERSION = "1.0.1";
export const SCHEMA_VERSION = "202609190001_add_operational_data_start";
export const LEGACY_SCHEMA_VERSION = "202609120003_phase7_restore_mode";

export const backupTables = [
  "settings", "users", "numberCounters", "customers", "quotations", "quotationItems", "quotationStatusHistory",
  "orders", "orderItems", "orderStatusHistory", "invoices", "invoiceItems", "cashSessions", "payments",
  "paymentReversals", "expenses", "cashMovements", "auditLogs",
] as const;

export type BackupTable = (typeof backupTables)[number];
export type BackupData = Record<BackupTable, Array<Record<string, unknown>>>;

const manifestSchema = z.object({
  formatVersion: z.literal(BACKUP_FORMAT_VERSION),
  applicationVersion: z.string().min(1).max(40),
  schemaVersion: z.union([z.literal(SCHEMA_VERSION), z.literal(LEGACY_SCHEMA_VERSION)]),
  generatedAt: z.string().datetime(),
  generatedBy: z.object({ id: z.string().min(1), name: z.string().min(1), email: z.string().email() }),
  businessName: z.string().min(1).max(120),
  operationalDataStartAt: z.string().datetime().nullable().optional(),
  recordCounts: z.record(z.string(), z.number().int().nonnegative()),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  sensitive: z.literal(true),
  credentialPolicy: z.literal("password-hashes-excluded"),
}).strict();

export type BackupManifest = z.infer<typeof manifestSchema>;

export class BackupValidationError extends Error {
  constructor(public readonly code: "MALFORMED" | "CHECKSUM" | "VERSION" | "RELATION" | "SIZE", message: string) {
    super(message);
    this.name = "BackupValidationError";
  }
}

export function calculateBackupChecksum(files: Record<string, Uint8Array>) {
  const hash = createHash("sha256");
  for (const name of Object.keys(files).sort()) {
    hash.update(name); hash.update("\0"); hash.update(files[name]); hash.update("\0");
  }
  return hash.digest("hex");
}

export function createBackupPackage(data: BackupData, manifestBase: Omit<BackupManifest, "checksum">) {
  const files: Record<string, Uint8Array> = {};
  for (const table of backupTables) files[`data/${table}.json`] = strToU8(JSON.stringify(data[table]));
  const manifest: BackupManifest = { ...manifestBase, checksum: calculateBackupChecksum(files) };
  return { bytes: zipSync({ "manifest.json": strToU8(JSON.stringify(manifest, null, 2)), ...files }, { level: 6 }), manifest };
}

export function parseBackupPackage(bytes: Uint8Array) {
  if (bytes.byteLength > 25 * 1024 * 1024) throw new BackupValidationError("SIZE", "Backup package exceeds the 25 MB upload limit");
  let files: Record<string, Uint8Array>;
  try { files = unzipSync(bytes); } catch { throw new BackupValidationError("MALFORMED", "Backup package is not a valid ZIP archive"); }
  if (Object.values(files).reduce((total, file) => total + file.byteLength, 0) > 100 * 1024 * 1024) throw new BackupValidationError("SIZE", "Expanded backup exceeds the 100 MB safety limit");
  let manifest: BackupManifest;
  try { manifest = manifestSchema.parse(JSON.parse(strFromU8(files["manifest.json"]))); }
  catch (error) {
    if (error instanceof z.ZodError && error.issues.some((issue) => issue.path[0] === "formatVersion" || issue.path[0] === "schemaVersion")) throw new BackupValidationError("VERSION", "Backup format or schema version is not supported");
    throw new BackupValidationError("MALFORMED", "Backup manifest is missing or malformed");
  }
  const dataFiles: Record<string, Uint8Array> = {};
  const data = {} as BackupData;
  for (const table of backupTables) {
    const name = `data/${table}.json`;
    const file = files[name];
    if (!file) throw new BackupValidationError("MALFORMED", `Required backup data is missing: ${table}`);
    dataFiles[name] = file;
    try {
      const rows = JSON.parse(strFromU8(file));
      if (!Array.isArray(rows) || rows.some((row) => !row || typeof row !== "object" || Array.isArray(row))) throw new Error();
      data[table] = rows;
    } catch { throw new BackupValidationError("MALFORMED", `Backup data is malformed: ${table}`); }
    if (manifest.recordCounts[table] !== data[table].length) throw new BackupValidationError("MALFORMED", `Record count does not match for ${table}`);
  }
  if (calculateBackupChecksum(dataFiles) !== manifest.checksum) throw new BackupValidationError("CHECKSUM", "Backup checksum is invalid; the package may be corrupt or altered");
  validateRelations(data);
  return { manifest, data };
}

function ids(rows: Array<Record<string, unknown>>) {
  const values = rows.map((row) => row.id);
  if (values.some((value) => typeof value !== "string" || !value)) throw new BackupValidationError("RELATION", "A required record identifier is missing");
  if (new Set(values).size !== values.length) throw new BackupValidationError("RELATION", "Duplicate record identifiers were found");
  return new Set(values as string[]);
}

function requireForeignKeys(rows: Array<Record<string, unknown>>, field: string, targets: Set<string>, nullable = false) {
  for (const row of rows) {
    const value = row[field];
    if (nullable && (value === null || value === undefined)) continue;
    if (typeof value !== "string" || !targets.has(value)) throw new BackupValidationError("RELATION", `Backup contains an invalid ${field} relation`);
  }
}

export function validateRelations(data: BackupData) {
  for (const table of backupTables) {
    if (table !== "numberCounters") ids(data[table]);
  }
  const counterKeys = data.numberCounters.map((row) => row.key);
  if (counterKeys.some((key) => typeof key !== "string" || !key) || new Set(counterKeys).size !== counterKeys.length) throw new BackupValidationError("RELATION", "Invalid or duplicate number-counter keys were found");
  const users = ids(data.users); const customers = ids(data.customers); const quotations = ids(data.quotations);
  const orders = ids(data.orders); const invoices = ids(data.invoices); const sessions = ids(data.cashSessions); const payments = ids(data.payments);
  requireForeignKeys(data.quotations, "createdById", users); requireForeignKeys(data.quotations, "convertedById", users, true); requireForeignKeys(data.quotations, "customerId", customers, true); requireForeignKeys(data.quotationItems, "quotationId", quotations); requireForeignKeys(data.quotationStatusHistory, "quotationId", quotations); requireForeignKeys(data.quotationStatusHistory, "changedById", users);
  requireForeignKeys(data.orders, "createdById", users); requireForeignKeys(data.orders, "quotationId", quotations, true); requireForeignKeys(data.orders, "customerId", customers, true); requireForeignKeys(data.orders, "assignedStaffId", users, true); requireForeignKeys(data.orderItems, "orderId", orders); requireForeignKeys(data.orderStatusHistory, "orderId", orders); requireForeignKeys(data.orderStatusHistory, "changedById", users);
  requireForeignKeys(data.invoices, "createdById", users); requireForeignKeys(data.invoices, "voidedById", users, true); requireForeignKeys(data.invoices, "customerId", customers, true); requireForeignKeys(data.invoices, "orderId", orders, true); requireForeignKeys(data.invoiceItems, "invoiceId", invoices); requireForeignKeys(data.cashSessions, "openedById", users); requireForeignKeys(data.cashSessions, "closedById", users, true);
  requireForeignKeys(data.payments, "invoiceId", invoices); requireForeignKeys(data.payments, "recordedById", users); requireForeignKeys(data.payments, "cashSessionId", sessions, true); requireForeignKeys(data.paymentReversals, "paymentId", payments); requireForeignKeys(data.paymentReversals, "reversedById", users);
  requireForeignKeys(data.expenses, "createdById", users); requireForeignKeys(data.expenses, "voidedById", users, true); requireForeignKeys(data.expenses, "cashSessionId", sessions, true); requireForeignKeys(data.cashMovements, "cashSessionId", sessions); requireForeignKeys(data.cashMovements, "createdById", users); requireForeignKeys(data.auditLogs, "userId", users, true);
  validateFinancialIntegrity(data);
}

function uniqueField(rows: Array<Record<string, unknown>>, field: string) {
  const values = rows.map((row) => row[field]).filter((value) => value !== null && value !== undefined);
  if (values.some((value) => typeof value !== "string" || !value) || new Set(values).size !== values.length) throw new BackupValidationError("RELATION", `Invalid or duplicate ${field} values were found`);
}

function money(row: Record<string, unknown>, field: string, nonnegative = true) {
  try {
    const value = new Decimal(String(row[field]));
    if (!value.isFinite() || (nonnegative && value.isNegative())) throw new Error();
    return value;
  } catch { throw new BackupValidationError("RELATION", `Backup contains an invalid ${field} value`); }
}

export function validateFinancialIntegrity(data: BackupData) {
  uniqueField(data.users, "email"); uniqueField(data.customers, "phoneNumber");
  for (const [rows, field] of [[data.invoices, "invoiceNumber"], [data.invoices, "idempotencyKey"], [data.quotations, "quotationNumber"], [data.quotations, "idempotencyKey"], [data.orders, "orderNumber"], [data.expenses, "expenseNumber"], [data.expenses, "idempotencyKey"], [data.cashSessions, "idempotencyKey"], [data.cashMovements, "idempotencyKey"]] as const) uniqueField(rows, field);
  const itemGroups = new Map<string, Array<Record<string, unknown>>>();
  for (const item of data.invoiceItems) itemGroups.set(String(item.invoiceId), [...(itemGroups.get(String(item.invoiceId)) ?? []), item]);
  for (const invoice of data.invoices) {
    const items = itemGroups.get(String(invoice.id)) ?? [];
    if (!items.length) throw new BackupValidationError("RELATION", "An invoice is missing its immutable line items");
    const subtotal = items.reduce((sum, item) => sum.plus(money(item, "lineTotal")), new Decimal(0));
    const storedSubtotal = money(invoice, "subtotal"); const discount = money(invoice, "discount"); const total = money(invoice, "grandTotal");
    if (!subtotal.equals(storedSubtotal) || !storedSubtotal.minus(discount).equals(total)) throw new BackupValidationError("RELATION", "Invoice financial totals do not reconcile");
  }
  const reversedPaymentIds = new Set(data.paymentReversals.map((row) => String(row.paymentId)));
  const invoiceTotals = new Map(data.invoices.map((row) => [String(row.id), money(row, "grandTotal")]));
  const paidByInvoice = new Map<string, Decimal>();
  for (const payment of data.payments) {
    const amount = money(payment, "amount", false);
    if (!amount.greaterThan(0)) throw new BackupValidationError("RELATION", "Payment amounts must be positive");
    if (!reversedPaymentIds.has(String(payment.id))) paidByInvoice.set(String(payment.invoiceId), (paidByInvoice.get(String(payment.invoiceId)) ?? new Decimal(0)).plus(amount));
  }
  for (const [invoiceId, paid] of paidByInvoice) if (paid.greaterThan(invoiceTotals.get(invoiceId) ?? new Decimal(-1))) throw new BackupValidationError("RELATION", "Invoice payment history exceeds its authoritative total");
  for (const expense of data.expenses) if (!money(expense, "amount", false).greaterThan(0)) throw new BackupValidationError("RELATION", "Expense amounts must be positive");
  for (const session of data.cashSessions) {
    if (session.status === "CLOSED") {
      const expected = money(session, "expectedCash", false); const actual = money(session, "actualCash"); const difference = money(session, "difference", false);
      if (!actual.minus(expected).equals(difference)) throw new BackupValidationError("RELATION", "Closed cash-session reconciliation is inconsistent");
      let calculated = money(session, "openingCash");
      for (const payment of data.payments) if (payment.cashSessionId === session.id && payment.method === "CASH" && !reversedPaymentIds.has(String(payment.id))) calculated = calculated.plus(money(payment, "amount", false));
      for (const expense of data.expenses) if (expense.cashSessionId === session.id && expense.paymentMethod === "CASH" && expense.status === "FINALIZED") calculated = calculated.minus(money(expense, "amount", false));
      for (const movement of data.cashMovements) if (movement.cashSessionId === session.id) calculated = movement.type === "CASH_DEPOSIT" ? calculated.plus(money(movement, "amount", false)) : calculated.minus(money(movement, "amount", false));
      if (!calculated.equals(expected)) throw new BackupValidationError("RELATION", "Closed cash-session activity does not reconcile to expected cash");
    }
  }
}

export function assertNoBackupSecrets(data: BackupData) {
  const serialized = JSON.stringify(data);
  const forbiddenKeys = ["passwordHash", "tokenHash", "DATABASE_URL", "DIRECT_URL", "PRIVATE_KEY", "SUPABASE_CA_CERT", "SEED_ADMIN_PASSWORD"];
  if (forbiddenKeys.some((key) => serialized.includes(`\"${key}\"`))) throw new BackupValidationError("MALFORMED", "Backup contains prohibited credential material");
}
