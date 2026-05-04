---
title: Maintenance
---

# Maintenance

## Regular Tasks

- Run `pnpm backup:supabase` before production database work when `SUPABASE_SERVICE_ROLE_KEY` is configured.
- Keep Supabase free-tier projects active, or document the paid/self-hosted plan for deployments that must not pause.
- Run `pnpm check:config`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build` before releases.
- Review dependencies and security advisories regularly.
- Verify Auth providers, redirect URLs, Edge Function secrets, Telegram chat IDs, and Storage bucket policies after deployment changes.
- Update `.agents/` and `docs/optimization-options.md` when repeated maintenance friction appears.

## Supabase Backup Scope

`pnpm backup:supabase` exports configured Postgres tables to `backups/supabase/<timestamp>/`. It does not export Supabase Auth users or Storage objects. Treat those as separate backup tasks.

## Local Verification Notes

- `pnpm lint` is expected to pass without warnings.
- In Codex Desktop, `pnpm build` can fail inside the sandbox when Turbopack attempts to bind a local helper port. Rerun with approved escalation before treating that as an application build failure.

## Current Known Gaps

- Supabase MCP/service-role review is pending.
- Storage backup/export is not implemented yet.
- Maskable PNG icons and complete homescreen testing are pending.
