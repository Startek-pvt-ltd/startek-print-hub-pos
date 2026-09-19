import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
import { assertSafeStaffUpdate, StaffOperationError } from "@/server/staff-service";
import { createStaffSchema, resetStaffPasswordSchema, staffRoles } from "./staff";

describe("staff management validation", () => {
  it("accepts only canonical roles and normalizes email", () => {
    expect(staffRoles).toEqual(["ADMIN", "MANAGER", "CASHIER", "DESIGNER", "PRODUCTION"]);
    const parsed = createStaffSchema.parse({
      name: "Test Cashier", email: "  CASHIER@EXAMPLE.COM ", role: "CASHIER", status: "ACTIVE",
      password: "Temporary#123", confirmPassword: "Temporary#123",
    });
    expect(parsed.email).toBe("cashier@example.com");
  });

  it("requires a strong-enough matching temporary/reset password", () => {
    expect(createStaffSchema.safeParse({ name: "Test", email: "test@example.com", role: "CASHIER", status: "ACTIVE", password: "short", confirmPassword: "short" }).success).toBe(false);
    expect(resetStaffPasswordSchema.safeParse({ id: "staff", password: "Temporary#123", confirmPassword: "different#123" }).success).toBe(false);
  });

  it("prevents self-disable and removal of the last active administrator", () => {
    expect(() => assertSafeStaffUpdate({ actorId: "a", targetId: "a", currentRole: "ADMIN", currentStatus: "ACTIVE", nextRole: "ADMIN", nextStatus: "DISABLED", activeAdminCount: 2 })).toThrow(StaffOperationError);
    expect(() => assertSafeStaffUpdate({ actorId: "other", targetId: "a", currentRole: "ADMIN", currentStatus: "ACTIVE", nextRole: "MANAGER", nextStatus: "ACTIVE", activeAdminCount: 1 })).toThrow("At least one active administrator");
  });
});
