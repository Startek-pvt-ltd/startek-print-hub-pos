# Printing

## A4 quotations

Quotation print views are formatted for A4 portrait paper and include the Startek Print Hub logo, business contact details, customer snapshot, manual line items, totals, validity, and notes. The quotation screen provides two outputs:

- **Print A4 quotation** opens the operating system print dialog. Select the Canon G3010, A4 paper, portrait orientation, and 100% scale. Browser security requires the user to confirm the printer and settings.
- **Download PDF** creates the same persisted quotation as an A4 PDF on the server and downloads it to the current device. The protected endpoint requires quotation-management permission and does not accept browser-supplied totals.

Long quotations repeat the table header and paginate without splitting a line item. The PDF includes page numbers and the same approved logo stored at `public/brand/startek-logo.png`.

## Receipt printing

## Production architecture

The Xprinter XP-80T is attached by USB to the Windows touch POS computer. The Vercel application cannot access that USB device. The browser sends a controlled receipt job to QZ Tray on the same Windows computer, which submits ESC/POS bytes or a printer-compatible job to the configured XP-80T queue.

```text
Vercel POS -> Windows browser -> QZ Tray -> ESC/POS/Windows queue -> XP-80T USB
```

## Receipt contract

The 80mm receipt includes monochrome branding, business address/phones/email, invoice number and timestamp, cashier, optional customer name/phone, manual items, subtotal, discount, total, complete payment summary, balance, optional order number/due date, QR code, thank-you text, and `Design & Deploy by Startek (PVT) LTD`. Reprints visibly include `REPRINT`.

Receipt content is generated from persisted server data, not browser-editable totals. Text is normalized to the printer-supported character set, line lengths are bounded, and user text cannot inject ESC/POS control bytes.

## QZ Tray controls

The printer phase must configure QZ certificate/signature support for silent printing, restrict allowed origins to the production domain, allow only named templates, and store terminal printer selection locally. It must provide a Settings test print, connection status, useful error messages, retry behavior that cannot duplicate invoices, and a browser print-dialog fallback.

Auto-cut is enabled only after validation with the installed driver/firmware. A receipt reprint audit is committed independently of whether physical printing succeeds, with print outcome metadata where practical.

## Windows setup checklist

1. Install the correct XP-80T Windows driver and print a Windows test page.
2. Install QZ Tray and configure it to start with Windows.
3. Configure the approved signing certificate and production origin.
4. Select the exact Windows printer queue in POS Settings.
5. Run normal, long-description, multi-payment, balance, QR, reprint, and cutter test receipts.
6. Keep the browser print fallback documented for support.

## Phase 6.5 browser and PDF output

Quotation print uses route-scoped `@page quotation` at A4 portrait with 12 mm margins and keeps the approved logo, identity, customer snapshot, number/date, manual items, totals, validity, notes, and footer. Receipt/report rules cannot override it. Operators select A4 and 100% scale in the Canon G3010 dialog; browser code cannot silently force device settings.

Authorized invoice detail pages provide a server-generated A4 PDF containing approved branding, invoice/customer/cashier/order snapshots, manual items, authoritative totals, payment history, cash tender/change, page numbering, and `Design & Deploy by Startek (PVT) LTD`. Long content paginates. Generated acceptance downloads are temporary outputs, not fixtures.

The 80mm browser receipt now includes the approved logo and persisted tender/change. “Finalize & print” uses a consumed one-use autoprint marker; normal navigation/reload does not print again. This is still browser-dialog printing, not QZ Tray, silent ESC/POS, or XP-80T integration.
