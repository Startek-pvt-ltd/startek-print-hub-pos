# Phase 3 browser acceptance regression

Run against the approved development database after manual ADMIN sign-in. Retain financial fixtures.

## History filter reset regression

1. Open `/invoices`, search for a known invoice, and submit Filter. Verify only the matching invoice appears.
2. Search its customer snapshot name, then phone. Verify the expected historical snapshots appear.
3. Select Finalized and Paid, set both dates to the invoice's Colombo business date, and submit. Verify the paid rows.
4. Navigate to Invoices using the sidebar. Verify the URL is `/invoices`, search/dates are empty, both selects show All, and all rows return.
5. Select Unpaid and submit; verify every returned row is UNPAID. Repeat for Partial and Void (with invoice status Void).
6. Navigate back to unfiltered history again. Verify controls and results both reset.

This covers the stale uncontrolled-select defect fixed by remounting the form for changed URL filters. The form explicitly submits GET requests to `/invoices`.

## Financial workflow

1. Confirm ADMIN workspace/navigation and account menu, including Sign out. Deferred modules must remain placeholders.
2. Save a harmless printer-name change, refresh, verify persistence, then restore `Xprinter XP-80T`. Verify two settings audits.
3. Create a manual invoice for Phase 3 Test Customer / 0771234567: Banner Printing 1 × 3500 and Design Charge 1 × 1000; cash advance 2000. Verify total 4500 and balance 2500, disabled finalization while pending, and success with an invoice number.
4. Open its detail, reject payment 2501, then accept Bank Transfer 2500. Refresh and verify separate 2000/2500 payments, paid 4500 and outstanding zero. Verify exactly one invoice persisted.
5. Reuse the customer by phone and change its name to Phase 3 Updated Customer. Create a second invoice with quantity 2.5, price 100, discount 50 and cash advance 50. Verify total 200 and balance 150. Record QR 150, verify zero balance and two chronological payments.
6. Verify the first invoice retains Phase 3 Test Customer while the reusable customer has the updated name.
7. Reject a blank void reason. Void the second test invoice with `Phase 3 acceptance test`; verify actor/time/reason and retained items/payments. Verify a second void is unavailable in the UI and rejected by the integration suite.
8. Open the first receipt and verify shop identity, address, phones, email, invoice, timestamp, cashier, customer snapshot, manual items, prices, totals, payment summary, thanks and footer. Reprint must display REPRINT with the same invoice number and append an audit without changing financial data.
9. At 1366 × 768, verify primary navigation, billing inputs/selects/add/remove targets are at least 48px high and finalization is 56px. Also inspect the narrower responsive layout.

Last executed successfully against development PostgreSQL on 2026-09-08, using browser invoices SPH-INV-000019 and SPH-INV-000020. Physical printing is outside this test. Unit/integration permission coverage verifies the other staff roles without creating extra staff accounts.
