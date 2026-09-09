# Application Architecture

## Decision

The POS is a Next.js App Router application deployed to Vercel, with Supabase-hosted PostgreSQL accessed through Prisma. The Windows browser is the application client; local USB printing is a separate trusted boundary handled by QZ Tray. Vercel never connects directly to the printer.

## Request flow

```text
Windows Edge or Chrome
        |
        | HTTPS
        v
Next.js on Vercel ---- Prisma adapter ---- Supabase PostgreSQL
        |
        | signed and sanitized print payload (future printer phase)
        v
QZ Tray on POS PC ---- ESC/POS or Windows queue ---- Xprinter XP-80T USB
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

The system uses internal staff accounts. Passwords are hashed with bcrypt cost 12. Successful login creates a cryptographically random token; only its SHA-256 hash is stored. The browser receives the raw token in an HTTP-only, SameSite=Lax, Secure-in-production cookie with a 12-hour expiry. Disabled users and expired sessions are rejected. A future controls phase should add login throttling/lockout and session management UI.

## Authorization

UI navigation is filtered for usability, while `requireUser`, `requireRole`, and `requirePermission` are the route-facing security controls for server pages/actions. ADMIN has all permissions. MANAGER has operational/reporting controls plus read-only staff/settings visibility; CASHIER has billing, quotations, receipt reprint, register operation, and operational order visibility; DESIGNER and PRODUCTION have only dashboard/order workflow access initially.

## Failure behavior

Validation errors are returned beside forms. Unexpected route failures render a user-safe error page without leaking credentials. Database operations that must remain consistent are transactional. Logs and audits must avoid passwords, session tokens, database URLs, and arbitrary raw print commands.

### Phase 4 quotation and order services

Quotation calculations reuse the tested decimal financial domain. `quotation-service` owns customer snapshots, atomic numbering, draft editing, lifecycle history, and the accepted-quotation conversion transaction. `order-service` owns the canonical role-aware production transition policy, assignment, print-job metadata, and the one-order/one-invoice bridge. The bridge calls the existing invoice transaction helper; Orders never duplicate invoice payment or balance truth.

App Router pages remain server-first. Small client components handle editable rows, confirmations, pending states, and Server Action calls. Every Phase 4 Server Action authenticates and authorizes again before calling a domain service.

### Phase 5 expenses and cash register

`expense-service` creates immutable, transaction-numbered expense snapshots and supports only a controlled void with actor, reason, and timestamp. ADMIN and MANAGER may manage expenses; CASHIER does not create expenses. Cash expenses require and explicitly reference the open register. Non-cash expenses remain independent of the physical drawer.

`cash-register-service` owns the single primary drawer, opening, controlled deposits/withdrawals, authoritative expected-cash calculation, and transactional closing. A nullable unique open guard enforces at most one OPEN session. Database triggers lock the referenced session when inserting drawer activity, so closing and activity cannot race. Closed sessions and retained expense history are database-protected from editing/deletion.

New CASH payments require an open session and reference it. CARD, BANK_TRANSFER, and QR payments never receive a cash-session relation. The existing Payment and PaymentReversal tables remain authoritative; no duplicate sales ledger exists.
