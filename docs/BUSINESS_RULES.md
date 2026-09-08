# Business Rules

## Manual billing is permanent in V1

Every invoice, quotation, and order line is manually entered. Required billing fields are description, quantity greater than zero, and non-negative unit price. The server calculates line total as quantity multiplied by unit price, subtotal as the sum of lines, discount under the configured policy, and grand total. Client-submitted totals are display hints only.

Do not add products, SKUs, barcode catalogues, inventory selectors, product search, or product dropdowns. Future raw-material inventory, if approved, remains separate from billing.

## Money and payments

- Currency is LKR and displays as `Rs.` or `LKR` consistently.
- Use fixed-precision decimal arithmetic with an explicit rounding policy.
- Each payment is a separate append-only ledger entry with amount, method, timestamp, staff, and optional reference.
- Valid methods are CASH, CARD, BANK_TRANSFER, and QR.
- Paid total is the sum of successful non-reversed payments. Outstanding balance is grand total minus paid total.
- Overpayment is rejected unless an explicit refund/change workflow is designed and approved.
- Phase 3 rounds line totals and currency to two decimal places using decimal half-up arithmetic. Quantities accept up to three decimal places.
- The only Phase 3 discount is a direct LKR amount between zero and subtotal.

## Invoice lifecycle

A finalized invoice cannot be hard-deleted or silently edited. Authorized voiding requires a non-empty reason and stores actor and timestamp. The original invoice/items remain. Any financial correction uses a reversal/refund record. Normal sales totals exclude void invoices while audit/cancellation reporting includes them.

Voiding does not silently reverse or remove existing payments. Phase 3 preserves those ledger entries; controlled payment reversals are represented separately and a future authorized workflow may create them.

Receipt reprints reproduce the original transaction, visibly show `REPRINT`, and append an audit event. They never generate a new invoice number.

## Phase 3 invoice creation

Customer identity is optional. If either name or phone is supplied, both are required; a matching phone reuses and refreshes the simple customer record while the invoice keeps immutable name/phone snapshots. Invoice finalization validates input, recalculates lines/totals, validates any initial payment, allocates a number, writes all records and audits, and commits as one serializable transaction. Client totals are never accepted as persistence input.

Additional payments re-read the invoice and valid payment ledger inside a serializable transaction. Zero, negative, void-invoice, and overpayment attempts are rejected. Concurrent attempts may cause one transaction to fail safely rather than overpay.

## Workflow

Order statuses are PENDING, DESIGNING, WAITING_APPROVAL, APPROVED, PRINTING, FINISHING, READY, DELIVERED, and CANCELLED. Every transition records previous/new status, actor, and time. Delivered and Cancelled are terminal unless a future privileged correction policy is approved.

Quotation conversion copies the customer and manual item snapshots inside one transaction and marks the quotation Converted. Retyping is not required and conversion cannot occur twice.

## Cash register

Expected cash equals opening cash plus eligible cash receipts minus cash expenses minus approved cash withdrawals, plus approved cash deposits. Card, bank-transfer, and QR payments never affect drawer cash. Closing records actual cash and difference as actual minus expected. An ordinary user cannot edit a closed session.

## Time, identity, and audit

All important mutations resolve their actor from the server session. Dates use the shop timezone for business-day grouping. Audit metadata records enough before/after or financial context to explain an action without storing secrets. Important financial/audit history is retained, not physically deleted.
