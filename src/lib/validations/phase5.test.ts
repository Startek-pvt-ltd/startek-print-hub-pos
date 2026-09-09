import { describe, expect, it } from "vitest";
import { cashMovementSchema, closeCashSessionSchema, expenseInputSchema, openCashSessionSchema } from "./phase5";

describe("Phase 5 validation", () => {
  it("accepts valid expense and register inputs", () => {
    expect(expenseInputSchema.safeParse({ idempotencyKey: crypto.randomUUID(), category: "MATERIALS", description: "Banner material", amount: "2000.00", paymentMethod: "CASH" }).success).toBe(true);
    expect(openCashSessionSchema.safeParse({ idempotencyKey: crypto.randomUUID(), openingCash: "0.00" }).success).toBe(true);
    expect(closeCashSessionSchema.safeParse({ cashSessionId: "cmts5cdp00000olt8xdacc0ih", idempotencyKey: crypto.randomUUID(), actualCash: "100.00", closingNote: "" }).success).toBe(true);
    expect(cashMovementSchema.safeParse({ idempotencyKey: crypto.randomUUID(), type: "CASH_DEPOSIT", amount: "10.00", reason: "Change money" }).success).toBe(true);
  });

  it("rejects zero expenses, negative cash, and vague movements", () => {
    expect(expenseInputSchema.safeParse({ idempotencyKey: crypto.randomUUID(), category: "OTHER", description: "Test", amount: "0.00", paymentMethod: "QR" }).success).toBe(false);
    expect(openCashSessionSchema.safeParse({ idempotencyKey: crypto.randomUUID(), openingCash: "-1" }).success).toBe(false);
    expect(cashMovementSchema.safeParse({ idempotencyKey: crypto.randomUUID(), type: "CASH_WITHDRAWAL", amount: "1.00", reason: "x" }).success).toBe(false);
  });
});
