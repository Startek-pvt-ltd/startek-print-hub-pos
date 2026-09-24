# Deployment and Recovery

## Environments

Use separate development/staging and production Supabase databases. Vercel Preview deployments must never point at production. Required secrets are `DATABASE_URL` for the pooled runtime connection and `DIRECT_URL` for migrations. When the deployment runtime does not trust the Supabase certificate chain, also configure the server-only `SUPABASE_CA_CERT` with the project's approved CA certificate; never expose it through a `NEXT_PUBLIC_` variable. Seed-admin variables are used only during controlled initial setup and should be removed afterward.

Receipt printing requires no printer credentials or signing environment values. The browser print dialog and locally installed Windows driver are the only printing boundary. The application must never receive USB access, raw printer commands, or private printer keys.

## Initial deployment

1. Create the Supabase project in an appropriate region and retain project recovery credentials securely.
2. Configure pooled and direct connection strings locally and in the approved deployment environment.
3. Run lint, type checks, tests, Prisma validation, and production build.
4. Apply reviewed migrations to staging with Prisma migrate deploy and run acceptance tests.
5. Apply the same immutable migrations to production.
6. Deploy the Vercel application with production secrets.
7. Seed the initial administrator through a controlled environment, sign in, then remove seed password variables.
8. Verify authentication, role restrictions, settings audit entries, LKR/Rs. display, Asia/Colombo timezone, 80mm XP-80T/USB defaults, and Windows touch layout.
9. Configure the XP-80T/XP-80C queue, 80mm paper, and optional cutter in Windows Printer Preferences, then verify the browser print dialog on the real POS.

Never place credentials in Git, client-side variables, screenshots, or audit metadata.

## Release process

Every release uses a reviewed Git commit. Database migrations are additive and backward-aware when possible. Deploy schema changes before code that requires them, or use an expand/migrate/contract sequence. Record the application version and migration state. A rollback of application code must not attempt to reverse irreversible financial data migrations automatically.

## Backup strategy

Managed Supabase backups and point-in-time recovery, when enabled for the selected plan, are the primary disaster-recovery layer. Verify current provider retention and restoration behavior before production launch. The V1 manual export is a complementary, versioned portability package containing core data, schema/application version, creation time, and creator.

Use Settings → Backup & Restore to generate and download the application-level ZIP. Store it in an owner-approved encrypted location. The application package is not a PostgreSQL physical backup and does not replace provider backups/PITR. Follow `docs/BACKUP_RESTORE.md` for package validation and rehearsal.

## Restore runbook

Restore is Admin-only and is first rehearsed outside production. Validate backup checksum, format, and schema compatibility; create a safety snapshot; place the application in maintenance mode; restore transactionally or with a verified provider process; run integrity checks; record the outcome; then reopen access. Never overwrite live data from an unvalidated upload.

## Production checks

- HTTPS and secure cookies are active.
- Supabase network/database credentials are server-only and rotated after exposure.
- Connection pooling stays within plan limits.
- Disabled users cannot authenticate and expired sessions are rejected.
- Vercel logs contain no passwords, session tokens, or connection strings.
- Monitoring covers failed login spikes, server errors, database saturation, and migration failures.
- The online-only limitation and manual fallback procedure are understood by shop staff.

## Phase 6.5 Preview gate

Verify environment identity, ports, and ignored files before database or deployment commands. Apply the one reviewed development migration, run unit/integration suites, validate Prisma, build, complete authenticated local acceptance, scan tracked/history/worktree content for secret patterns, and deploy Preview only. Repeat the critical journey on the exact Preview URL before checkpointing. Do not use `prisma db push`, a production database, `vercel --prod`, or production promotion.

Keep the runtime database connection cap aligned with the Supabase pool allocation; the application currently uses at most five connections per instance. Development Server Action diagnostics can include form arguments, so use production-mode local acceptance and rotate a development credential immediately if diagnostic output exposes it. Browser automation must wait for login-form hydration/validation before entering credentials; the form declares POST so an early native submission cannot place credentials in a URL.

## Phase 8 production deployment record

| Item | Production value |
| --- | --- |
| Deployed source | `856735b3b4030bfa0196d05d8c69fc41e34d967b` |
| Stable URL | `https://startek-print-hub-pos.vercel.app` |
| Initial Vercel deployment | `dpl_FuGXXdMRTkprKPheRKNJxjLRuPQB` (`READY`) |
| Current Vercel deployment | `dpl_8s4FBWmTKeCr1sou8EWgc2Bygpkc` (`READY`) |
| Deployment dates | Initial: 13 September 2026; Mumbai performance deployment: 19 September 2026 |
| Supabase project | `Startek Print Hub POS — Production` (`napooftvnywigvqblodn`) |
| Region / database | Mumbai `ap-south-1` / PostgreSQL 17.6 |
| Migration state | 9 applied, 0 failed, 0 pending; stored checksums match source |
| Plan / recovery | Free/Nano; no scheduled backup or PITR |

Production runtime traffic uses the transaction pooler on port 6543. Controlled migration, dump, and administrative work uses the IPv4 session pooler on port 5432. `DATABASE_URL`, `DIRECT_URL`, `DATABASE_ENVIRONMENT=production`, and `SUPABASE_CA_CERT` are server-only Vercel Production values. Preview retains only development credentials. Seed credentials are absent from Vercel.

Vercel Functions are configured in `vercel.json` to run in Mumbai (`bom1`), beside the Production database. Before this correction, request headers showed the edge in Mumbai forwarding dynamic work to Washington (`bom1::iad1`); the current deployment reports `bom1::bom1`. Warm unauthenticated login TTFB samples improved from approximately 0.46–0.69 seconds to approximately 0.26–0.53 seconds. Heavier authenticated pages also display the workspace loading fallback immediately rather than appearing unresponsive while fresh server data renders.

The Free-plan recovery limitations and possible inactivity pausing are temporary risks explicitly accepted by the owner. Until a paid recovery plan is approved, create a verified application ZIP at every closing and before releases or migrations; create a verified PostgreSQL custom-format dump at least weekly and before migrations; retain copies in an encrypted owner-controlled location off the POS; and periodically validate both formats without restoring Production.

## Production incident and recovery runbook

1. Identify and timestamp the incident; record affected workflows and last known-good transaction.
2. Stop new transactions and announce the maintenance boundary.
3. Preserve the current database/application state and logs before changing anything.
4. Capture a provider snapshot when the active plan supports it; otherwise create a controlled dump if the database is readable.
5. Select a verified Supabase restore/PITR point or validated application/database backup. Never use unvalidated development data.
6. Rehearse the selected restore against an isolated non-production project.
7. Obtain owner approval and restore during a controlled maintenance window.
8. Verify migration state, financial totals, payments/reversals, cash reconciliation, authentication, and invoice/order/quotation links.
9. Reopen access, monitor errors and connections, and record the incident, evidence, decisions, and outcome.

Never test the destructive application restore on live Production. Application rollback and database recovery are separate: redeploy a known-good compatible Vercel commit for an application defect; use a forward corrective migration or controlled provider/backup recovery for database defects. Never reverse financial migrations automatically.

## Shop opening and closing checklist

Opening: power on the Windows POS, confirm internet, open the stable Production URL, sign in, confirm the XP-80T queue is available, and deliberately open the cash register with actual opening cash.

Daily use: create manual-item invoices, collect and verify payments/change, print receipts, progress Orders and Quotations, enter real Expenses, and monitor Outstanding. If connectivity fails, do not repeatedly select Finalize; verify the transaction after service returns and reconcile any manual fallback record under the shop policy.

Closing: reconcile the drawer, enter actual cash, review difference, close the register, review key reports, create and verify the daily application backup, store it off the POS, and sign out. Create the weekly database dump on the scheduled day.

## V1.0.1 maintenance deployment gate

The maintenance code deployment and Production Start Fresh are separate changes. After review and full DEVELOPMENT acceptance: apply pending immutable migrations 10 and 11 with `prisma migrate deploy`, deploy the reviewed v1.0.1 commit, and smoke-test username authentication, normal/persistent session expiry, ADMIN/STAFF permissions, Staff management, Settings, dashboard/report queries, backup generation, receipts, and the existing Windows/XP-80T workflow. Do not use `prisma db push` and do not alter the v1.0.0 tag.

Migration 11 assigns `stadmin` to the existing primary active ADMIN without replacing that user row. After deployment, the owner changes that account's password through the bcrypt-backed ADMIN reset workflow, which writes only `ADMIN_PASSWORD_RESET`, revokes existing sessions, and requires a fresh login. Never pass the plaintext password in command arguments, documentation, screenshots, Git, Vercel logs, or audit metadata.

Only after the owner explicitly approves the Production operation: sign in as an active ADMIN, generate and validate a fresh application ZIP, create and verify a PostgreSQL dump, store both off the POS PC, confirm no cash session is open, and execute Settings → Danger Zone → Start Fresh / Archive Test Data using `START FRESH STARTEK`. Immediately verify current-period dashboard/lists/reports, retained settings/staff/printer identity, archived-row retention, and the `START_FRESH` audit. A second cutoff requires the same complete process.
