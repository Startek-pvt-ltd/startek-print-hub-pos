# Startek Print Hub POS Requirements

## Purpose and baseline

This file is the implementation-facing V1 scope for a cloud-hosted, touch-friendly POS used at Startek Print Hub, No.62 Padukka Road, Meegoda, Sri Lanka. It is derived from the approved Version 1.0 project document dated 7 September 2026. Conflicts must be resolved in favor of the explicit business rules in this repository and confirmed with the owner.

## V1 modules

The system will provide Dashboard, POS Billing, Orders, Quotations, Expenses, Cash Register, Reports, Staff, and Settings. Customer data is intentionally limited to name and phone number. Artwork/file attachments, offline synchronization, multi-branch consolidation, e-commerce, and raw-material inventory are excluded.

## Billing and payments

- Cashiers manually enter description, quantity, and unit price for every line. Line totals and invoice totals are calculated by the system.
- Finalized invoices include a unique invoice number, customer details when supplied, subtotal, discount, grand total, payment history, paid total, balance, creator, and timestamp.
- Payment methods are Cash, Card, Bank Transfer, and QR Payment. An invoice can have no initial payment, one full payment, an advance, or multiple partial/balance payments.
- Finalized invoices are never deleted. Authorized users may void one only with a reason, actor, and timestamp. Reversals/refunds are separate records.

## Orders and quotations

Order status follows Pending, Designing, Waiting Approval, Approved, Printing, Finishing, Ready, Delivered, or Cancelled. Optional job fields are job name, description, quantity, size, material, finishing, design instructions, notes, due date, and assigned staff.

Quotations can be created, edited while permitted, issued/printed, accepted/rejected/expired, and converted without retyping customer or line-item data. Conversion and status changes are audited.

## Cash and expenses

An open cash session records opening cash, eligible cash receipts, cash expenses, controlled drawer movements, expected cash, actual cash, difference, opener, and closer. Non-cash payments never increase expected drawer cash. Closed sessions are locked from ordinary editing.

Expenses store a generated number, timestamp, category, description, amount, payment method, and creator. Initial categories are Materials, Electricity, Salary, Transport, Maintenance, Rent, Petty Cash, and Other.

## Dashboard and reports

Dashboard metrics cover today’s sales, expenses, operational net income, pending and ready orders, outstanding balances, due-today orders, monthly sales, recent transactions, and recent orders. Sales exclude voided invoices. “Profit” means sales minus expenses because V1 has no COGS allocation.

Reports cover daily/weekly/monthly/custom sales, expenses and categories, operational profit, payment methods, staff sales, outstanding payments, completed/cancelled orders, customer purchase history, and cash sessions.

## Security and accountability

Staff roles are ADMIN, MANAGER, CASHIER, DESIGNER, and PRODUCTION. All authorization is enforced on the server. Passwords and session tokens are stored only as hashes. Important actions create append-only audit entries, including login, invoice/payment creation, void, receipt reprint, quotation conversion, order status change, expenses, register open/close, settings, and backup/restore.

## Phase 2 foundation acceptance

- The project installs, generates Prisma Client, passes lint/type/tests/schema validation, and builds without a live database.
- A seeded active administrator can sign in; bad and disabled-account attempts fail and all validly formed attempts are audited.
- Protected workspace routes redirect unauthenticated users to login.
- Roles map to explicit server-checkable permissions.
- Administrators can edit validated business identity, printer defaults, and number prefixes; the update is transactional and audited. Managers have read-only settings access.
- The responsive shell presents only permitted modules and uses touch targets at least 48px tall.
- Foundation migrations create only users, sessions, settings, number counters, and audit logs; no product table exists.
- Settings initialize LKR/Rs., Asia/Colombo, 80mm receipt width, Xprinter XP-80T, and USB connection defaults.
- Login, invalid password, disabled user, expired session, protected access, role permission, settings authorization/validation, and login-audit behavior have unit coverage.

## Phase 3 POS billing acceptance

- Billing has no product/catalog dependency; every line is a manual transaction snapshot.
- Optional customer name/phone lookup and inline creation preserve invoice snapshots.
- Server-side decimal services calculate line total, subtotal, direct LKR discount, grand total, valid paid total, and outstanding balance.
- Invoice creation, numbering, optional initial payment, and audit writes are atomic and idempotency-protected.
- Cashiers and managers can create/view invoices, record payments, and reprint. Only the approved manager/admin permission can void.
- Invoice history supports invoice/customer/phone search plus date, invoice-status, and derived payment-status filters.
- Detail shows items, totals, chronological payments, reversal state, void context, and permitted actions.
- Browser receipts use persisted invoice/settings data. Reprint preparation retains the invoice number, visibly marks REPRINT, records an audit event, and never claims physical print success.
- No application service exposes hard deletion of finalized invoices, items, or payments.

## Phase 4 quotations and print orders acceptance

- Quotations use manual immutable item snapshots, server-calculated totals, `SPH-QT` atomic numbering, draft-only edits, branded A4 print and PDF download presentations, lifecycle histories, and audits.
- Only accepted, non-expired quotations convert. One serializable transaction creates the `SPH-ORD` order and its items/history, links it, marks the quotation CONVERTED, and writes audits. Database uniqueness rejects duplicates.
- Orders preserve print-job fields, active-user assignment, due dates, and the exact controlled workflow. Definitive role/transition checks run in server domain code, including for direct Server Action calls.
- An Order can have at most one Invoice. The bridge reuses Phase 3 server calculations, invoice numbering, customer/item snapshots, payments, balances, and audit logging; Orders contain no parallel financial ledger.
- Phase 4 does not add expenses, cash-register sessions, analytics, reports, QZ Tray, physical printer control, backup automation, attachments, inventory, or a product catalog.
