import "dotenv/config";
import { execFileSync } from "node:child_process";
import { afterAll, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));
const project = "fbnwigknxlapnemmmugd";
if (process.env.DATABASE_ENVIRONMENT !== "development") throw new Error("Development environment required");
for (const key of ["DATABASE_URL", "DIRECT_URL"] as const) {
  const url = new URL(process.env[key] ?? "");
  if (url.username !== `postgres.${project}` || url.hostname !== "aws-0-ap-northeast-2.pooler.supabase.com" || url.port !== (key === "DATABASE_URL" ? "6543" : "5432")) throw new Error("Unapproved integration database");
}
execFileSync("git", ["check-ignore", "-q", ".env"]);

const { db } = await import("../../src/lib/db");
const { parseBackupPackage } = await import("../../src/domain/backup");
const { createBusinessBackup, previewBusinessBackup, restoreBusinessBackup } = await import("../../src/server/backup-service");
const { hasPermission } = await import("../../src/lib/permissions");
const admin = await db.user.findUniqueOrThrow({ where: { email: process.env.SEED_ADMIN_EMAIL!.trim().toLowerCase() }, select: { id: true, name: true, email: true } });
const startedAt = new Date();

afterAll(async () => {
  await db.auditLog.deleteMany({ where: { action: "BACKUP_CREATED", userId: admin.id, entityType: "Backup", createdAt: { gte: startedAt } } });
  await db.$disconnect();
});

test("development backup is complete, checksum-valid, and excludes credentials and sessions", async () => {
  const backup = await createBusinessBackup(admin);
  const parsed = parseBackupPackage(backup.bytes);
  const serialized = JSON.stringify(parsed.data);
  expect(parsed.manifest.checksum).toBe(backup.manifest.checksum);
  expect(parsed.manifest.credentialPolicy).toBe("password-hashes-excluded");
  expect(serialized).not.toContain("passwordHash");
  expect(serialized).not.toContain("tokenHash");
  expect(Object.keys(parsed.data)).not.toContain("sessions");
  expect(parsed.data.invoices.length).toBe(await db.invoice.count());
});

test("upload preview validates without modifying business records", async () => {
  const backup = await createBusinessBackup(admin);
  const before = await db.invoice.count();
  const preview = previewBusinessBackup(backup.bytes);
  expect(preview.manifest.recordCounts.invoices).toBe(before);
  expect(await db.invoice.count()).toBe(before);
});

test("restore is Admin-only by policy and refuses a non-empty target", async () => {
  expect(hasPermission("ADMIN", "backups:manage")).toBe(true);
  for (const role of ["STAFF", "MANAGER", "CASHIER", "DESIGNER", "PRODUCTION"] as const) expect(hasPermission(role, "backups:manage")).toBe(false);
  const backup = await createBusinessBackup(admin);
  await expect(restoreBusinessBackup(backup.bytes, admin)).rejects.toThrow("empty development business dataset");
});
