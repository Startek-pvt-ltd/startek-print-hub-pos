# Printing

## Approved receipt architecture

```text
Vercel POS
  -> Windows Edge or Chrome
  -> Browser Print dialog
  -> XP-80T/XP-80C Windows printer driver and queue
  -> USB printer
```

The application never accesses USB, discovers printer queues, polls printer status, or sends raw printer, feed, or cutter commands. Windows and the installed driver own device availability and configuration.

## Browser receipt workflow

Finalization validates and persists the invoice and optional payment exactly once before navigating to the persisted receipt with `?autoprint=1`. After the receipt hydrates, the marker is removed and the browser print dialog is opened once. Reloading the clean URL cannot finalize again or recreate a payment. Cancelling or closing the dialog does not change the invoice.

The receipt page always shows one primary `PRINT RECEIPT` button for manual retry. Reprint first appends its audit event, then opens the original persisted invoice as a visibly marked REPRINT and invokes the same browser print workflow. Printing is output-only.

## 80mm receipt contract

The named receipt print page is isolated from quotation/report A4 styles. It uses 80mm width, zero page/body margins, compact content margins, bottom spacing for usable paper handling, black text on white, and `Arial, Helvetica, system-ui, sans-serif`.

Content includes the approved transparent monochrome asset at `public/branding/startek-print-hub-receipt.png`, the always-present `STARTEK PRINT HUB` text fallback, business contact details, invoice date/time and cashier, optional customer details, wrapped manual items, quantities/unit prices/amounts, subtotal, discount, total, payment history, paid, balance, cash tender/change, linked order details, and footer. Receipts intentionally contain no QR, barcode, code placeholder, SVG, or canvas.

## Windows print-dialog settings

- Destination: the installed XP-80T or XP-80C queue.
- Paper: driver-defined 80mm receipt paper.
- Margins: None or Minimum, as supported.
- Scale: 100%.
- Headers and footers: Off.
- Background graphics: On only if required for logo rendering.

Browsers and drivers expose different option names; the web application cannot force every setting. Automatic cutter and feed behavior, if supported, must be enabled in Windows Printer Preferences rather than the POS.

## Physical acceptance

On 13 September 2026 (Asia/Colombo), the owner confirmed all 13 mandatory browser-print and touchscreen checks passed on the real Startek Print Hub Windows touch POS with the USB-connected Xprinter XP-80T and 80mm paper. The detailed PASS matrix and the metadata available to the repository are recorded in `docs/WINDOWS_POS_SETUP.md`. Receipt QR testing is intentionally excluded by owner decision.

## A4 quotations, reports, and invoices

Quotation print views use A4 portrait, approved branding, customer snapshots, manual lines, totals, validity, and notes. Operators select the Canon G3010, A4 paper, portrait, and 100% scale. The protected quotation PDF route generates the same persisted quotation without accepting browser totals.

Reports use their own route-scoped A4 styles and formula-safe CSV exports. Authorized invoice detail pages provide a server-generated A4 PDF with branding, persisted items/totals/payment history, cash tender/change, footer, and page numbering. Receipt CSS cannot override these A4 outputs.
