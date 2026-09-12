import { describe, expect, it } from "vitest";
import { prepareInvoicePlan } from "./invoice-plan";
import { invoiceInputSchema } from "@/lib/validations/invoice";

describe("server invoice preparation", () => {
  it("prepares authoritative customer, item, total, and initial payment values", () => {
    const parsed = invoiceInputSchema.parse({
      idempotencyKey: "91dc4a61-a42b-46f7-a9f0-525817aeba7f",
      customerName: "Test Customer", customerPhone: "0771234567", discount: "500",
      subtotal: "0.01", grandTotal: "0.01",
      items: [{ description: "Banner Printing", quantity: "1", unitPrice: "3500" }, { description: "Design Charge", quantity: "1", unitPrice: "1000" }],
      initialPayment: { amount: "2000", method: "CASH", reference: "" },
    });
    const plan = prepareInvoicePlan(parsed);
    expect(plan.snapshot).toEqual({ name: "Test Customer", phoneNumber: "0771234567" });
    expect(plan.totals.subtotal.toFixed(2)).toBe("4500.00");
    expect(plan.totals.grandTotal.toFixed(2)).toBe("4000.00");
    expect(plan.initialPayment?.amount.toFixed(2)).toBe("2000.00");
    expect(plan.initialPayment?.cashTendered?.toFixed(2)).toBe("2000.00");
    expect(plan.initialPayment?.changeGiven?.toFixed(2)).toBe("0.00");
  });
});
