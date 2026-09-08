import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 42;
const BLUE = rgb(0.025, 0.106, 0.243);
const CYAN = rgb(0.02, 0.55, 0.85);
const SLATE = rgb(0.22, 0.27, 0.34);
const LIGHT = rgb(0.94, 0.96, 0.98);

export type QuotationPdfData = {
  quotationNumber: string; createdAt: Date; customerName: string; customerPhone: string;
  validUntil: Date | null; notes: string | null; subtotal: string; discount: string; grandTotal: string;
  business: { name: string; address: string; phones: string; email: string };
  items: Array<{ description: string; quantity: string; unitPrice: string; lineTotal: string }>;
};

function printable(value: string) {
  return value.replaceAll("–", "-").replaceAll("—", "-").replaceAll("×", "x").replaceAll("→", "->").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}
function wrap(value: string, font: PDFFont, size: number, width: number) {
  const words = printable(value).split(/\s+/).filter(Boolean); const lines: string[] = []; let line = "";
  for (const word of words) { const candidate = line ? `${line} ${word}` : word; if (font.widthOfTextAtSize(candidate, size) <= width) line = candidate; else { if (line) lines.push(line); line = word; } }
  if (line) lines.push(line); return lines.length ? lines : [""];
}

export async function generateQuotationPdf(data: QuotationPdfData, logoBytes: Uint8Array) {
  const pdf = await PDFDocument.create(); const regular = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold); const logo = await pdf.embedPng(logoBytes);
  let page!: PDFPage; let y = 0;
  function addPage(continued = false) { page = pdf.addPage(A4); y = A4[1] - MARGIN; if (continued) { page.drawText(`${printable(data.quotationNumber)} - continued`, { x: MARGIN, y, size: 10, font: bold, color: BLUE }); y -= 24; } }
  function text(value: string, x: number, size = 10, font = regular, color = SLATE) { page.drawText(printable(value), { x, y, size, font, color }); }
  function tableHeader() { page.drawRectangle({ x: MARGIN, y: y - 22, width: A4[0] - MARGIN * 2, height: 24, color: BLUE }); for (const [label, x] of [["DESCRIPTION", MARGIN + 8], ["QTY", 330], ["UNIT PRICE", 385], ["AMOUNT", 489]] as const) page.drawText(label, { x, y: y - 14, size: 8, font: bold, color: rgb(1, 1, 1) }); y -= 28; }
  addPage();
  page.drawImage(logo, { x: MARGIN, y: y - 72, width: 72, height: 72 });
  page.drawText(printable(data.business.name), { x: 126, y: y - 20, size: 18, font: bold, color: BLUE });
  page.drawText(printable(data.business.address), { x: 126, y: y - 39, size: 9, font: regular, color: SLATE });
  page.drawText(printable(`${data.business.phones} | ${data.business.email}`), { x: 126, y: y - 54, size: 8.5, font: regular, color: SLATE });
  y -= 88; page.drawLine({ start: { x: MARGIN, y }, end: { x: A4[0] - MARGIN, y }, thickness: 3, color: CYAN }); y -= 35;
  text("QUOTATION", MARGIN, 22, bold, BLUE); page.drawText(printable(data.quotationNumber), { x: A4[0] - MARGIN - bold.widthOfTextAtSize(data.quotationNumber, 12), y: y + 4, size: 12, font: bold, color: BLUE }); y -= 32;
  text("QUOTATION FOR", MARGIN, 8, bold); text("DATE", 390, 8, bold); y -= 16;
  text(data.customerName, MARGIN, 12, bold, BLUE); text(new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeZone: "Asia/Colombo" }).format(data.createdAt), 390, 10); y -= 17;
  text(data.customerPhone, MARGIN, 10); text(`Valid until: ${data.validUntil ? data.validUntil.toISOString().slice(0, 10) : "Not specified"}`, 390, 9); y -= 30; tableHeader();
  data.items.forEach((item, itemIndex) => {
    const lines = wrap(item.description, regular, 9.5, 265); const height = Math.max(28, lines.length * 12 + 12); if (y - height < 155) { addPage(true); tableHeader(); }
    page.drawRectangle({ x: MARGIN, y: y - height + 4, width: A4[0] - MARGIN * 2, height, color: itemIndex % 2 ? rgb(1, 1, 1) : LIGHT });
    lines.forEach((line, index) => page.drawText(line, { x: MARGIN + 8, y: y - 13 - index * 12, size: 9.5, font: regular, color: SLATE }));
    page.drawText(printable(item.quantity), { x: 330, y: y - 13, size: 9.5, font: regular, color: SLATE }); page.drawText(`Rs. ${printable(item.unitPrice)}`, { x: 385, y: y - 13, size: 9.5, font: regular, color: SLATE });
    const amount = `Rs. ${printable(item.lineTotal)}`; page.drawText(amount, { x: A4[0] - MARGIN - 8 - bold.widthOfTextAtSize(amount, 9.5), y: y - 13, size: 9.5, font: bold, color: BLUE }); y -= height;
  });
  if (y < 155) addPage(true); y -= 14; const totalsX = 365;
  for (const [label, value, strong] of [["Subtotal", data.subtotal, false], ["Discount", data.discount, false], ["Grand total", data.grandTotal, true]] as const) { if (strong) page.drawLine({ start: { x: totalsX, y: y + 14 }, end: { x: A4[0] - MARGIN, y: y + 14 }, thickness: 1.5, color: BLUE }); page.drawText(label, { x: totalsX, y, size: strong ? 11 : 9.5, font: strong ? bold : regular, color: BLUE }); const amount = `Rs. ${value}`; page.drawText(amount, { x: A4[0] - MARGIN - bold.widthOfTextAtSize(amount, strong ? 11 : 9.5), y, size: strong ? 11 : 9.5, font: bold, color: BLUE }); y -= strong ? 24 : 19; }
  if (data.notes) { y -= 6; page.drawText("NOTES", { x: MARGIN, y, size: 8, font: bold, color: BLUE }); y -= 15; for (const line of wrap(data.notes, regular, 9, A4[0] - MARGIN * 2)) { if (y < 55) addPage(true); page.drawText(line, { x: MARGIN, y, size: 9, font: regular, color: SLATE }); y -= 12; } }
  const pages = pdf.getPages(); pages.forEach((current, index) => { current.drawLine({ start: { x: MARGIN, y: 35 }, end: { x: A4[0] - MARGIN, y: 35 }, thickness: 0.5, color: rgb(0.75, 0.78, 0.82) }); current.drawText("Thank you for choosing Startek Print Hub", { x: MARGIN, y: 20, size: 8, font: regular, color: SLATE }); const label = `Page ${index + 1} of ${pages.length}`; current.drawText(label, { x: A4[0] - MARGIN - regular.widthOfTextAtSize(label, 8), y: 20, size: 8, font: regular, color: SLATE }); });
  return pdf.save();
}
