import { describe, expect, it } from "vitest";
import { reportExportSchema, reportQuerySchema } from "./reports";

describe("report filters", () => {
  it("defaults to monthly sales", () => {
    expect(reportQuerySchema.parse({})).toMatchObject({ view: "sales", preset: "month" });
  });

  it("rejects unsupported reports and malformed dates", () => {
    expect(reportQuerySchema.safeParse({ view: "audit" }).success).toBe(false);
    expect(reportQuerySchema.safeParse({ from: "09/01/2026" }).success).toBe(false);
    expect(reportExportSchema.safeParse({ kind: "customers" }).success).toBe(false);
  });
});
