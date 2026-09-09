# Database Design

## Phase 1 schema

The first migration creates five foundation tables.

| Table | Purpose | Retention |
| --- | --- | --- |
| `users` | Staff identity, password hash, role, status | Disable rather than delete once referenced |
| `sessions` | Hashed opaque login sessions and expiry | May be purged after expiry |
| `settings` | Single-row business and numbering configuration | Update transactionally and audit changes |
| `number_counters` | Concurrency-safe business-number counters | Never derive numbers with count plus one |
| `audit_logs` | Actor, action, entity, metadata, IP, time | Append-only |

Foundation migrations are:

- `prisma/migrations/202609070001_foundation/migration.sql` — users, sessions, settings, number counters, and audit logs.
- `prisma/migrations/202609070002_complete_foundation_settings/migration.sql` — display currency and approved printer settings, plus address-default normalization.

## Conventions

- PostgreSQL stores timestamps in UTC; screens and documents display `Asia/Colombo`.
- Monetary columns added later use fixed-precision `Decimal`, never floating point.
- Quantities use explicit decimal precision to support length/area work.
- User-facing business numbers are separate from database IDs.
- Finalized financial snapshots retain descriptions and prices as entered at transaction time.
- Index date, status, customer, invoice/order relation, staff, and payment-method fields used in operational queries.

## Phase 3 POS billing schema

Migration `prisma/migrations/202609070003_phase3_pos_billing/migration.sql` adds `customers`, `invoices`, `invoice_items`, `payments`, and `payment_reversals`. It also adds the `InvoiceStatus` and `PaymentMethod` enums.

Development PostgreSQL acceptance on 8 September 2026 exposed a nullable void-reason check: PostgreSQL accepts a CHECK result of NULL. Additive migration `202609080001_require_void_reason` explicitly requires a non-null reason for VOID invoices. The three earlier migrations remain unchanged. The regression is tested against PostgreSQL, together with invalid amounts/items, unique identifiers, restrictive deletes, idempotency, and concurrent payments.

- Customers contain only name and unique/indexed phone number. An invoice may remain anonymous.
- Invoices retain nullable customer relations plus name/phone snapshots, authoritative totals, creator, status, idempotency key, and complete void metadata.
- Items contain only manual description, decimal quantity, unit price, calculated line total, and ordering. They have no catalog relation.
- Payments are append-only ledger entries. A one-to-one reversal record marks a payment invalid without deleting it.
- Foreign keys use restrictive deletion for financial history. Customer deletion can null the relation because snapshots preserve the original identity.
- PostgreSQL checks reject invalid financial values, blank item descriptions, blank reversal reasons, and incomplete void state.

Phase 5 adds expenses and cash-register accounting; it does not change the Payment ledger's authority.

## Phase 4 quotations and print orders

Migration `prisma/migrations/202609080002_phase4_quotations_orders/migration.sql` adds quotation/order enums and the `quotations`, `quotation_items`, `quotation_status_history`, `orders`, `order_items`, and `order_status_history` tables. It adds nullable unique `invoices.orderId` for the explicit one-to-one invoice bridge.

Quotation and Order customer values are immutable name/phone snapshots with an optional link to the reusable Customer record. Manual items carry description, quantity, unit price, line total, and stable sort order; Order items additionally carry optional size, material, finishing, design instructions, and notes. No catalog or inventory identity exists.

Unique constraints protect quotation numbers, order numbers, quotation idempotency keys, one order per quotation, and one invoice per order. PostgreSQL checks reject invalid snapshots and manual values and ensure conversion metadata matches CONVERTED status. Historical and source relations use restrictive deletes. Number counters `quote` and `order` are allocated inside the same serializable transaction as their records.

There will be no `products`, `skus`, barcode catalog, stock-item selector, or product lookup relation. Transaction item tables store manual snapshots.

## Financial integrity

Invoice paid amount is derived from successful, non-reversed payment ledger entries. Balance is authoritative grand total minus that sum and is never independently editable. Invoice creation, payment recording, quotation conversion, cash closing, and controlled reversal operations use serializable or appropriately locked transactions where races could create duplicate numbers or overpayment.

Invoice numbers use an atomic `number_counters` upsert/increment inside the same serializable transaction as invoice creation. The value is formatted with the current prefix as `SPH-INV-000001`. Prefix changes affect only future numbers and never rewrite historic identifiers. An invoice idempotency key prevents repeat submission from producing another invoice.

## Phase 5 expenses and cash register

Migration `prisma/migrations/20260908165355_phase5_expenses_cash_register/migration.sql` adds `ExpenseCategory`, `ExpenseStatus`, `CashSessionStatus`, and `CashMovementType`, plus `expenses`, `cash_sessions`, and `cash_movements`. It adds nullable `payments.cashSessionId` for explicit physical-drawer membership; it does not create another payment ledger.

- Expense numbers use the `expense` NumberCounter and setting-driven `SPH-EXP` prefix inside the same serializable transaction as creation. Idempotency keys prevent repeated submissions.
- Expense CHECK constraints require positive amounts, nonblank descriptions, consistent cash-session linkage, and complete void metadata. A trigger prevents core edits and hard deletion.
- Cash sessions use Decimal opening/expected/actual/difference values. A unique nullable `openGuard` permits exactly one `PRIMARY` OPEN session while allowing unlimited CLOSED history.
- The cash-session state CHECK requires OPEN rows to have no closing data and CLOSED rows to have complete, arithmetically consistent reconciliation data.
- Cash movement CHECK constraints require a positive amount and nonblank reason. Movement rows are append-only through the service surface.
- Activity-insert triggers lock and require the referenced session to be OPEN. This prevents a cash payment, expense, movement, or reversal from racing past session close. Closed sessions are immutable and cannot be deleted.

Session membership is explicit: new CASH payments and cash expenses reference the active session at creation. Non-cash payments/expenses do not. Historical Phase 3 cash payments have a null session and are not retroactively assigned.

## Migration workflow

Create and test migrations against development first. Review generated SQL, apply to staging, verify data and constraints, then deploy application code and production migration in the documented order. Never use schema push against production and never edit a migration already applied to a shared environment.
