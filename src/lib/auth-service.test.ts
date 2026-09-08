import { describe, expect, it, vi } from "vitest";
import { authenticateStaff, validateSessionRecord, type StaffIdentity } from "./auth-service";

const activeUser: StaffIdentity = {
  id: "user-1", name: "Admin", email: "admin@example.com", passwordHash: "hash",
  role: "ADMIN", status: "ACTIVE",
};

function dependencies(user: StaffIdentity | null, passwordMatches: boolean) {
  return {
    findUser: vi.fn().mockResolvedValue(user),
    verifyPassword: vi.fn().mockResolvedValue(passwordMatches),
    writeAudit: vi.fn().mockResolvedValue(undefined),
    dummyPasswordHash: "dummy-hash",
  };
}

describe("staff authentication", () => {
  it("accepts a valid active user and creates a successful audit", async () => {
    const deps = dependencies(activeUser, true);
    await expect(authenticateStaff({ email: activeUser.email, password: "valid", ipAddress: "127.0.0.1" }, deps)).resolves.toEqual(activeUser);
    expect(deps.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ userId: activeUser.id, action: "LOGIN_SUCCEEDED" }));
  });

  it("rejects an invalid password and creates a failed audit", async () => {
    const deps = dependencies(activeUser, false);
    await expect(authenticateStaff({ email: activeUser.email, password: "invalid" }, deps)).resolves.toBeNull();
    expect(deps.writeAudit).toHaveBeenCalledWith(expect.objectContaining({ userId: null, action: "LOGIN_FAILED" }));
  });

  it("rejects a disabled user even with a valid password", async () => {
    const disabled = { ...activeUser, status: "DISABLED" as const };
    await expect(authenticateStaff({ email: disabled.email, password: "valid" }, dependencies(disabled, true))).resolves.toBeNull();
  });

  it("uses a dummy hash when the email does not exist", async () => {
    const deps = dependencies(null, false);
    await authenticateStaff({ email: "missing@example.com", password: "invalid" }, deps);
    expect(deps.verifyPassword).toHaveBeenCalledWith("invalid", "dummy-hash");
  });
});

describe("session validation", () => {
  it("accepts an unexpired active session", () => {
    expect(validateSessionRecord({ expiresAt: new Date("2026-09-08T01:00:00Z"), user: activeUser }, new Date("2026-09-08T00:00:00Z"))).toEqual(activeUser);
  });

  it("rejects expired sessions and sessions for disabled users", () => {
    expect(validateSessionRecord({ expiresAt: new Date("2026-09-07T23:59:59Z"), user: activeUser }, new Date("2026-09-08T00:00:00Z"))).toBeNull();
    expect(validateSessionRecord({ expiresAt: new Date("2026-09-08T01:00:00Z"), user: { ...activeUser, status: "DISABLED" } }, new Date("2026-09-08T00:00:00Z"))).toBeNull();
  });
});
