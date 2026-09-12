import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { generateInvoicePdf, type InvoicePdfData } from "./invoice-pdf";

const base: InvoicePdfData = {
  reprint: false,
  invoiceNumber: "SPH-INV-000001",
  createdAt: "2026-09-10T08:00:00Z",
  cashier: "Administrator",
  customerName: "Sample customer",
  customerPhone: "0771234567",
  status: "FINALIZED",
  subtotal: "940.00",
  discount: "0.00",
  total: "940.00",
  paid: "940.00",
  outstanding: "0.00",
  footer: "Thank You",
  business: { businessName: "Startek Print Hub", address: "No.62 Padukka Road, Meegoda", phonePrimary: "0705935320", phoneSecond: "0777250493", email: "startekprinthub@gmail.com", receiptFooter: "Thank you" },
  order: { orderNumber: "SPH-ORD-000001", jobName: "Banner", dueDate: "2026-09-12" },
  items: [{ description: "A4 colour printing", quantity: "10", unitPrice: "94.00", amount: "940.00" }],
  payments: [{ method: "CASH", amount: "940.00", cashTendered: "1000.00", changeGiven: "60.00", reference: null, reversed: false }],
};

describe("invoice PDF", () => {
  it("creates a branded A4 invoice from persisted values", async () => {
    const logo = await readFile(path.join(process.cwd(), "public", "brand", "startek-logo.png"));
    const bytes = await generateInvoicePdf(base, logo);
    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getTitle()).toBe("Invoice SPH-INV-000001");
    expect(pdf.getAuthor()).toBe("Startek Print Hub");
    for (const page of pdf.getPages()) {
      expect(page.getWidth()).toBeCloseTo(595.28, 1);
      expect(page.getHeight()).toBeCloseTo(841.89, 1);
    }
  });

  it("paginates many long manual items without changing the invoice identity", async () => {
    const logo = await readFile(path.join(process.cwd(), "public", "brand", "startek-logo.png"));
    const bytes = await generateInvoicePdf({ ...base, items: Array.from({ length: 80 }, (_, index) => ({ description: `Long manual print description ${index + 1} ${"detail ".repeat(18)}`, quantity: "1", unitPrice: "10.00", amount: "10.00" })) }, logo);
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
    expect(pdf.getTitle()).toBe("Invoice SPH-INV-000001");
  });
});
