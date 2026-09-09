# Phase 6 browser acceptance

Date: 9 September 2026

Environment: local Next.js development server with approved DEVELOPMENT Supabase PostgreSQL

Browser: Chromium through authenticated `agent-browser` session

## Verified

- Dashboard loaded with all seven required Admin cards, a responsive current-year Recharts chart, recent financial activity, and navigable recent orders.
- Dashboard showed LKR/Rs. values without `NaN`, a blank state, framework overlay, or horizontal overflow at 390px.
- Sales, expenses, financial, payments, staff, outstanding, orders, customers, and cash-session report views loaded while authenticated.
- Date presets, custom range validation, month selection controls, role/staff/category/method/status/search/sort controls, Apply, and Reset rendered as touch targets.
- An invalid reversed custom date range produced a safe user error and no framework overlay.
- The overdue order filter returned the controlled overdue fixture.
- Sales, expenses, payments, outstanding, orders, and cash-session export endpoints each returned HTTP 200 with `text/csv`; an actual sales CSV download completed.
- Financial print output rendered as a single clean landscape page with business logo/contact details, report title/range, generated time/user, and distinct sales, expenses, operational net, payments, and outstanding values. The automated PDF helper uses its own Letter default; the browser page declares A4 landscape through print CSS.
- Mobile-width dashboard/reports produced no document-level horizontal overflow. Wide report tables remain locally scrollable.
- Browser page-error collection was empty. Console output contained only the normal React development-tools/HMR messages.

Role data isolation is additionally covered by service integration tests: ADMIN receives full financial data, PRODUCTION receives no financial fields, and the permission matrix denies full `/reports` access to CASHIER, DESIGNER, and PRODUCTION.
