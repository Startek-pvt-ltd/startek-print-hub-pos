import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { generateQuotationPdf } from "./quotation-pdf";

describe("quotation PDF", () => {
  it("creates a valid paginated A4 document", async () => {
    const logo = await readFile(
      path.join(process.cwd(), "public", "brand", "startek-logo.png"),
    );
    const bytes = await generateQuotationPdf(
      {
        quotationNumber: "SPH-QT-TEST",
        createdAt: new Date("2026-09-08T04:30:00.000Z"),
        customerName: "Test Customer",
        customerPhone: "077 123 4567",
        validUntil: new Date("2026-09-30T00:00:00.000Z"),
        notes: "Prices are valid until the date shown above.",
        subtotal: "40000.00",
        discount: "1000.00",
        grandTotal: "39000.00",
        business: {
          name: "Startek Print Hub",
          address: "No.62 Padukka Road, Meegoda",
          phones: "011 275 0123 / 077 123 4567",
          email: "startekprinthub@gmail.com",
        },
        items: Array.from({ length: 40 }, (_, index) => ({
          description: `Printed item ${index + 1} with a sufficiently descriptive manual line`,
          quantity: "1",
          unitPrice: "1000.00",
          lineTotal: "1000.00",
        })),
      },
      logo,
    );

    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("%PDF");
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBeGreaterThan(1);
    for (const page of document.getPages()) {
      expect(page.getWidth()).toBeCloseTo(595.28, 1);
      expect(page.getHeight()).toBeCloseTo(841.89, 1);
    }
  });
});
