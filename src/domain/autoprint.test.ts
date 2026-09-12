import { describe, expect, it } from "vitest";
import { consumeAutoprintUrl } from "./autoprint";

describe("one-time receipt autoprint", () => {
  it("consumes the explicit marker and preserves unrelated query state", () => {
    expect(consumeAutoprintUrl("https://pos.test/invoices/1/receipt?autoprint=1&reprint=a#top")).toBe("/invoices/1/receipt?reprint=a#top");
  });

  it("does not print without the marker, including after marker removal", () => {
    expect(consumeAutoprintUrl("https://pos.test/invoices/1/receipt")).toBeNull();
  });
});
