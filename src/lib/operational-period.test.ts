import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
import { effectiveOperationalStart, isArchivedOperationalRecord } from "./operational-period";

describe("operational archive boundary", () => {
  const cutoff = new Date("2026-09-19T04:30:00.000Z");

  it("archives only records strictly before the cutoff", () => {
    expect(isArchivedOperationalRecord(new Date("2026-09-19T04:29:59.999Z"), cutoff)).toBe(true);
    expect(isArchivedOperationalRecord(cutoff, cutoff)).toBe(false);
    expect(isArchivedOperationalRecord(new Date("2026-09-19T04:30:00.001Z"), cutoff)).toBe(false);
    expect(isArchivedOperationalRecord(new Date(0), null)).toBe(false);
  });

  it("uses the later of the requested report start and operational cutoff", () => {
    expect(effectiveOperationalStart(new Date("2026-01-01T00:00:00.000Z"), cutoff)).toEqual(cutoff);
    const later = new Date("2026-10-01T00:00:00.000Z");
    expect(effectiveOperationalStart(later, cutoff)).toEqual(later);
  });
});
