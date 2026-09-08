import { describe, expect, it } from "vitest";
import { assertAuthenticated, assertPermission, assertRole, AuthenticationRequiredError, AuthorizationDeniedError } from "./authorization";

describe("protected access", () => {
  it("requires an authenticated principal", () => {
    expect(() => assertAuthenticated(null)).toThrow(AuthenticationRequiredError);
    expect(assertAuthenticated({ id: "1", role: "CASHIER" })).toEqual({ id: "1", role: "CASHIER" });
  });

  it("enforces allowed roles", () => {
    expect(assertRole({ id: "1", role: "ADMIN" }, ["ADMIN", "MANAGER"])).toBeTruthy();
    expect(() => assertRole({ id: "2", role: "CASHIER" }, ["ADMIN"])).toThrow(AuthorizationDeniedError);
  });

  it("authorizes settings changes only for administrators", () => {
    expect(assertPermission({ id: "1", role: "ADMIN" }, "settings:manage")).toBeTruthy();
    expect(() => assertPermission({ id: "2", role: "MANAGER" }, "settings:manage")).toThrow(AuthorizationDeniedError);
  });
});
