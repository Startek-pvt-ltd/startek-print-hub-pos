import { describe, expect, it, vi } from "vitest";
import { triggerBrowserPrint } from "./browser-printing";

describe("browser receipt printing", () => {
  it("invokes the browser print workflow without a financial callback", () => {
    const print = vi.fn();

    triggerBrowserPrint(print);

    expect(print).toHaveBeenCalledOnce();
  });
});
