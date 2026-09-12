import { describe, expect, it } from "vitest";
import { invoicesVisibleAfterReset } from "./dashboard-sales";

describe("dashboard Today’s Sales display reset", () => {
  const before = { id: "before", createdAt: new Date("2026-09-12T03:00:00Z") };
  const after = { id: "after", createdAt: new Date("2026-09-12T05:00:00Z") };

  it("keeps history intact while hiding invoices at or before the display boundary", () => {
    const history = [before, after];
    expect(invoicesVisibleAfterReset(history, new Date("2026-09-12T04:00:00Z"))).toEqual([after]);
    expect(history).toEqual([before, after]);
  });

  it("shows the full business day when no reset exists for that date", () => {
    expect(invoicesVisibleAfterReset([before, after], null)).toEqual([before, after]);
  });
});
