# Deployment and Recovery

## Environments

Use separate development/staging and production Supabase databases. Vercel Preview deployments must never point at production. Required secrets are `DATABASE_URL` for the pooled runtime connection and `DIRECT_URL` for migrations. Seed-admin variables are used only during controlled initial setup and should be removed afterward.

## Initial deployment

1. Create the Supabase project in an appropriate region and retain project recovery credentials securely.
2. Configure pooled and direct connection strings locally and in the approved deployment environment.
3. Run lint, type checks, tests, Prisma validation, and production build.
4. Apply reviewed migrations to staging with Prisma migrate deploy and run acceptance tests.
5. Apply the same immutable migrations to production.
6. Deploy the Vercel application with production secrets.
7. Seed the initial administrator through a controlled environment, sign in, then remove seed password variables.
8. Verify authentication, role restrictions, settings audit entries, LKR/Rs. display, Asia/Colombo timezone, 80mm XP-80T/USB defaults, and Windows touch layout.
9. Configure the Windows browser/QZ Tray only during the printer phase.

Never place credentials in Git, client-side variables, screenshots, or audit metadata.

## Release process

Every release uses a reviewed Git commit. Database migrations are additive and backward-aware when possible. Deploy schema changes before code that requires them, or use an expand/migrate/contract sequence. Record the application version and migration state. A rollback of application code must not attempt to reverse irreversible financial data migrations automatically.

## Backup strategy

Managed Supabase backups and point-in-time recovery, when enabled for the selected plan, are the primary disaster-recovery layer. Verify current provider retention and restoration behavior before production launch. The V1 manual export is a complementary, versioned portability package containing core data, schema/application version, creation time, and creator.

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
