---
title: Maintenance
---

# Maintenance

## Regular Tasks

- Run `pnpm backup:supabase` before production database work when `SUPABASE_SERVICE_ROLE_KEY` is configured.
- Keep Supabase free-tier projects active, or document the paid/self-hosted plan for deployments that must not pause.
- Run `pnpm check:config`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build` before releases.
- Review dependencies and security advisories regularly.
- Run `pnpm outdated` before dependency upgrade work and record major-version deferrals in `docs/dependency-audit.md`.
- Verify Auth providers, redirect URLs, Edge Function secrets, Telegram chat IDs, and Storage bucket policies after deployment changes.
- Update `.agents/` and `docs/optimization-options.md` when repeated maintenance friction appears.

## Supabase Backup Scope

`pnpm backup:supabase` exports configured Postgres tables and configured Storage buckets to `backups/supabase/<timestamp>/`. By default it backs up the public tables listed in `scripts/backup-supabase.mjs` and the `items` Storage bucket. Use `SUPABASE_BACKUP_TABLES`, `SUPABASE_BACKUP_STORAGE_BUCKETS`, `SUPABASE_BACKUP_PAGE_SIZE`, and `SUPABASE_BACKUP_STORAGE_PAGE_SIZE` for deployment-specific scope; set a list variable to `none` to skip that surface deliberately.

Set `SUPABASE_BACKUP_AUTH_USERS=1` to export Supabase Auth user metadata through the Admin API to `auth-users.json`. This does not export passwords, provider secrets, or a complete Auth restore package; treat it as operator metadata for reconciliation. Keep backup directories encrypted at rest and test restore procedures before relying on them operationally.

After `backup_runs` has been migrated, the backup script records compact run metadata in Supabase by default. The admin dashboard reads the latest admin-visible row to show backup freshness without exposing backup files or project secrets in public assets. Set `SUPABASE_BACKUP_RECORD_RUN=0` to skip this status write for a one-off run.

Run `pnpm verify:backup <backup-directory>` after a local backup and before any restore drill. The verifier reads `manifest.json`, checks table JSON row counts, verifies Storage object counts, byte totals, and SHA-256 hashes, and checks optional Auth user metadata counts when exported. It is an integrity gate for the files this repository writes; it does not replace a live restore rehearsal.

Supabase database backups do not restore Storage object bytes, and Auth exports are not complete account restore packages. Treat table JSON, Storage object downloads, optional Auth metadata, and Supabase platform backups as separate recovery surfaces that need their own restore drill.

User-facing data export is separate from operator backups. It is provided through `export_my_data` and covers the authenticated user's profile, created items, borrowed items, borrow history, deletion request history, item suggestions, and item flags. Account deletion requests are operator-reviewed. The approved database-side completion stage anonymizes app data and hides user-owned contributions, but Supabase Auth deletion and Storage object cleanup still require a trusted service-role workflow.

## Local Verification Notes

- `pnpm lint` is expected to pass without warnings.
- In Codex Desktop, `pnpm build` can fail inside the sandbox when Turbopack attempts to bind a local helper port. Rerun with approved escalation before treating that as an application build failure.

## Current Known Gaps

- Supabase MCP/service-role review is pending.
- Live restore drills and encrypted backup retention policy are pending.
- Maskable PNG icons and complete homescreen testing are pending.
