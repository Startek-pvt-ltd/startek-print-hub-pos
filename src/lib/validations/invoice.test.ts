import { describe, expect, it } from "vitest";
import { invoiceInputSchema } from "./invoice";
import { calculateInvoiceTotals } from "@/domain/financial";

const valid = {
  idempotencyKey: "91dc4a61-a42b-46f7-a9f0-525817aeba7f",
  customerName: "Test Customer", customerPhone: "0771234567", discount: "0",
  items: [{ description: "Banner Printing", quantity: "1", unitPrice: "3500" }],
  initialPayment: { amount: "2000", method: "CASH", reference: "" },
};

describe("invoice input validation", () => {
  it("accepts a new customer and manual item", () => expect(invoiceInputSchema.safeParse(valid).success).toBe(true));
  it("rejects invalid items and incomplete customers", () => {
    expect(invoiceInputSchema.safeParse({ ...valid, items: [{ description: "", quantity: "0", unitPrice: "x" }] }).success).toBe(false);
    expect(invoiceInputSchema.safeParse({ ...valid, customerPhone: "" }).success).toBe(false);
  });
  it("strips manipulated browser totals and calculates authoritative totals", () => {
    const parsed = invoiceInputSchema.parse({ ...valid, subtotal: "0.01", grandTotal: "0.01" });
    expect("subtotal" in parsed).toBe(false);
    expect(calculateInvoiceTotals(parsed.items, parsed.discount).grandTotal.toFixed(2)).toBe("3500.00");
  });
});
