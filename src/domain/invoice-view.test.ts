import { describe, expect, it } from "vitest";
import { derivePaymentState } from "./invoice-view";

describe("derived invoice payment state", () => {
  it("derives unpaid, partial, paid, and void without persistence", () => {
    expect(derivePaymentState("FINALIZED", "1000", [])).toBe("UNPAID");
    expect(derivePaymentState("FINALIZED", "1000", [{ amount: "400" }])).toBe("PARTIAL");
    expect(derivePaymentState("FINALIZED", "1000", [{ amount: "400" }, { amount: "600" }])).toBe("PAID");
    expect(derivePaymentState("VOID", "1000", [{ amount: "1000" }])).toBe("VOID");
    expect(derivePaymentState("FINALIZED", "1000", [{ amount: "1000", reversed: true }])).toBe("UNPAID");
  });
});
