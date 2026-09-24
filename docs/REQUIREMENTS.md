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

Owner-facing staff roles are ADMIN and STAFF. Legacy MANAGER, CASHIER, DESIGNER, and PRODUCTION enum values remain only for backward-compatible accounts until deliberately converted. All authorization is enforced on the server. Login uses a normalized unique username, not the compatibility email. Passwords and session tokens are stored only as hashes. Important actions create append-only audit entries, including login, invoice/payment creation, void, receipt reprint, quotation conversion, order status change, expenses, register open/close, settings, and backup/restore.

## V1.0.1 maintenance acceptance

- Settings exposes “Start Fresh / Archive Test Data” only to ADMIN. Exact phrase and backup confirmation are required, an open cash session blocks execution, and every successful cutoff change is transactional and audited with previous/new timestamps.
- The cutoff is a visibility boundary, never a delete. Earlier invoices, payments, orders, quotations, expenses, cash sessions, movements, histories, and audit rows remain in PostgreSQL and in full backups. Business-number counters continue unchanged.
- Normal dashboards, operational lists, customer/report history, outstanding balances, charts, and cash-session history exclude records before the cutoff. ADMIN may directly inspect retained records with an archived/read-only warning; ordinary users cannot operate on them.
- ADMIN can create, edit, enable/disable, and reset passwords for owner-facing ADMIN/STAFF accounts. The Staff screen displays Name, Username, Role, Status, Created, and Actions without exposing compatibility email or password hashes.
- STAFF can use daily Dashboard, POS billing, invoices/payments/receipts, customer lookup, orders, quotations, ordinary expenses, the permitted cash-register workflow, and operational reports. STAFF cannot administer Staff, Settings, Backup/Restore, Start Fresh/Danger Zone, roles, other users' passwords, or system-level destructive/corrective actions.
- Legacy roles retain their existing permissions and appear as Staff compatibility accounts. Saving one through the final role selector deliberately converts it to STAFF and revokes its sessions.
- Passwords are bcrypt-hashed and never displayed or audited. Disabling or resetting an account revokes its sessions. Staff records are disabled rather than deleted, self-disable is rejected, and at least one active ADMIN must remain.
- Login asks for Username and Password. “Keep me signed in on this device” defaults off; unchecked sessions last 12 hours and checked sessions last 30 days. Cookies remain HttpOnly, SameSite=Lax, and Secure in Production.
- Production deployment and Production Start Fresh are separate owner-controlled steps. No Production cutoff may be executed without a fresh application ZIP, verified database dump, closed register, authenticated ADMIN, and explicit owner approval.

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
- Phase 4 does not add expenses, cash-register sessions, analytics, reports, physical printer control, backup automation, attachments, inventory, or a product catalog.

## Phase 5 expenses and cash register acceptance

- Expenses are immediately finalized immutable snapshots with setting-driven atomic `SPH-EXP` numbering, eight approved categories, positive Decimal amounts, PaymentMethod reuse, idempotency, audit creation, and controlled voids. ADMIN/MANAGER manage expenses; CASHIER does not.
- The shop has one primary physical drawer. A database unique guard and serializable transactions prevent duplicate OPEN sessions; closed sessions are terminal and database-protected.
- New CASH payments and CASH expenses require and reference the OPEN session. CARD, BANK_TRANSFER, and QR never affect or join the physical drawer. Existing Payment rows remain the only invoice-payment ledger.
- Expected cash is calculated on the server as opening cash plus valid non-reversed cash payments plus deposits, minus valid cash expenses and withdrawals. Invoice VOID alone does not remove retained cash; PaymentReversal controls ledger validity.
- Closing transactionally stores expected cash, actual cash, signed difference, closer, time, note, and an idempotency key. Row-locking triggers serialize activity against close and protect the fixed session boundary.
- Cash-register operators are ADMIN, MANAGER, and CASHIER. Only ADMIN/MANAGER can create expenses or record controlled deposits/withdrawals. DESIGNER and PRODUCTION have no Phase 5 financial access.
- Phase 5 does not add dashboard analytics, reports, physical printing, backup/restore, inventory, offline operation, multi-branch support, or file attachments.

## Phase 6 dashboard and reports acceptance

- Dashboard metrics, current-year monthly sales, and recent activity derive from source transactions using Colombo shop dates.
- ADMIN/MANAGER see full financial and operational reporting. CASHIER dashboard finance is scoped to their work. DESIGNER/PRODUCTION dashboards are order-centric. Only ADMIN/MANAGER access full reports and exports.
- Reports cover sales ranges, expense breakdowns, financial concepts, payment methods, distinct staff activities, outstanding invoices, order groups, customer purchase history, and cash reconciliation.
- Sales exclude VOID invoices, expense totals exclude VOID expenses, and payments exclude reversals. Source records remain retained.
- Key reports print as branded A4. Required reports export server-generated, formula-safe CSV. Dedicated report PDF is deferred.
- No reporting ledger, summary table, printer integration, backup feature, inventory, offline mode, or multi-branch behavior is introduced.

## Phase 6.5 pre-Phase 7 hardening acceptance

- Quotation print is isolated A4 portrait, and invoice detail offers a branded server-generated A4 PDF with multipage support.
- CASH entry records tendered, applied, and change; only applied money affects the ledger/drawer. Non-cash overpayment remains invalid.
- POS exposes idempotent “Finalize & print” and “Finalize & download PDF” actions. Autoprint requires and consumes an explicit marker.
- Today’s Sales has no clear/reset mechanism and always includes every finalized non-VOID invoice in the current Asia/Colombo day.
- Desktop navigation collapses to an icon rail, retains 48px controls/module access, and remembers its local state.
- Runtime queries, payloads, lazy client code, connection concurrency, authorization, resource access, validation, audit metadata, TLS, secrets, and output routes receive a documented release audit.
- Phase 7 printer bridge work, backup/restore, and physical Windows printer certification remain out of this earlier checkpoint; production deployment, inventory/catalog, and offline mode remain out of scope.

## Phase 7 printing and backup acceptance

- Vercel renders an 80mm receipt in the Windows browser. The browser print dialog sends it through the selected local XP-80T/XP-80C Windows queue; the application never accesses USB, discovers printers, or sends raw printer commands.
- Receipt pages reuse persisted data and show the original invoice identity, manual items, server totals, payment ledger, cash tender/change, balance, reprint state, and approved monochrome logo with text fallback. Receipt QR/barcode output is intentionally excluded by owner decision. Print cancellation or failure never retries or rolls back a financial mutation.
- Finalize opens the persisted receipt with a consumed one-time autoprint marker. The receipt always retains one manual `PRINT RECEIPT` action. Paper feed and cutter behavior are configured only in Windows Printer Preferences when supported by the installed driver.
- Backup and restore routes require Admin permission. A versioned ZIP includes required business/history records, counts, compatibility metadata, and SHA-256 integrity, while excluding password hashes, sessions, connection values, and private keys.
- Upload performs read-only checksum/version/relation/financial validation and count preview. Restore requires a separate confirmation, the approved DEVELOPMENT environment, and an empty target; it runs in one serializable transaction, verifies counts, and audits success.
- Supabase managed backup/PITR, when included in the selected plan, remains the primary database recovery mechanism and must be verified before Production launch.
- The owner confirmed all mandatory physical browser-print and touchscreen checks passed on 13 September 2026 using the real Startek Print Hub Windows touch POS and USB-connected Xprinter XP-80T. `docs/WINDOWS_POS_SETUP.md` is the acceptance record; this does not authorize Production deployment.

## Phase 8 production and V1 acceptance

- Production uses a new Supabase project in Mumbai and never reuses the development project. Vercel Production and Preview retain separate environment scopes.
- All nine immutable migrations must be applied with `prisma migrate deploy`, report matching checksums and no pending migration, and preserve a schema without product/SKU/catalog tables.
- Exactly one controlled initial ADMIN is seeded with an owner-supplied production-only password. Seed credentials never remain in Vercel or source.
- Production requires valid HTTPS, secure/HttpOnly/SameSite=Lax 12-hour sessions, protected-route redirects, server permissions, safe errors, and secret-free client/runtime output.
- The stable Production URL must replace Preview on the real Windows POS. XP-80T printing, touchscreen operation, one controlled receipt journey, register reconciliation, and daily opening/closing procedure must pass on the shop hardware.
- Free-plan recovery limitations are an owner-accepted temporary risk. Daily verified application ZIPs and weekly verified PostgreSQL dumps are mandatory off-POS until managed backups/PITR and non-pausing availability are approved.
- Live Production restore is prohibited for acceptance. Recovery is rehearsed in isolation and executed in Production only during an owner-approved incident window.
- V1 remains online-only. Staff must not repeatedly finalize during connectivity failure and must reconcile any manual fallback after service returns.
- The owner confirmed every mandatory Production Windows, XP-80T, touchscreen, and register-reconciliation check passed on 14 September 2026. The 19 September 2026 performance correction colocates Vercel Functions with the Mumbai database and preserves fresh server-authoritative rendering.
