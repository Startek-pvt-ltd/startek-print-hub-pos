import { describe, expect, it } from "vitest";
import {
  businessDateRange,
  csvCell,
  expenseSummary,
  isOrderOverdue,
  operationalNetIncome,
  paymentMethodSummary,
  salesSummary,
  shopDateKey,
  toCsv,
} from "./reporting";

describe("Phase 6 reporting domain", () => {
  it("uses Asia/Colombo business-day boundaries across UTC midnight", () => {
    expect(shopDateKey(new Date("2026-09-08T18:29:59.999Z"))).toBe("2026-09-08");
    expect(shopDateKey(new Date("2026-09-08T18:30:00.000Z"))).toBe("2026-09-09");
    const range = businessDateRange({ preset: "today", now: new Date("2026-09-08T20:00:00Z") });
    expect(range.from).toBe("2026-09-09");
    expect(range.start.toISOString()).toBe("2026-09-08T18:30:00.000Z");
    expect(range.endExclusive.toISOString()).toBe("2026-09-09T18:30:00.000Z");
  });

  it("uses Monday through Sunday for weekly reports and validates custom ranges", () => {
    const week = businessDateRange({ preset: "week", now: new Date("2026-09-09T06:00:00Z") });
    expect([week.from, week.to]).toEqual(["2026-09-07", "2026-09-13"]);
    expect(() => businessDateRange({ preset: "custom", from: "2026-09-10", to: "2026-09-01" })).toThrow("Start date");
    expect(() => businessDateRange({ preset: "custom", from: "2026-02-30", to: "2026-03-01" })).toThrow("valid date");
    expect(businessDateRange({ preset: "month", month: "2025-02" })).toMatchObject({ from: "2025-02-01", to: "2025-02-28" });
    expect(() => businessDateRange({ preset: "month", month: "2025-13" })).toThrow("valid month");
  });

  it("separates sales, valid payments, outstanding, expenses, and operational income", () => {
    const sales = salesSummary([
      { status: "FINALIZED", grandTotal: "10000", payments: [{ amount: "4000" }] },
      { status: "FINALIZED", grandTotal: "5000", payments: [{ amount: "1000", reversed: true }] },
      { status: "VOID", grandTotal: "2000", payments: [{ amount: "2000" }] },
    ]);
    const expenses = expenseSummary([
      { status: "FINALIZED", amount: "3000", category: "MATERIALS" },
      { status: "VOID", amount: "500", category: "OTHER" },
    ]);
    expect(sales.sales.toFixed(2)).toBe("15000.00");
    expect(sales.paid.toFixed(2)).toBe("4000.00");
    expect(sales.outstanding.toFixed(2)).toBe("11000.00");
    expect(expenses.total.toFixed(2)).toBe("3000.00");
    expect(operationalNetIncome(sales.sales, expenses.total).toFixed(2)).toBe("12000.00");
  });

  it("groups valid payments and excludes reversals", () => {
    const result = paymentMethodSummary([
      { method: "CASH", amount: "2000" },
      { method: "CARD", amount: "3000" },
      { method: "BANK_TRANSFER", amount: "4000" },
      { method: "QR", amount: "1000" },
      { method: "CASH", amount: "500", reversed: true },
    ]);
    expect(result.total.toFixed(2)).toBe("10000.00");
    expect(result.groups.CASH.total.toFixed(2)).toBe("2000.00");
    expect(result.groups.CASH.count).toBe(1);
  });

  it("classifies overdue orders without treating terminal orders as overdue", () => {
    const dueDate = new Date("2026-09-08T00:00:00Z");
    expect(isOrderOverdue({ dueDate, status: "PRINTING" }, "2026-09-09")).toBe(true);
    expect(isOrderOverdue({ dueDate, status: "DELIVERED" }, "2026-09-09")).toBe(false);
    expect(isOrderOverdue({ dueDate, status: "CANCELLED" }, "2026-09-09")).toBe(false);
  });

  it("protects CSV cells from spreadsheet formulas and escapes quotes", () => {
    for (const value of ["=SUM(A1:A2)", "+123", "@something", "-test"]) expect(csvCell(value)).toMatch(/^"'/);
    expect(csvCell('Paper "A4"')).toBe('"Paper ""A4"""');
    expect(toCsv(["Name"], [["=danger"]])).toContain("'=danger");
  });
});
