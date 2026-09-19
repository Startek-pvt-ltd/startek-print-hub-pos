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

## Phase 8 Production recovery status

The Production project `napooftvnywigvqblodn` is temporarily on Supabase Free/Nano. The dashboard confirmed on 13 September 2026 that scheduled backups are unavailable, retention is zero, PITR is disabled/unavailable, and an inactive Free project may pause. The owner explicitly accepted these as temporary operational risks. A paid plan should be approved when managed recovery and non-pausing availability are required.

Until then:

- Generate and validate an application ZIP at every daily closing and before deployments or migrations.
- Create and verify a PostgreSQL 17 custom-format dump at least weekly and before migrations.
- Keep both in an encrypted, restricted, owner-controlled location off the Windows POS.
- Retain sufficient dated generations for incident rollback; never overwrite the only known-good copy.
- Periodically run read-only package parsing/checksum and `pg_restore --list` checks. Rehearse restores only in an isolated non-production project.

The first known-good Production application backup was generated at `2026-09-13T08:27:40.804Z`: format 1, application 0.1.0, schema `202609120003_phase7_restore_mode`, manifest checksum `7999157b478aa2f70e43c6f61b7c8de61ef0574b83f3c45ce26d889873d40ed4`. Its checksum, relations, counts, and credential exclusions passed. The first PostgreSQL 17 custom-format dump passed `pg_restore --list`; its file SHA-256 is `7cfe350bfaf20d636a659edb59ae7afa984fe1520b71b6311526f631807c13e7`. Both copies are stored with owner-only permissions in the off-POS backup location.

Never confirm the application restore against live Production. In an incident, stop new transactions, preserve current state/logs, validate and rehearse the chosen backup in isolation, obtain owner approval for the maintenance window, restore with the appropriate provider/application/database method, verify financial/authentication/relationship integrity, then reopen and document the incident.
