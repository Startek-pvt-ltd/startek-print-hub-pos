# Windows POS Setup

## Development Preview

This procedure is for acceptance testing against the approved DEVELOPMENT Supabase database. It is not a production approval.

Preview URL:

`https://startek-print-hub-py762azut-kevinmenuja11-6769s-projects.vercel.app`

1. Start the Windows touch POS and connect it to the shop internet connection.
2. Open a current Microsoft Edge or Google Chrome browser.
3. Open the Preview URL and complete Vercel Authentication with the authorized owner account if prompted. Never copy automation bypass tokens to the POS.
4. Sign in with an authorized development staff account without saving its password.
5. Confirm the page is the development/testing Preview before entering test data.

## XP-80T/XP-80C browser printing

1. Connect and power on the XP-80T by USB with 80mm paper loaded.
2. Install the correct XP-80T/XP-80C Windows driver for the exact Windows version.
3. Open Windows Settings → Bluetooth & devices → Printers & scanners and confirm the queue appears.
4. Print a Windows test page. Stop and correct the driver/USB connection if it fails.
5. Open Startek POS in Edge or Chrome and sign in.
6. Create or open a persisted invoice receipt.
7. Press `PRINT RECEIPT`.
8. In the browser dialog, select the installed XP-80T/XP-80C queue.
9. Select the driver-defined 80mm receipt paper.
10. Set margins to None or Minimum where supported.
11. Set scale to 100% and turn browser headers and footers Off.
12. Enable background graphics only if the logo does not otherwise render.
13. Print and verify width, clipping, alignment, and bottom spacing.
14. Verify the monochrome logo is clear, centered, proportioned, and background-free.
15. Print a long-description receipt and confirm text wraps without clipping amounts.
16. Print a many-item receipt and confirm content is complete with minimal wasted paper.
17. Print a Rs. 940 invoice paid with Rs. 1,000 cash and confirm Rs. 940 applied, Rs. 60 change, and Rs. 0 balance.
18. Verify partial-payment and multiple-payment receipts.
19. Reprint and confirm REPRINT, the original invoice number, totals, and payments.
20. Verify Finalize & print opens the dialog only after the invoice succeeds and does not duplicate records on reload.
21. Cancel the browser dialog and confirm the invoice/payment remain unchanged; press `PRINT RECEIPT` to retry manually.
22. If the driver supports an automatic cutter or extra feed, configure it in Windows Printer Preferences. The POS does not send raw cut/feed commands.

Exact dialog and driver option names vary. The web application cannot silently select a queue, paper size, margins, scale, feed, or cutter.

## Touch acceptance

Verify touch navigation and the complete workflow for POS entry, numeric fields, payment controls, Finalize, Print Receipt, Orders, Expenses, Cash Register, Reports, Settings → Receipt printing, and Settings → Backup & Restore. Primary controls must remain at least 48px high with no horizontal layout breakage at the native resolution/scaling.

Record PASS/FAIL for the Windows test page, one-item receipt, long description, many items, cash tender/change, partial payment, multiple payments, REPRINT, logo, finalize/autoprint, manual print, cancel safety, and touchscreen workflow. Also record Windows/browser versions, display resolution/scaling, driver/firmware, queue name, tester/date, and credential-free screenshots. Do not claim XP-80T acceptance until every mandatory physical result passes.

## Phase 7 physical acceptance record

The owner confirmed physical acceptance on 13 September 2026 (Asia/Colombo) using the real Startek Print Hub Windows touch POS and its USB-connected Xprinter XP-80T with 80mm paper. Printing used the approved Windows browser print-dialog path and installed XP-80T/XP-80C driver; no QZ Tray, direct USB access, or raw ESC/POS path was used.

| Metadata | Recorded value |
| --- | --- |
| Site | Startek Print Hub |
| Test device | Real shop Windows touch POS |
| Operating system | Microsoft Windows; exact edition/build not supplied in the owner acceptance message |
| Browser | Windows browser print workflow; exact Edge/Chrome product and build not supplied in the owner acceptance message |
| Display | Real POS touchscreen at its operating resolution/scaling; exact values not supplied in the owner acceptance message |
| Printer | Xprinter XP-80T |
| Connection | USB through the installed Windows printer driver and queue |
| Driver / firmware | XP-80T/XP-80C-compatible Windows driver installed; exact driver and firmware versions not supplied in the owner acceptance message |
| Queue | Installed XP-80T Windows queue; exact queue label not supplied in the owner acceptance message |
| Paper / dialog | 80mm receipt paper, browser print dialog, receipt layout at 100% scale |
| Tester / authority | Startek Print Hub owner |
| Test date | 13 September 2026, Asia/Colombo |
| Overall result | PASS |

| Mandatory physical browser-print test | Result |
| --- | --- |
| Windows printer test page | PASS |
| One-item receipt | PASS |
| Long-description receipt | PASS |
| Many-item receipt | PASS |
| Rs. 940 invoice / Rs. 1,000 tender / Rs. 60 change | PASS |
| Partial payment | PASS |
| Multiple payments | PASS |
| REPRINT | PASS |
| Logo | PASS |
| Finalize → automatic browser print dialog | PASS |
| Manual `PRINT RECEIPT` | PASS |
| Cancel print dialog without financial mutation | PASS |
| Windows touchscreen workflow | PASS |

Receipt QR testing is not part of acceptance because receipt QR output was removed by owner decision. The owner-confirmed PASS record certifies the physical Phase 7 browser-print workflow only; it is not a Production deployment approval.

## Optional app-like shortcut

In Edge use Settings and more (…) → Apps → Install this site as an app. In Chrome use More (…) → Cast, save and share → Install page as app when available. This does not change browser printing or printer security.

Canon G3010 quotation and invoice output remains A4 portrait at 100% scale and is not XP-80T evidence.

## Production Windows go-live

Production URL:

`https://startek-print-hub-pos.vercel.app`

1. Remove or clearly relabel the old Preview shortcut; do not use Preview for real transactions.
2. Open the Production URL in current Edge or Chrome and verify HTTPS before signing in.
3. Install/update the site app or shortcut so Start, taskbar, and desktop entries point to Production.
4. Confirm the XP-80T queue and Windows test page, then use the existing 80mm, 100%, no-header/footer settings.
5. Sign in with the production ADMIN, verify navigation and settings, and deliberately open the first register with actual opening cash.
6. Complete the production acceptance matrix below. Do not fabricate unnecessary records or leave a fake cash session open.
7. If a controlled invoice is created, retain it or use the authorized void workflow with reason `Production go-live test`; never delete it.

## Phase 8 production acceptance record

Automated HTTPS, ADMIN login/logout, secure-cookie, route, Settings, Reports CSV, backup-validation, migration, and connection checks passed on 13 September 2026. On 14 September 2026, the owner confirmed every mandatory Production check below passed on the real Startek Print Hub Windows touch POS and USB-connected Xprinter XP-80T. Exact Windows/browser/display/driver versions were not supplied; the accepted device, browser-print path, and hardware are the same shop equipment certified during Phase 7.

| Production metadata | Recorded value |
| --- | --- |
| Site / operator | Startek Print Hub / owner |
| Test device | Real shop Windows touch POS |
| Operating system | Microsoft Windows; exact edition/build not supplied |
| Browser | Current Windows Edge/Chrome browser-print workflow; exact build not supplied |
| Display | Shop touchscreen at its operating resolution/scaling; exact values not supplied |
| Printer / connection | Xprinter XP-80T, USB through the installed Windows queue |
| Driver / firmware | XP-80T/XP-80C-compatible Windows driver; exact versions not supplied |
| Paper / dialog | 80mm receipt paper, 100% scale, headers/footers off |
| Test date | 14 September 2026, Asia/Colombo |
| Overall result | PASS |

| Production physical test | Current result |
| --- | --- |
| Production URL replaces Preview shortcut | PASS |
| HTTPS and production ADMIN login on Windows | PASS |
| Windows XP-80T test page | PASS |
| One-item production receipt | PASS |
| Long-description and many-item receipts | PASS |
| Cash tender/change, partial, and multiple payments | PASS |
| REPRINT, logo, 80mm alignment, and no receipt QR | PASS |
| Finalize → automatic browser print dialog | PASS |
| Manual `PRINT RECEIPT` and cancelled-dialog safety | PASS |
| Touchscreen workflow and production navigation | PASS |
| Real opening cash / register reconciliation and close | PASS |

On 19 September 2026, the owner also reported all workflows operating correctly after go-live. The Production function region was then moved from Washington (`iad1`) to Mumbai (`bom1`) to reduce click-to-render latency without changing financial behavior or the printing boundary.

## V1.0.1 Windows maintenance acceptance (pending Production deployment)

On the real touchscreen, ADMIN must verify the 48px Staff and Danger Zone controls, create one temporary CASHIER, sign in as that CASHIER, confirm permitted POS access and denial of Staff mutation/Start Fresh, then sign back in as ADMIN and disable the test account. Disabled login must fail and the test account must not remain active. Start Fresh must be checked only after the backup/dump and closed-register gate; it must not be executed merely to test the UI. Re-run a normal and REPRINT XP-80T receipt to prove the maintenance release did not regress browser printing. Record metadata and PASS/FAIL here only after the owner performs these Production checks.
