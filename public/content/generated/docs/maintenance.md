# Maintenance

## Regular Tasks

- Run `pnpm backup:supabase` before production database work when `SUPABASE_SECRET_KEY`, `SUPABASE_SECRET_KEYS`, or legacy `SUPABASE_SERVICE_ROLE_KEY` is configured.
- Keep Supabase free-tier projects active, or document the paid/self-hosted plan for deployments that must not pause.
- Run `pnpm check:config`, `pnpm check:supabase-cli`, `pnpm check:edge-functions`, `pnpm check:security-maintenance`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build` before releases.
- Review dependencies and security advisories regularly.
- Run `pnpm outdated` before dependency upgrade work and record major-version deferrals in `docs/dependency-audit.md`.
- Verify Auth providers, redirect URLs, Edge Function secrets, Telegram chat IDs, and Storage bucket policies after deployment changes.
- Update `.agents/` and `docs/optimization-options.md` when repeated maintenance friction appears.

## Supabase Backup Scope

`pnpm backup:supabase` exports configured Postgres tables and configured Storage buckets to `backups/supabase/<timestamp>/`. Configure it with `SUPABASE_URL` or `SUPABASE_PROJECT_REF` plus `SUPABASE_SECRET_KEY` or `SUPABASE_SECRET_KEYS`; legacy `SUPABASE_SERVICE_ROLE_KEY` is fallback-only. By default it backs up the public tables listed in `scripts/backup-supabase.mjs` and the `items` Storage bucket. Use `SUPABASE_BACKUP_TABLES`, `SUPABASE_BACKUP_STORAGE_BUCKETS`, `SUPABASE_BACKUP_PAGE_SIZE`, and `SUPABASE_BACKUP_STORAGE_PAGE_SIZE` for deployment-specific scope; set a list variable to `none` to skip that surface deliberately.

Run `pnpm check:env-example` after changing backup defaults or `.env.example`. It verifies that the example backup table and Storage bucket defaults still match the backup script source of truth.

Use `pnpm check:supabase-maintenance-key` after configuring `SUPABASE_URL` or `SUPABASE_PROJECT_REF` plus a server-only key. The check prefers `SUPABASE_SECRET_KEY`, falls back to legacy `SUPABASE_SERVICE_ROLE_KEY` only when no modern key is present, and prints only key names, key type, key length, and API status. Set `SUPABASE_MAINTENANCE_CHECK_AUTH=1` to also verify the Auth Admin API with a one-row metadata probe, and `SUPABASE_MAINTENANCE_CHECK_ALL_KEYS=1` when intentionally comparing the modern key with the legacy fallback.

Set `SUPABASE_BACKUP_AUTH_USERS=1` to export Supabase Auth user metadata through the Admin API to `auth-users.json`. This does not export passwords, provider secrets, or a complete Auth restore package; treat it as operator metadata for reconciliation. Keep backup directories encrypted at rest and test restore procedures before relying on them operationally.

After `backup_runs` has been migrated, the backup script records compact run metadata in Supabase by default. The admin dashboard reads the latest admin-visible row to show backup freshness without exposing backup files or project secrets in public assets. Set `SUPABASE_BACKUP_RECORD_RUN=0` to skip this status write for a one-off run.

Run `pnpm verify:backup <backup-directory>` after a local backup and before any restore drill. The verifier reads `manifest.json`, checks table JSON row counts, verifies Storage object counts, byte totals, and SHA-256 hashes, and checks optional Auth user metadata counts when exported. It is an integrity gate for the files this repository writes; it does not replace a live restore rehearsal.

Supabase database backups do not restore Storage object bytes, and Auth exports are not complete account restore packages. Treat table JSON, Storage object downloads, optional Auth metadata, and Supabase platform backups as separate recovery surfaces that need their own restore drill.

Use [Restore Drills](restore-drills.md) for the evidence checklist before claiming recovery readiness. Restore evidence must identify the non-production target, verified backup directory, database restore method, Storage restore method, Auth metadata reconciliation, encrypted-at-rest location, retention period, and cleanup decision.

User-facing data export is separate from operator backups. It is provided through `export_my_data` and covers the authenticated user's profile, created items, borrowed items, borrow history, deletion request history, item suggestions, and item flags. Account deletion requests are operator-reviewed. The approved database-side completion stage anonymizes app data and hides user-owned contributions, but Supabase Auth deletion and Storage object cleanup still require a trusted server-side maintenance workflow.

Use `pnpm cleanup:account-deletion` only after the deletion request is completed in the app database and after backup, export, retention, and Storage path review are complete. The helper uses `SUPABASE_URL` or `SUPABASE_PROJECT_REF` plus `SUPABASE_SECRET_KEY` or `SUPABASE_SECRET_KEYS`; legacy `SUPABASE_SERVICE_ROLE_KEY` is fallback-only. It defaults to dry-run, requires `--execute --confirm-user-id <auth-user-id>` for destructive work, removes supplied Storage paths before Auth deletion, and verifies the completed request row before making destructive Supabase calls.

## Local Verification Notes

- `pnpm lint` is expected to pass without warnings.
- `pnpm check:edge-functions` type-checks Supabase Edge Functions with Deno and disables root lockfile discovery so local checks do not create a repository-level `deno.lock`.
- In Codex Desktop, `pnpm build` can fail inside the sandbox when Turbopack attempts to bind a local helper port. Rerun with approved escalation before treating that as an application build failure.

## Agent-Assisted Security Maintenance

After dependency upgrades, Supabase migrations, RLS policy changes, Edge Function changes, Auth changes, or deployment workflow changes, agents should use `.agents/skills/security-maintenance/`. The skill keeps the evidence workflow explicit: secret scan, config freshness, Supabase contract, repo-local Supabase CLI contract when branch or migration workflow changes, Security maintenance contract check, Edge Function Deno typecheck, lint, TypeScript, static build, manual CI, and live Supabase advisor or backup evidence when the claim depends on it.

Use [Security](security.md) as the public runbook for this workflow. Treat the command list as a floor, not a proof by itself: if a change touches Auth, Storage, RLS, Edge Function secrets, uploads, deletion, backups, GitHub Pages, or repository settings, collect evidence for that surface specifically.

Suggested security checks by change type:

- Dependency upgrades: `pnpm outdated`, focused package changelog review, `pnpm check:secrets`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, and affected unit checks.
- Supabase schema or RLS changes: backup decision, advisor output when available, `pnpm check:supabase-contract`, `pnpm check:supabase-cli` when branch or remote migration workflow changes, focused RPC/policy tests, and restore-drill impact review.
- Edge Function changes: `pnpm check:edge-functions`, secret-setting review, JWT requirement review, function log review after deployment, and Telegram delivery verification when relevant.
- Auth or protected-route changes: auth redirect tests, protected-route tests, local demo guard tests, browser evidence, and Supabase Site URL/redirect URL review.
- GitHub Pages or workflow changes: `pnpm test:github-workflows`, `pnpm check:github-workflows`, `pnpm check:static-export`, static build, and repository settings review.
- Fork setup changes: deployment config generation, secret scan, local demo verification, public Supabase value review, and a remaining-operator-task list.

## Current Known Gaps

- Supabase live schema and Edge Function baseline exists; Auth provider redirects, Edge Function secrets, and restore drills are still pending.
- Live restore drills and encrypted backup retention policy are pending.
- Complete homescreen, PWA install, and platform-specific icon behavior testing are pending.
