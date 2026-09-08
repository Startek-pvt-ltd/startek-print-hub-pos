import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import { buildReceiptViewModel } from "./receipt-service";

describe("persisted receipt view model", () => {
  it("keeps the invoice number, authoritative totals, and visible reprint flag", () => {
    const invoice = {
      id: "invoice-1", invoiceNumber: "SPH-INV-000001", createdAt: new Date("2026-09-07T04:30:00Z"), status: "FINALIZED",
      customerNameSnapshot: "Test Customer", customerPhoneSnapshot: "0771234567",
      subtotal: new Decimal(4500), discount: new Decimal(0), grandTotal: new Decimal(4500),
      createdBy: { name: "Admin" },
      items: [{ description: "Banner Printing", quantity: new Decimal(1), unitPrice: new Decimal(3500), lineTotal: new Decimal(3500) }, { description: "Design Charge", quantity: new Decimal(1), unitPrice: new Decimal(1000), lineTotal: new Decimal(1000) }],
      payments: [{ method: "CASH", amount: new Decimal(2000), reference: null, reversal: null }],
    } as unknown as Parameters<typeof buildReceiptViewModel>[0];
    const settings = { businessName: "Startek Print Hub", address: "No.62 Padukka Road, Meegoda", phonePrimary: "0705935320", phoneSecond: "0777250493", email: "startekprinthub@gmail.com", receiptFooter: "Design & Deploy by Startek (PVT) LTD" };
    const receipt = buildReceiptViewModel(invoice, settings, true);
    expect(receipt.invoiceNumber).toBe("SPH-INV-000001");
    expect(receipt.reprint).toBe(true);
    expect(receipt.total).toBe("4500.00");
    expect(receipt.paid).toBe("2000.00");
    expect(receipt.outstanding).toBe("2500.00");
  });
});
