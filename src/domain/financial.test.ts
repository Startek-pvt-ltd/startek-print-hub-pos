import { describe, expect, it } from "vitest";
import { calculateInvoiceTotals, calculateLineTotal, calculateOutstanding, calculateValidPaidTotal, validatePayment } from "./financial";

describe("manual invoice calculations", () => {
  it.each([
    ["1", "3500", "3500.00"],
    ["2.5", "120", "300.00"],
    ["500", "8.25", "4125.00"],
    ["12.75", "2.35", "29.96"],
  ])("calculates %s × %s", (quantity, unitPrice, expected) => {
    expect(calculateLineTotal(quantity, unitPrice).toFixed(2)).toBe(expected);
  });

  it("calculates multiple items, discount, and grand total", () => {
    const result = calculateInvoiceTotals([{ quantity: 1, unitPrice: 3500 }, { quantity: 1, unitPrice: 1000 }, { quantity: 500, unitPrice: 8 }], 500);
    expect(result.subtotal.toFixed(2)).toBe("8500.00");
    expect(result.discount.toFixed(2)).toBe("500.00");
    expect(result.grandTotal.toFixed(2)).toBe("8000.00");
  });

  it("rejects invalid items and discounts", () => {
    expect(() => calculateLineTotal(0, 10)).toThrow("Quantity must be greater than zero");
    expect(() => calculateLineTotal(1, -1)).toThrow("Unit price cannot be negative");
    expect(() => calculateInvoiceTotals([{ quantity: 1, unitPrice: 10 }], 11)).toThrow("Discount cannot exceed subtotal");
  });
});

describe("payment ledger calculations", () => {
  it("supports no, advance, partial, multiple, full, and balance payments", () => {
    expect(calculateValidPaidTotal([]).toFixed(2)).toBe("0.00");
    expect(calculateOutstanding(25000, [{ amount: 10000 }]).toFixed(2)).toBe("15000.00");
    expect(calculateOutstanding(25000, [{ amount: 10000 }, { amount: 10000 }]).toFixed(2)).toBe("5000.00");
    expect(validatePayment(5000, 5000).toFixed(2)).toBe("5000.00");
    expect(calculateOutstanding(25000, [{ amount: 10000 }, { amount: 10000 }, { amount: 5000 }]).toFixed(2)).toBe("0.00");
  });

  it("excludes reversed payments", () => {
    expect(calculateValidPaidTotal([{ amount: 1000 }, { amount: 500, reversed: true }]).toFixed(2)).toBe("1000.00");
  });

  it("rejects zero, negative, and overpayments", () => {
    expect(() => validatePayment(0, 100)).toThrow("greater than zero");
    expect(() => validatePayment(-1, 100)).toThrow("greater than zero");
    expect(() => validatePayment(101, 100)).toThrow("cannot exceed");
  });
});
