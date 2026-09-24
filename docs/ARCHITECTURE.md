# Application Architecture

## Decision

The POS is a Next.js App Router application deployed to Vercel, with Supabase-hosted PostgreSQL accessed through Prisma. The Windows browser is the application client and receipt-print boundary. It opens the operating-system print dialog, where the user selects the locally installed XP-80T/XP-80C queue. Vercel never connects directly to USB.

## Request flow

```text
Windows Edge or Chrome
        |
        | HTTPS
        v
Next.js on Vercel ---- Prisma adapter ---- Supabase PostgreSQL
        |
        | persisted 80mm receipt document
        v
Browser print dialog ---- Windows driver/queue ---- XP-80T/XP-80C USB
```

## Application boundaries

- `src/app` contains routes, layouts, Server Components, and narrowly scoped Server Actions.
- `src/components` contains reusable interface components. Primitive UI source remains owned by this repository.
- `src/lib/validations` is the Zod boundary for untrusted input.
- `src/lib/auth.ts` owns opaque session creation, lookup, destruction, and route-facing authorization helpers. Testable credential/session rules live in `src/lib/auth-service.ts`.
- `src/lib/permissions.ts` is the canonical role-to-permission map.
- Future `src/domain` services will own money calculations, payment ledgers, numbering, and workflow transitions. UI files must not duplicate these rules.
- `prisma/schema.prisma` and migration files are the database source of truth.

## Rendering and data access

Pages are Server Components by default. Client Components are limited to interactive forms. Financial mutations use Server Actions or route handlers that validate input, resolve the authenticated staff member, re-read authoritative records, calculate values on the server, execute a database transaction, and append an audit event.

Runtime database access uses the Supabase pooled connection in `DATABASE_URL`. Prisma migrations and administrative jobs use `DIRECT_URL`. Both remain server-only environment values.

## Authentication

The system uses normalized unique usernames for internal staff login; compatibility email values are not login identifiers. Passwords are hashed with bcrypt cost 12. Successful login creates a cryptographically random token; only its SHA-256 hash is stored. The browser receives the raw token in an HTTP-only, SameSite=Lax, Secure-in-production cookie. The default expiry is 12 hours; the owner-approved “Keep me signed in on this device” choice stores a 30-day expiry and defaults off. Logout removes the current token, while password reset, disable, and role change revoke affected sessions. Disabled users and expired sessions are rejected. A future controls phase should add login throttling/lockout and session management UI.

## Authorization

UI navigation is filtered for usability, while `requireUser`, `requireRole`, and `requirePermission` are the route-facing security controls for server pages/actions. ADMIN has all V1 permissions. STAFF has daily Dashboard, POS, invoice/payment/receipt, customer, order, quotation, ordinary expense, register, and operational report access, but no Staff administration, Settings, Backup/Restore, Start Fresh, Danger Zone, role/password administration, invoice void, drawer adjustment, order cancellation, or audit administration. Legacy MANAGER/CASHIER/DESIGNER/PRODUCTION enum values remain only for backward-compatible existing accounts and keep their previously documented permissions until an ADMIN deliberately converts the account to STAFF.

## Failure behavior

Validation errors are returned beside forms. Unexpected route failures render a user-safe error page without leaking credentials. Database operations that must remain consistent are transactional. Logs and audits must avoid passwords, session tokens, database URLs, and arbitrary raw print commands.

### Phase 4 quotation and order services

Quotation calculations reuse the tested decimal financial domain. `quotation-service` owns customer snapshots, atomic numbering, draft editing, lifecycle history, and the accepted-quotation conversion transaction. `order-service` owns the canonical role-aware production transition policy, assignment, print-job metadata, and the one-order/one-invoice bridge. The bridge calls the existing invoice transaction helper; Orders never duplicate invoice payment or balance truth.

App Router pages remain server-first. Small client components handle editable rows, confirmations, pending states, and Server Action calls. Every Phase 4 Server Action authenticates and authorizes again before calling a domain service.

### Phase 5 expenses and cash register

`expense-service` creates immutable, transaction-numbered expense snapshots and supports only a controlled void with actor, reason, and timestamp. ADMIN and MANAGER may manage expenses; CASHIER does not create expenses. Cash expenses require and explicitly reference the open register. Non-cash expenses remain independent of the physical drawer.

`cash-register-service` owns the single primary drawer, opening, controlled deposits/withdrawals, authoritative expected-cash calculation, and transactional closing. A nullable unique open guard enforces at most one OPEN session. Database triggers lock the referenced session when inserting drawer activity, so closing and activity cannot race. Closed sessions and retained expense history are database-protected from editing/deletion.

New CASH payments require an open session and reference it. CARD, BANK_TRANSFER, and QR payments never receive a cash-session relation. The existing Payment and PaymentReversal tables remain authoritative; no duplicate sales ledger exists.

### Phase 6 dashboard and reports

`report-service` is the server-only read model for the dashboard, report tables, and CSV route. It queries existing transactional models in parallel and never persists aggregates. Reporting-domain helpers own Colombo date ranges, Decimal totals, exclusions, overdue classification, and CSV escaping. Recharts is isolated in one small dashboard Client Component.

ADMIN and MANAGER can open the complete reports module. Today’s Sales is the shop-wide total of every valid finalized invoice in the current Asia/Colombo business day; it is never reset or suppressed. Other CASHIER dashboard finance remains limited to their own invoices/payments. DESIGNER and PRODUCTION receive order-centric dashboards without financial values. CSV routes repeat server authorization and Zod validation.

## Phase 6.5 pre-printer hardening

`resolvePayment` is the shared server/domain boundary for payments. CASH input represents tendered cash; only `min(tendered, outstanding)` is stored as the ledger amount, while `cashTendered` and `changeGiven` preserve the retail exchange. Other methods retain the strict no-overpayment rule. Invoice creation and later payments calculate this again inside serializable transactions.

The authenticated invoice PDF route reads persisted invoice/settings data and generates A4 bytes server-side. Receipt, quotation, and report print styles own route-scoped named pages; there is no global paper-size rule. Autoprint is an explicit, consumed URL marker and never runs on a normal receipt view or reload.

The dashboard has no sales reset boundary, permission, action, or setting. Today’s Sales always uses valid finalized invoice records within the current Asia/Colombo day. The sidebar state is a local device preference. Chart code loads on demand, report support/data queries start together, unused report relations are skipped, and each runtime bounds PostgreSQL concurrency to five connections.

## Phase 7 browser printing and portability backup

The receipt route is server-first and builds its view model from the persisted invoice, payment ledger, user, order, and settings records. A narrow Client Component only consumes the explicit one-time autoprint marker and invokes `window.print()`. Manual printing uses the same button and document. Reloading cannot recreate financial records because the print route has no financial mutation.

Dedicated named-page CSS constrains the receipt to 80mm without affecting A4 quotations, reports, or PDFs. The Windows browser and driver own queue selection, paper options, feed, and cutter configuration. The application does not discover printers, poll device state, access USB, or send raw printer commands.

Receipt output contains no QR or barcode generation boundary. The owner-approved browser document is intentionally limited to the monochrome logo, text identity, persisted transaction details, financial summary, and footer.

The backup domain creates and validates a versioned ZIP with manifest, per-table JSON, record counts, relational/financial checks, and SHA-256 integrity. Sessions and credential material are excluded. The restore route is Admin-only, DEVELOPMENT-only, confirmation-gated, and accepts only an empty business target. A serializable transaction maps existing users by email, creates unmatched historical identities disabled, restores dependency order, verifies table counts, and audits success. A transaction-local restore flag permits historic closed-drawer activity without weakening normal database triggers.

## Phase 8 production topology

The stable shop endpoint is `https://startek-print-hub-pos.vercel.app`, deployed from accepted commit `856735b3b4030bfa0196d05d8c69fc41e34d967b`. Vercel Production connects only to Supabase project `napooftvnywigvqblodn` in Mumbai. Vercel Preview connects only to the separate development project `fbnwigknxlapnemmmugd`; no transactional data is copied between them.

Production Vercel Functions are pinned to Mumbai (`bom1`) beside the Mumbai Supabase project; static assets still use Vercel's global edge network. This removes the former `iad1` Washington-to-Mumbai database path. Runtime access uses the Supabase transaction pooler and the Prisma adapter's five-connection instance cap. Migration and administrative commands use the session pooler from a controlled trusted shell. Both connections require verified TLS. Production restore remains blocked by `DATABASE_ENVIRONMENT=production`; backup validation is non-mutating and may run in Production.

Authenticated workspace routes retain server-first authorization and fresh database reads. A route-group `loading.tsx` keeps the shared shell interactive and provides immediate accessible visual feedback while the destination Server Component renders; it does not cache or display stale financial data.

V1 remains online-only. The failure boundary is browser → HTTPS/Vercel → pooled Supabase PostgreSQL; it adds no offline queue or synchronization model. Application rollback uses a compatible reviewed Vercel deployment, while database recovery uses a forward migration or a controlled restore after isolation rehearsal and owner approval.

## V1.0.1 operational archive and staff boundary

`Setting.operationalDataStartAt` is the single nullable UTC archive boundary. A null value keeps all history active. ADMIN Start Fresh re-reads the active actor, current setting, and primary cash-session guard inside a serializable transaction, updates only this boundary, and appends `START_FRESH`; no business row or counter is removed. Operational list/report services use the later of a requested start and the boundary. Direct pre-boundary resources are ADMIN-only, visibly archived, and their mutation services independently reject changes.

Staff mutations enter through authenticated Server Actions and are repeated in the server service boundary. Creation requires a normalized unique username and hashes the temporary password with bcrypt cost 12. The owner-facing role selector exposes only ADMIN and STAFF. Update holds last-active-admin/self-disable invariants transactionally, uses `DISABLED` rather than deletion, and revokes sessions on disable or role change. Password reset writes only a new hash, revokes sessions, and emits metadata with no credential material. Migration 11 preserves legacy enum values and historical relationships while assigning `stadmin` to the existing primary active administrator.
