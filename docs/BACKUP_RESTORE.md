# Backup and Restore

## Level 1 — application portability backup

Settings → Backup & Restore is available only to an authenticated ADMIN. Generate creates a ZIP in memory; Download saves it to the operator's device. The archive contains `manifest.json` plus JSON files for settings, non-credential user identities/roles, counters, customers, quotations/items/history, orders/items/history, invoices/items, payments/reversals, expenses, cash sessions/movements, and audit history.

The manifest records format, application and schema versions, UTC generation time, actor, business name, record counts, and a SHA-256 checksum over the sorted data files. Browser sessions, session-token hashes, password hashes, database URLs, environment variables, CA material, and private keys are never exported. Unmatched user identities restore as DISABLED and require deliberate credential re-establishment.

An application ZIP is sensitive business data even though credentials are excluded. Store it only in an owner-approved encrypted location with restricted access.

## Controlled DEVELOPMENT restore

Restore acceptance is DEVELOPMENT-only. Uploading does not write data: the server first enforces compressed/expanded size limits, parses the ZIP, checks supported versions, required files/counts, SHA-256, unique identifiers/business numbers, foreign keys, invoice totals/items, positive financial entries, and closed-register reconciliation. The UI then displays counts and warnings.

Only after validation may the ADMIN type the exact confirmation phrase and submit restore. The target must have no business transactions. One serializable transaction maps existing users by email, creates unmatched historical users disabled, restores records in dependency order, enables the narrowly scoped historic-drawer insertion mode, rechecks restored counts, and appends `BACKUP_RESTORED`. Any error rolls the whole transaction back. Production restore is rejected.

Before a real recovery, preserve the damaged environment, validate the archive in a separate development/staging database, reconcile outstanding balances and cash-session expected/actual/difference values, and obtain owner approval. Do not use `prisma db push`.

## Level 2 — Supabase managed recovery

Supabase managed backups and point-in-time recovery, where available, are the primary database disaster-recovery layer. The application ZIP is portable business data, not a PostgreSQL physical backup. Actual retention, PITR granularity, restore procedures, and plan availability can change; verify them in the selected Supabase project's current plan and documentation before Production launch. Rehearse recovery outside Production and record evidence.
