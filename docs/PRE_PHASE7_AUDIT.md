# Pre-Phase 7 Audit

## Scope and boundary

Phase 6.5 hardens the accepted Phase 6 system only. It does not implement the Phase 7 receipt-printing workflow, raw printer control, backup/restore, offline mode, inventory/catalog behavior, production database operations, or production deployment.

## Findings and resolutions

- A global 80mm `@page` rule could contaminate A4 output. Global paper sizing was removed; quotation, report, and receipt routes now own narrow named/scoped print rules.
- Payment input treated tender as applied money. Shared Decimal logic now persists CASH tender/change while applying only the outstanding balance. A database constraint protects the relationship and preserves legacy rows.
- Invoice PDF source recovered from the safety stash was reviewed and rebuilt as an authenticated server route plus focused tests. No generated PDF is tracked or required as a fixture.
- Finalization offers print and PDF outcomes through one idempotent invoice service. Autoprint requires `autoprint=1`, consumes it before calling print, and cannot repeat on reload.
- The owner withdrew the proposed Today’s Sales reset. Its UI, permission, service, tests, and schema model are removed; Today’s Sales always includes every valid finalized invoice in the current Asia/Colombo business day.
- Desktop navigation collapses accessibly and persists locally. Mobile navigation and role-filtered modules remain intact.
- Dashboard chart code is lazy-loaded. Report data starts in parallel with support data and avoids order/cash-session queries when the view does not need them. Runtime database connections are bounded to five per instance.

## Security and permissions audit

Protected pages/actions continue through the authenticated session and central server permission checks. Invoice PDF and quotation/receipt routes enforce their owning permissions. There is no dashboard-reset permission or action. Zod validates action/route input, server code repeats Decimal calculations, invoice/payment writes are transactional, and audit entries contain operational metadata rather than credentials.

React escaping, generic authentication errors, CSV formula neutralization, safe PDF text conversion, secure HTTP-only same-site sessions, database constraints, verified TLS, ignored environment files, and development-only integration guards remain in force. Direct resource routes re-check authentication/permission and do not accept client-computed totals.

During this audit, development framework diagnostics emitted a submitted seed-admin password. A first Preview probe also submitted the JavaScript-controlled login form before hydration, allowing the browser’s default GET behavior to place that credential in a diagnostic URL. The development credential was treated as compromised and rotated/reseeded after each event; no value is recorded here. The login form now declares POST as its fail-safe transport, and acceptance waits for client validation before credential submission. Credentials must remain out of diagnostics and any exposed development credential must be rotated.

## Performance evidence

Baseline authenticated development measurements included compilation variability: dashboard 3509 ms, POS 1911 ms, invoices 1865 ms, quotations 2266 ms, orders 1513 ms, expenses 2306 ms, cash register 1436 ms, reports 3630 ms, and settings 3644 ms.

After hardening, authenticated production-mode local navigation measured: dashboard 1687 ms, POS 275 ms, invoices 969 ms, quotations 571 ms, orders 994 ms, expenses 555 ms, cash register 1814 ms, reports 883 ms, and settings 420 ms. These are point measurements over a remote development database, not latency guarantees. Lists retain existing caps. Very large lifetime report ranges and outstanding-balance scans remain candidates for SQL aggregation/pagination when real volume evidence warrants it; correctness was not traded for speculative caching.

## Verification evidence

- Environment/project/ports and Git-ignore safety checks passed without displaying URL or credential values.
- Eight Prisma migrations are applied and development schema status is current. The eighth removes the withdrawn dashboard-reset persistence without rewriting applied history.
- Unit suite: 20 files, 84 tests passed after reset-only tests were removed.
- Development database integration suite: 4 files, 22 tests passed, covering tender/change persistence, constraint rejection, authoritative dashboard/report totals, idempotency, concurrency, reversals, and immutable history.
- ESLint, TypeScript, Prisma validation, and Next.js production build passed.
- Authenticated local browser acceptance passed for authoritative Today’s Sales with no reset/clear control and for the refined receipt: dedicated monochrome logo loaded, minimalist sans-serif typography and financial hierarchy rendered, and the centered text fallback survived a forced logo failure. Earlier Phase 6.5 acceptance continues to cover the persistent 48px sidebar toggle, cash preview, non-cash behavior, PDF finalization/download, invoice detail action, and isolated quotation A4.
- Invoice PDF was downloaded, identified as A4, rendered, and visually inspected for logo, identity, lines, totals, payment history, footer, spacing, clipping, and page numbering.

## Preview result

Vercel deployment `dpl_B5F339zC2yufwM6wTrdC7z4GQmDP` reached READY as a Preview (no production target) at `https://startek-print-hub-2a08b5xdf-kevinmenuja11-6769s-projects.vercel.app`. That deployment predates the owner-approved removal of the reset feature and receipt refinements; it remains historical Preview evidence, not evidence for these replacement requirements.

Physical Windows touch/printer checks are required when that hardware is available and are not equivalent to Phase 7 integration.
