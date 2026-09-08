import { describe, expect, it } from "vitest";
import { allocateInvoiceNumber, formatInvoiceNumber } from "./invoice-number";

describe("invoice numbers", () => {
  it("formats the configured prefix and sequence", () => {
    expect(formatInvoiceNumber("SPH-INV", BigInt(1))).toBe("SPH-INV-000001");
    expect(formatInvoiceNumber("SPH-INV", BigInt(42))).toBe("SPH-INV-000042");
  });

  it("rejects invalid sequence values", () => expect(() => formatInvoiceNumber("SPH-INV", BigInt(0))).toThrow());

  it("allocates unique numbers from an atomic increment result", async () => {
    let nextValue = BigInt(1);
    const atomicIncrement = async () => { nextValue += BigInt(1); return nextValue; };
    await expect(allocateInvoiceNumber("SPH-INV", atomicIncrement)).resolves.toBe("SPH-INV-000001");
    await expect(allocateInvoiceNumber("SPH-INV", atomicIncrement)).resolves.toBe("SPH-INV-000002");
  });
});
