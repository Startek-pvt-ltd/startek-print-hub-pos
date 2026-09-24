import { describe, expect, it } from "vitest";
import { loginSchema } from "./auth";

describe("username login validation", () => {
  it("normalizes a username and defaults persistence off", () => {
    expect(loginSchema.parse({ username: "  STAdmin  ", password: "owner-secret" })).toEqual({
      username: "stadmin",
      password: "owner-secret",
      keepSignedIn: false,
    });
  });

  it("does not accept an email address as the login identifier", () => {
    expect(loginSchema.safeParse({ username: "owner@example.com", password: "owner-secret", keepSignedIn: false }).success).toBe(false);
  });

  it("accepts an explicit persistent-session choice", () => {
    expect(loginSchema.parse({ username: "shop.staff", password: "owner-secret", keepSignedIn: true }).keepSignedIn).toBe(true);
  });
});
