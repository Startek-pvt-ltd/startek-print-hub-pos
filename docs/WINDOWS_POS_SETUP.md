# Windows POS Setup

## Phase 6 Vercel Preview testing

This setup is temporary and is only for acceptance testing against the approved DEVELOPMENT Supabase database. It is not approved for production use.

Preview URL:

`https://startek-print-hub-622azeuwc-kevinmenuja11-6769s-projects.vercel.app`

1. Start the Windows touch-screen POS PC.
2. Connect it to the shop internet connection.
3. Open an up-to-date Microsoft Edge or Google Chrome browser.
4. Open the Preview URL above. Vercel Authentication protects this Preview; if Vercel asks for access, sign in with the authorized project-owner account. Never copy an automation-bypass token to the POS PC.
5. When the Startek staff login appears, sign in with the development staff account. Do not save its password in the browser.
6. Confirm the page is the development/testing Preview before entering test data.
7. Test touch navigation in the sidebar and mobile navigation.
8. Test POS Billing, including numeric fields, Add Item, payment controls, validation, and cancellation before finalization unless a deliberate development transaction is required.
9. Test invoice history, invoice detail, and the browser receipt view.
10. Test Orders list/detail, assignment, job information, and permitted workflow controls without changing retained fixtures unnecessarily.
11. Test Quotations list/detail, A4 print view, and PDF download.
12. Test Expenses list/detail and filters.
13. Test Cash Register current session, history, filters, and controls without creating unnecessary drawer movements.
14. Test Reports cards/tables, filters, A4 browser print, and CSV export.
15. Test Settings loads correctly. Do not save changes unless the test specifically requires it.
16. Sign out and confirm the staff login screen returns.

### Touch acceptance checklist

- Sidebar and navigation respond reliably to touch.
- Buttons and primary controls are at least 48px high.
- Numeric fields and the on-screen keyboard are usable.
- Add Item and payment controls are usable.
- Filters work without accidental submissions.
- Order workflow buttons are reachable and clearly labelled.
- Cash-register controls are reachable and clearly labelled.
- Reports and exports are usable.
- No horizontal layout breakage appears at the POS screen's native resolution.

Record the Windows version, browser/version, display resolution, scaling percentage, tester, date, and any failed step with a screenshot that contains no credentials.

### Optional app-like shortcut

For Preview testing in Microsoft Edge, open **Settings and more (…) → More tools → Apps → Install this site as an app**. The installed site can be opened from `edge://apps`.

In Google Chrome, open **More (…) → Cast, save and share → Install page as app** when that option is available.

Do not enable auto-start, kiosk mode, or production login behavior during Phase 6 Preview testing.

### Receipt and printer limitations before Phase 7

Allowed during this test:

- Browser receipt view.
- Browser print dialog when required.
- A4 quotation print/PDF verification.

Not accepted or configured yet:

- QZ Tray.
- XP-80T direct printing.
- ESC/POS commands.
- One-click silent printing.
- QR hardware verification.
- Automatic cutter operation.

Browser receipt printing is not final XP-80T integration. Do not configure QZ Tray or treat this Preview as production.

The current browser receipt uses a system-safe sans-serif stack and a high-contrast 203-DPI-oriented logo. Phase 7 raw ESC/POS output must use the XP-80T built-in font with only simple normal, bold, enlarged-total, and centered-header formatting; arbitrary web fonts are not available to the printer.

Phase 6.5 adds deliberate browser-dialog receipt printing and A4 invoice PDF download. The receipt autoprint marker is consumed once, and invoice finalization is not retried when output fails. On available Canon G3010 hardware, verify quotation/invoice output with A4 paper, portrait orientation, and 100% scale. These checks do not configure or certify the XP-80T USB printer.
