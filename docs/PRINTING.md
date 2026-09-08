# Receipt Printing

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
