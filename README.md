# Startek Print Hub POS System

Production-oriented, touch-first Point of Sale and print-job operations system for Startek Print Hub. The application uses Next.js App Router, TypeScript, Tailwind CSS, shadcn-style owned UI components, Prisma ORM, and PostgreSQL hosted on Supabase.

Phase 4 adds quotations and print orders on top of the accepted Phase 3 billing foundation. Staff can create and print manual quotations, record their lifecycle, atomically convert accepted quotations to print orders, move orders through the controlled production workflow, assign staff, and create one linked invoice using the existing payment ledger. Expenses, cash register, reports, QZ Tray, and physical printer integration remain deferred.

## Non-negotiable domain rule

This system has no product catalog, SKU system, barcode catalog, inventory selector, product search, or product dropdown. Invoice and quotation items are always free-text transaction snapshots with description, quantity, and unit price.

## Local setup

Requirements: Node.js 20.19 or newer, pnpm, and a PostgreSQL database.

1. Copy `.env.example` to `.env` and add Supabase development connection strings.
2. Install packages with `pnpm install`.
3. Generate the client with `pnpm db:generate`.
4. Apply existing migrations with `pnpm exec prisma migrate deploy`.
5. Set the seed administrator environment variables and run `pnpm db:seed`.
6. Start development with `pnpm dev`.

The administrator seed is safe to rerun: it upserts the configured email, refreshes its password hash, and ensures the account remains active with the ADMIN role. Remove seed credentials from deployment environments after initial setup.

Do not commit `.env` files or credentials. Use separate Supabase projects for development/staging and production.

## Verification

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm db:validate
pnpm build
```

Database-backed Phase 3–4 verification uses ignored `.env`, which is loaded by both Next.js and the Prisma/seed commands. Set `DATABASE_ENVIRONMENT=development`, transaction-pooler `DATABASE_URL` (6543), and session-pooler `DIRECT_URL` (5432) for the same approved Supabase development project. Apply existing reviewed migrations with `pnpm exec prisma migrate deploy`; `pnpm db:migrate` is for authoring new development migrations.

For local TLS verification, download the CA certificate from the project's Database Settings → SSL configuration into ignored `.env.supabase-ca.crt`. Before launching Node-based database commands or the application, export `NODE_EXTRA_CA_CERTS="$PWD/.env.supabase-ca.crt"` in that terminal. This trusts the provider certificate while retaining certificate and hostname verification. Do not disable certificate validation.

Run `pnpm test:integration` explicitly for the development PostgreSQL suite. It checks the approved development project identity before connecting, exercises actual quotation/conversion/order/invoice/payment services and SQL constraints, and retains business-history fixtures. Constraint probes roll back. Normal `pnpm test` remains database-independent. Authenticated browser acceptance is a separate required gate before a release checkpoint.

Phase 3 authenticated browser acceptance was exercised against DEVELOPMENT Supabase PostgreSQL on 8 September 2026. The repeatable workflow and history-filter reset regression are recorded in `tests/browser/phase3-acceptance.md`. This does not certify production deployment or physical printer operation.

## Documentation

- `docs/REQUIREMENTS.md` — V1 scope and acceptance baseline
- `docs/ARCHITECTURE.md` — system boundaries and application structure
- `docs/DATABASE.md` — Phase 1 schema and planned domain model
- `docs/BUSINESS_RULES.md` — financial and workflow invariants
- `docs/PRINTING.md` — Windows, QZ Tray, ESC/POS, and XP-80T design
- `docs/DEPLOYMENT.md` — Supabase, Vercel, migration, and recovery runbook
