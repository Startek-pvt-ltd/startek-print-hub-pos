import { describe, expect, it } from "vitest";
import { START_FRESH_CONFIRMATION, startFreshSchema } from "./maintenance";

describe("Start Fresh confirmation", () => {
  it("requires the exact phrase and explicit backup confirmation", () => {
    expect(startFreshSchema.safeParse({ confirmation: START_FRESH_CONFIRMATION, backupConfirmed: true }).success).toBe(true);
    expect(startFreshSchema.safeParse({ confirmation: "start fresh startek", backupConfirmed: true }).success).toBe(false);
    expect(startFreshSchema.safeParse({ confirmation: START_FRESH_CONFIRMATION, backupConfirmed: false }).success).toBe(false);
  });
});
