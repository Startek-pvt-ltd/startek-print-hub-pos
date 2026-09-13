import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReceiptDocument } from "./receipt-document";
import type { ReceiptViewModel } from "@/server/receipt-service";

const baseReceipt: ReceiptViewModel = {
  reprint: false,
  business: { businessName: "Startek Print Hub", address: "No.62 Padukka Road, Meegoda", phonePrimary: "0705935320", phoneSecond: "0777250493", email: "startekprinthub@gmail.com", receiptFooter: "Design & Deploy by Startek (PVT) LTD" },
  invoiceNumber: "SPH-INV-000123",
  createdAt: "2026-09-13T04:30:00.000Z",
  cashier: "Test Cashier",
  customerName: "Test Customer",
  customerPhone: "0771234567",
  status: "FINALIZED",
  items: [{ description: "A long manual print description that remains fully wrapped", quantity: "1", unitPrice: "940.00", amount: "940.00" }],
  subtotal: "940.00",
  discount: "0.00",
  total: "940.00",
  paid: "940.00",
  outstanding: "0.00",
  payments: [{ method: "CASH", amount: "940.00", cashTendered: "1000.00", changeGiven: "60.00", reference: null, reversed: false }],
  order: null,
  footer: "Thank You",
};

describe("receipt document", () => {
  it.each([{ label: "original", reprint: false }, { label: "REPRINT", reprint: true }])("renders the $label receipt without any QR output", ({ reprint }) => {
    const markup = renderToStaticMarkup(<ReceiptDocument receipt={{ ...baseReceipt, reprint }} />);

    expect(markup).not.toMatch(/\bqr\b/i);
    expect(markup).not.toContain("<svg");
    expect(markup).not.toContain("<canvas");
    expect(markup.match(/<img\b/g) ?? []).toHaveLength(1);
    expect(markup).toContain('alt="Startek Print Hub logo"');
    expect(markup.includes("REPRINT")).toBe(reprint);
  });
});
