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

### Phase 4 quotation lifecycle

Quotation statuses are DRAFT, ISSUED, ACCEPTED, REJECTED, EXPIRED, and CONVERTED. Only DRAFT is editable. DRAFT may be issued; ISSUED may be accepted, rejected, or recorded expired; only ACCEPTED may be converted. Rejected, expired, and converted quotations are terminal. Expiry can only be recorded after `validUntil`. Every change appends status history and an audit event.

### Phase 4 order workflow and roles

The normal sequence is PENDING → DESIGNING → WAITING_APPROVAL → APPROVED → PRINTING → FINISHING → READY → DELIVERED. ADMIN and MANAGER may perform normal steps; DESIGNER owns the two design steps; ADMIN/MANAGER/CASHIER approve and deliver; PRODUCTION owns printing through ready. Only ADMIN/MANAGER may cancel. DELIVERED and CANCELLED are terminal.

Assignments reference active User records and are audited. Due-state presentation compares stored calendar dates with the Asia/Colombo shop date; terminal orders are never overdue. Order financial display comes from its quotation until invoiced and solely from the linked Invoice thereafter. Creating that invoice copies snapshots through the Phase 3 calculation service and permits an optional cash advance; later payments remain separate ledger records.

## Cash register

Expected cash equals opening cash plus eligible cash receipts minus cash expenses minus approved cash withdrawals, plus approved cash deposits. Card, bank-transfer, and QR payments never affect drawer cash. Closing records actual cash and difference as actual minus expected. An ordinary user cannot edit a closed session.

Phase 5 uses one primary physical drawer. New cash invoice payments and finalized cash expenses require an OPEN session and explicitly reference it; non-cash transactions do not. Session membership is therefore fixed at transaction creation rather than inferred later. The database locks the session row while adding activity and serializes that activity against closing.

Valid, non-reversed CASH Payment records increase expected cash. A payment retained on a VOID invoice still represents physical cash and remains included unless its PaymentReversal exists. Reversals affecting a session must be recorded while that session is open; a closed reconciliation cannot silently change. Finalized, non-void CASH expenses reduce expected cash. CASH_DEPOSIT adds cash and CASH_WITHDRAWAL subtracts it.

Expenses are finalized immediately and their number, date, category, description, amount, method, creator, and cash-session relation are immutable. ADMIN or MANAGER may void an open-session or non-cash expense with a reason; the original row remains. A cash expense in a closed session cannot be voided because that would rewrite historical reconciliation.

## Time, identity, and audit

All important mutations resolve their actor from the server session. Dates use the shop timezone for business-day grouping. Audit metadata records enough before/after or financial context to explain an action without storing secrets. Important financial/audit history is retained, not physically deleted.

## Dashboard and reporting

- Sales are valid non-VOID finalized invoice grand totals; they are not cash received.
- Payments received are valid, non-reversed Payment ledger entries. Outstanding is each valid invoice grand total less those entries, floored at zero.
- Expenses are finalized non-VOID Expense rows across every payment method.
- Operational net income is Sales minus Expenses. V1 has no COGS allocation, so this is neither gross profit nor a full accounting net-profit statement.
- Inclusive filters use `Asia/Colombo` calendar boundaries while timestamps remain UTC. Weeks run Monday through Sunday.
- Pending is PENDING, DESIGNING, WAITING_APPROVAL, APPROVED, PRINTING, or FINISHING. READY is separate. Overdue means due before today and non-terminal.
- Closed cash reports use stored expected, actual, and difference values; activity details explain but do not replace that reconciliation.

## Phase 6.5 hardening rules

A CASH entry is tendered money, not automatically the ledger amount. Applied payment is the lesser of tendered cash and the current authoritative balance; change is tendered minus applied. Receipt and invoice PDF show all three values, but drawer receipts and paid totals use only applied Payment amounts. CARD, BANK_TRANSFER, and QR payments cannot exceed the outstanding balance.

Resetting “Today’s Sales” changes only the dashboard boundary for the current Asia/Colombo business day. It never deletes or edits a transaction, never changes reports or cash figures, expires on the next business date, and requires ADMIN or MANAGER permission plus an audit record.
