# Repository instructions

Read `README.md` and every file in `docs/` before making architectural or domain changes.

## Delivery discipline

- Work only on the requested roadmap phase. Do not begin the next phase automatically.
- Preserve unrelated user changes and never commit credentials.
- End each phase by running lint, TypeScript checks, relevant tests, Prisma validation, and a production build.
- Report implemented scope, changed files, migrations, remaining risks, and verification results.

## Domain invariants

- Never introduce a product, SKU, barcode-catalog, inventory-selector, product-search, or product-dropdown model.
- Billable items are immutable manual transaction snapshots: description, quantity, unit price, and server-calculated line total.
- Recalculate all financial totals on the server with decimal arithmetic. Never trust client totals.
- Store every payment as a separate ledger record. Do not overwrite an accumulated paid field.
- Never hard-delete finalized invoices, payments, or audit records. Use explicit void/reversal records.
- Enforce permissions in server code; UI visibility is only a convenience.
- Use database transactions for invoice finalization, payments, quotation conversion, cash closing, and restore operations.
- Store timestamps in UTC and present them in `Asia/Colombo`. Format currency as LKR/Rs.

## Engineering conventions

- Keep App Router pages server-first. Add client components only for interactivity.
- Validate action and route inputs with Zod.
- Keep financial calculations in tested domain services, not components.
- Use Prisma migrations for schema changes and append-only audit entries for important operations.
- Design touch controls at least 48px high with clear loading, validation, empty, and error states.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
