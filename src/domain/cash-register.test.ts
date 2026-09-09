import { describe, expect, it } from "vitest";
import { calculateCashSummary, calculateDifference, positiveMoney } from "./cash-register";

describe("cash register calculations", () => {
  it("calculates the approved drawer formula with decimal arithmetic", () => {
    const summary = calculateCashSummary({
      openingCash: "5000.00",
      payments: [
        { amount: "10000.00", method: "CASH" },
        { amount: "5000.00", method: "BANK_TRANSFER" },
      ],
      expenses: [
        { amount: "2000.00", paymentMethod: "CASH" },
        { amount: "1000.00", paymentMethod: "BANK_TRANSFER" },
      ],
      movements: [
        { amount: "1000.00", type: "CASH_DEPOSIT" },
        { amount: "500.00", type: "CASH_WITHDRAWAL" },
      ],
    });

    expect(summary.cashReceipts.toFixed(2)).toBe("10000.00");
    expect(summary.cashExpenses.toFixed(2)).toBe("2000.00");
    expect(summary.expectedCash.toFixed(2)).toBe("13500.00");
    expect(calculateDifference("13400.00", summary.expectedCash).toFixed(2)).toBe("-100.00");
  });

  it("excludes reversals and void expenses", () => {
    const summary = calculateCashSummary({
      openingCash: 100,
      payments: [{ amount: 50, method: "CASH", reversed: true }],
      expenses: [{ amount: 25, paymentMethod: "CASH", voided: true }],
      movements: [],
    });
    expect(summary.expectedCash.toFixed(2)).toBe("100.00");
  });

  it("rejects invalid operational amounts", () => {
    expect(() => positiveMoney(0, "Expense amount")).toThrow("greater than zero");
    expect(() => calculateDifference("-1", "0")).toThrow("cannot be negative");
  });
});
