# Phase 4 authenticated browser acceptance

Run against the approved DEVELOPMENT Supabase project with an authenticated local session.

- Create a quotation for Sample Print Customer / 0775551234 with Business Cards (500 × Rs. 8.00), Banner Printing (1 × Rs. 3,500.00), and Rs. 500.00 discount. Verify subtotal Rs. 7,500.00 and total Rs. 7,000.00.
- Exercise draft save/edit, issue, acceptance/rejection on separate records, search/filter, detail, and A4 print view.
- Convert the accepted quotation once. Verify the SPH-ORD number, snapshots, PENDING initial state, quotation relationship, and duplicate-conversion error.
- Edit print-job fields, assignment, and due date. Exercise order search/status/due/assignee filters and overdue/today/ready highlighting.
- Run the exact workflow through DELIVERED using permitted roles; verify history and terminal protection. Cancel a separate order and verify it remains visible with history.
- Create one linked invoice with a Rs. 2,000.00 cash advance, record the Rs. 5,000.00 balance in the Phase 3 ledger, and verify the order derives paid/outstanding from the invoice. Verify a second invoice is rejected.
- Regression-check login, settings, POS billing, invoice creation/history/detail, payment, outstanding balance, void, receipt, and reprint.
- Confirm controls are at least 48 px, pending states disable repeat actions, terminal/destructive actions confirm, pages are usable at touch-desktop and narrow widths, and no framework error overlay appears.
