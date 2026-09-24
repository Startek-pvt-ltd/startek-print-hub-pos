import { describe, expect, it } from "vitest";
import { strToU8, unzipSync, zipSync } from "fflate";
import { APPLICATION_VERSION, assertNoBackupSecrets, backupTables, BACKUP_FORMAT_VERSION, calculateBackupChecksum, createBackupPackage, LEGACY_SCHEMA_VERSION, parseBackupPackage, SCHEMA_VERSION, V1_SCHEMA_VERSION, type BackupData } from "./backup";

function fixture(): BackupData {
  const data = Object.fromEntries(backupTables.map((table) => [table, []])) as unknown as BackupData;
  data.settings = [{ id: "primary", businessName: "Startek Print Hub" }];
  data.users = [{ id: "user-1", name: "Admin", username: "stadmin", email: "admin@example.com", role: "ADMIN", status: "ACTIVE", createdAt: "2026-09-12T00:00:00.000Z", updatedAt: "2026-09-12T00:00:00.000Z" }];
  data.customers = [{ id: "customer-1", name: "Customer", phoneNumber: "0771234567" }];
  data.invoices = [{ id: "invoice-1", invoiceNumber: "SPH-INV-000001", idempotencyKey: "invoice-key", customerId: "customer-1", createdById: "user-1", voidedById: null, orderId: null, subtotal: "940.00", discount: "0.00", grandTotal: "940.00" }];
  data.invoiceItems = [{ id: "item-1", invoiceId: "invoice-1", lineTotal: "940.00" }];
  data.payments = [{ id: "payment-1", invoiceId: "invoice-1", recordedById: "user-1", cashSessionId: null, amount: "940.00" }];
  data.auditLogs = [{ id: "audit-1", userId: "user-1" }];
  return data;
}

function packageFixture(data = fixture()) {
  return createBackupPackage(data, {
    formatVersion: BACKUP_FORMAT_VERSION, applicationVersion: APPLICATION_VERSION, schemaVersion: SCHEMA_VERSION,
    generatedAt: "2026-09-12T00:00:00.000Z", generatedBy: { id: "user-1", name: "Admin", email: "admin@example.com" },
    businessName: "Startek Print Hub", recordCounts: Object.fromEntries(backupTables.map((table) => [table, data[table].length])),
    sensitive: true, credentialPolicy: "password-hashes-excluded",
  });
}

describe("portable backup format", () => {
  it("round-trips every required table with a valid SHA-256 checksum", () => {
    const created = packageFixture();
    const restored = parseBackupPackage(created.bytes);
    expect(restored.manifest.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(restored.data).toEqual(fixture());
    expect(Object.keys(restored.manifest.recordCounts)).toEqual(expect.arrayContaining([...backupTables]));
  });

  it("rejects altered data and unsupported schema versions", () => {
    const created = packageFixture();
    const files = unzipSync(created.bytes);
    files["data/customers.json"] = strToU8("[]");
    expect(() => parseBackupPackage(zipSync(files))).toThrow("Record count");
    const versionFiles = unzipSync(created.bytes);
    versionFiles["manifest.json"] = strToU8(new TextDecoder().decode(versionFiles["manifest.json"]).replace(SCHEMA_VERSION, "unsupported"));
    expect(() => parseBackupPackage(zipSync(versionFiles))).toThrow("version");
  });

  it("accepts the V1 backup schema while preserving a new operational cutoff", () => {
    const current = packageFixture();
    expect(parseBackupPackage(current.bytes).manifest.operationalDataStartAt).toBeUndefined();
    const files = unzipSync(current.bytes);
    files["manifest.json"] = strToU8(new TextDecoder().decode(files["manifest.json"]).replace(SCHEMA_VERSION, LEGACY_SCHEMA_VERSION));
    expect(parseBackupPackage(zipSync(files)).manifest.schemaVersion).toBe(LEGACY_SCHEMA_VERSION);

    const v1Files = unzipSync(current.bytes);
    const v1Users = JSON.parse(new TextDecoder().decode(v1Files["data/users.json"]));
    for (const user of v1Users) delete user.username;
    v1Files["data/users.json"] = strToU8(JSON.stringify(v1Users));
    const v1Manifest = JSON.parse(new TextDecoder().decode(v1Files["manifest.json"]));
    v1Manifest.schemaVersion = V1_SCHEMA_VERSION;
    const dataFiles = Object.fromEntries(Object.entries(v1Files).filter(([name]) => name.startsWith("data/")));
    v1Manifest.checksum = calculateBackupChecksum(dataFiles);
    v1Files["manifest.json"] = strToU8(JSON.stringify(v1Manifest));
    expect(parseBackupPackage(zipSync(v1Files)).manifest.schemaVersion).toBe(V1_SCHEMA_VERSION);

    const withCutoff = createBackupPackage(fixture(), {
      ...current.manifest,
      operationalDataStartAt: "2026-09-19T04:30:00.000Z",
    });
    expect(parseBackupPackage(withCutoff.bytes).manifest.operationalDataStartAt).toBe("2026-09-19T04:30:00.000Z");
  });

  it("rejects invalid relationships and credential material", () => {
    const invalid = fixture(); invalid.invoices[0].createdById = "missing-user";
    expect(() => parseBackupPackage(packageFixture(invalid).bytes)).toThrow("relation");
    const secret = fixture(); secret.users[0].passwordHash = "must-not-export";
    expect(() => assertNoBackupSecrets(secret)).toThrow("credential");
  });
});
