import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { buildReceiptViewModel } from "@/server/receipt-service";

export type InvoicePdfData = ReturnType<typeof buildReceiptViewModel>;

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 42;
const BLUE = rgb(0.025, 0.106, 0.243);
const SLATE = rgb(0.22, 0.27, 0.34);
const LIGHT = rgb(0.94, 0.96, 0.98);

function printable(value: string) {
  return value.replace(/[–—]/g, "-").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function wrap(value: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const character of printable(value)) {
    if (line && font.widthOfTextAtSize(line + character, size) > width) {
      lines.push(line);
      line = "";
    }
    line += character;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export async function generateInvoicePdf(data: InvoicePdfData, logoBytes: Uint8Array) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(logoBytes);
  let page!: PDFPage;
  let y = 0;

  function addPage(continued = false) {
    page = pdf.addPage(A4);
    y = A4[1] - MARGIN;
    if (continued) {
      page.drawText(`${printable(data.invoiceNumber)} - continued`, { x: MARGIN, y, size: 10, font: bold, color: BLUE });
      y -= 26;
    }
  }
  function line(value: string, options: { bold?: boolean; size?: number; color?: typeof BLUE; indent?: number; width?: number } = {}) {
    const font = options.bold ? bold : regular;
    const size = options.size ?? 9.5;
    const indent = options.indent ?? 0;
    for (const text of wrap(value, font, size, options.width ?? A4[0] - MARGIN * 2 - indent)) {
      if (y < 62) addPage(true);
      page.drawText(text, { x: MARGIN + indent, y, size, font, color: options.color ?? SLATE });
      y -= size + 5;
    }
  }
  function amount(label: string, value: string, strong = false) {
    if (y < 80) addPage(true);
    page.drawText(label, { x: 345, y, size: strong ? 11 : 9.5, font: strong ? bold : regular, color: BLUE });
    const formatted = `Rs. ${printable(value)}`;
    page.drawText(formatted, { x: A4[0] - MARGIN - bold.widthOfTextAtSize(formatted, strong ? 11 : 9.5), y, size: strong ? 11 : 9.5, font: bold, color: BLUE });
    y -= strong ? 22 : 17;
  }

  addPage();
  page.drawImage(logo, { x: MARGIN, y: y - 72, width: 72, height: 72 });
  page.drawText(printable(data.business.businessName), { x: 126, y: y - 20, size: 18, font: bold, color: BLUE });
  page.drawText(printable(data.business.address), { x: 126, y: y - 39, size: 9, font: regular, color: SLATE });
  page.drawText(printable(`${data.business.phonePrimary} / ${data.business.phoneSecond} | ${data.business.email}`), { x: 126, y: y - 54, size: 8.5, font: regular, color: SLATE });
  y -= 88;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: A4[0] - MARGIN, y }, thickness: 3, color: rgb(0.02, 0.55, 0.85) });
  y -= 34;
  line(`INVOICE ${data.invoiceNumber}`, { bold: true, size: 18, color: BLUE });
  line(`Date: ${new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" }).format(new Date(data.createdAt))}`);
  line(`Cashier: ${data.cashier}`);
  line(`Customer: ${data.customerName ?? "Walk-in customer"}`);
  if (data.customerPhone) line(`Phone: ${data.customerPhone}`);
  if (data.order) {
    line(`Order: ${data.order.orderNumber}${data.order.jobName ? ` | ${data.order.jobName}` : ""}`);
    if (data.order.dueDate) line(`Order due: ${data.order.dueDate}`);
  }
  if (data.status === "VOID") line("VOID DOCUMENT", { bold: true, size: 13, color: rgb(0.75, 0.05, 0.12) });
  y -= 10;
  page.drawRectangle({ x: MARGIN, y: y - 22, width: A4[0] - MARGIN * 2, height: 24, color: BLUE });
  for (const [label, x] of [["DESCRIPTION", MARGIN + 8], ["QTY", 330], ["UNIT PRICE", 385], ["AMOUNT", 489]] as const) {
    page.drawText(label, { x, y: y - 14, size: 8, font: bold, color: rgb(1, 1, 1) });
  }
  y -= 28;
  data.items.forEach((item, index) => {
    const descriptionLines = wrap(item.description, regular, 9.5, 265);
    const height = Math.max(28, descriptionLines.length * 12 + 12);
    if (y - height < 200) {
      addPage(true);
      page.drawRectangle({ x: MARGIN, y: y - 22, width: A4[0] - MARGIN * 2, height: 24, color: BLUE });
      page.drawText("DESCRIPTION", { x: MARGIN + 8, y: y - 14, size: 8, font: bold, color: rgb(1, 1, 1) });
      y -= 28;
    }
    page.drawRectangle({ x: MARGIN, y: y - height + 4, width: A4[0] - MARGIN * 2, height, color: index % 2 ? rgb(1, 1, 1) : LIGHT });
    descriptionLines.forEach((text, lineIndex) => page.drawText(text, { x: MARGIN + 8, y: y - 13 - lineIndex * 12, size: 9.5, font: regular, color: SLATE }));
    page.drawText(printable(item.quantity), { x: 330, y: y - 13, size: 9.5, font: regular, color: SLATE });
    page.drawText(`Rs. ${printable(item.unitPrice)}`, { x: 385, y: y - 13, size: 9.5, font: regular, color: SLATE });
    const itemAmount = `Rs. ${printable(item.amount)}`;
    page.drawText(itemAmount, { x: A4[0] - MARGIN - 8 - bold.widthOfTextAtSize(itemAmount, 9.5), y: y - 13, size: 9.5, font: bold, color: BLUE });
    y -= height;
  });
  if (y < 215) addPage(true);
  y -= 12;
  amount("Subtotal", data.subtotal);
  amount("Discount", data.discount);
  amount("TOTAL", data.total, true);
  amount("Paid", data.paid);
  amount("Outstanding", data.outstanding, true);
  y -= 8;
  line("PAYMENTS", { bold: true, color: BLUE });
  if (!data.payments.length) line("No payments recorded.");
  for (const payment of data.payments) {
    line(`${payment.method.replaceAll("_", " ")} | Rs. ${payment.amount}${payment.reversed ? " | REVERSED" : ""}`);
    if (!payment.reversed && payment.cashTendered) line(`Cash tendered: Rs. ${payment.cashTendered} | Change: Rs. ${payment.changeGiven ?? "0.00"}`, { indent: 12, size: 9 });
    if (payment.reference) line(`Reference: ${payment.reference}`, { indent: 12, size: 9 });
  }
  const pages = pdf.getPages();
  pages.forEach((sheet, index) => {
    sheet.drawLine({ start: { x: MARGIN, y: 38 }, end: { x: A4[0] - MARGIN, y: 38 }, thickness: 0.5, color: rgb(0.75, 0.78, 0.82) });
    sheet.drawText("Design & Deploy by Startek (PVT) LTD", { x: MARGIN, y: 22, size: 8, font: regular, color: SLATE });
    const pageLabel = `Page ${index + 1} of ${pages.length}`;
    sheet.drawText(pageLabel, { x: A4[0] - MARGIN - regular.widthOfTextAtSize(pageLabel, 8), y: 22, size: 8, font: regular, color: SLATE });
  });
  pdf.setTitle(`Invoice ${data.invoiceNumber}`);
  pdf.setAuthor("Startek Print Hub");
  pdf.setSubject("Persisted invoice document");
  return pdf.save();
}
