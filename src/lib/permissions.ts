import type { Role } from "@/generated/prisma/client";

export const permissions = [
  "dashboard:view",
  "pos:use",
  "invoices:view",
  "payments:create",
  "orders:view",
  "orders:update-status", "orders:edit", "orders:assign", "orders:cancel", "orders:create-invoice",
  "quotations:manage", "quotations:convert",
  "expenses:manage",
  "cash-register:operate",
  "reports:view",
  "staff:view",
  "staff:manage",
  "settings:view",
  "settings:manage",
  "invoices:void",
  "receipts:reprint",
  "backups:manage",
  "audit:view",
] as const;

export type Permission = (typeof permissions)[number];

const rolePermissions: Record<Role, ReadonlySet<Permission>> = {
  ADMIN: new Set(permissions),
  MANAGER: new Set([
    "dashboard:view", "pos:use", "orders:view", "orders:update-status", "orders:edit", "orders:assign", "orders:cancel", "orders:create-invoice",
    "quotations:manage", "quotations:convert", "expenses:manage", "cash-register:operate",
    "reports:view", "staff:view", "settings:view", "invoices:void",
    "invoices:view", "payments:create", "receipts:reprint", "audit:view",
  ]),
  CASHIER: new Set([
    "dashboard:view", "pos:use", "invoices:view", "payments:create",
    "orders:view", "orders:update-status", "orders:edit", "orders:create-invoice", "quotations:manage", "quotations:convert", "cash-register:operate", "receipts:reprint",
  ]),
  DESIGNER: new Set(["dashboard:view", "orders:view", "orders:update-status"]),
  PRODUCTION: new Set(["dashboard:view", "orders:view", "orders:update-status"]),
};

export function hasPermission(role: Role, permission: Permission) {
  return rolePermissions[role].has(permission);
}
