import { describe, expect, it } from "vitest";
import { hasPermission } from "./permissions";

describe("role permissions", () => {
  it("allows administrators to manage settings and backups", () => {
    expect(hasPermission("ADMIN", "settings:manage")).toBe(true);
    expect(hasPermission("ADMIN", "backups:manage")).toBe(true);
  });

  it("prevents cashiers from voiding invoices or viewing reports", () => {
    expect(hasPermission("CASHIER", "invoices:void")).toBe(false);
    expect(hasPermission("CASHIER", "reports:view")).toBe(false);
    expect(hasPermission("CASHIER", "payments:create")).toBe(true);
    expect(hasPermission("CASHIER", "receipts:reprint")).toBe(true);
  });

  it("allows managers to view staff and settings without administering them", () => {
    expect(hasPermission("MANAGER", "staff:view")).toBe(true);
    expect(hasPermission("MANAGER", "staff:manage")).toBe(false);
    expect(hasPermission("MANAGER", "settings:view")).toBe(true);
    expect(hasPermission("MANAGER", "settings:manage")).toBe(false);
    expect(hasPermission("MANAGER", "dashboard:reset-sales")).toBe(true);
    expect(hasPermission("CASHIER", "dashboard:reset-sales")).toBe(false);
  });

  it("limits production staff to operational order access", () => {
    expect(hasPermission("PRODUCTION", "orders:update-status")).toBe(true);
    expect(hasPermission("PRODUCTION", "pos:use")).toBe(false);
  });

  it("enforces Phase 3 billing access for every role", () => {
    expect(hasPermission("ADMIN", "invoices:void")).toBe(true);
    expect(hasPermission("MANAGER", "payments:create")).toBe(true);
    expect(hasPermission("MANAGER", "invoices:void")).toBe(true);
    expect(hasPermission("CASHIER", "pos:use")).toBe(true);
    expect(hasPermission("CASHIER", "invoices:void")).toBe(false);
    expect(hasPermission("DESIGNER", "invoices:view")).toBe(false);
    expect(hasPermission("PRODUCTION", "invoices:view")).toBe(false);
  });

  it("centralizes Phase 4 financial and operational boundaries", () => {
    expect(hasPermission("CASHIER", "quotations:convert")).toBe(true);
    expect(hasPermission("CASHIER", "orders:create-invoice")).toBe(true);
    expect(hasPermission("CASHIER", "orders:assign")).toBe(false);
    expect(hasPermission("DESIGNER", "orders:create-invoice")).toBe(false);
    expect(hasPermission("PRODUCTION", "quotations:manage")).toBe(false);
    expect(hasPermission("MANAGER", "orders:cancel")).toBe(true);
  });

  it("enforces the Phase 5 financial policy", () => {
    expect(hasPermission("ADMIN", "expenses:manage")).toBe(true);
    expect(hasPermission("MANAGER", "expenses:manage")).toBe(true);
    expect(hasPermission("CASHIER", "expenses:manage")).toBe(false);
    expect(hasPermission("CASHIER", "cash-register:operate")).toBe(true);
    expect(hasPermission("CASHIER", "cash-register:adjust")).toBe(false);
    expect(hasPermission("MANAGER", "cash-register:adjust")).toBe(true);
    expect(hasPermission("DESIGNER", "cash-register:operate")).toBe(false);
    expect(hasPermission("PRODUCTION", "expenses:manage")).toBe(false);
  });
});
