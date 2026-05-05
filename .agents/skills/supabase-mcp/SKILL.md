---
name: supabase-mcp
description: Use when connecting this repository to Supabase MCP, reviewing Supabase schema or policies, preparing backups, or planning database/auth/storage changes.
---

# Supabase MCP

Protect privacy first. Before reading real table contents, ask the user for explicit approval and explain why schema-only access is insufficient.

## Before Connecting

- Read `docs/supabase-mcp.md` before project setup or live review.
- Read `supabase/README.md`, `docs/supabase.md`, `docs/supabase-contract-audit.md`, `docs/maintenance.md`, and the Supabase entries in `docs/optimization-options.md`.
- Confirm the target: production, staging, or development.
- Confirm whether real user data may be inspected. Default: no.
- Run or offer `pnpm backup:supabase` when `SUPABASE_SECRET_KEY`, `SUPABASE_SECRET_KEYS`, or legacy `SUPABASE_SERVICE_ROLE_KEY` is available; confirm whether optional Auth user metadata export is approved before setting `SUPABASE_BACKUP_AUTH_USERS=1`.
- Use `pnpm check:supabase-maintenance-key` to verify trusted local server-side keys without printing key values. Prefer `SUPABASE_SECRET_KEY`; treat `SUPABASE_SERVICE_ROLE_KEY` as a legacy fallback.
- For hosted Supabase projects, `SUPABASE_SECRET_KEY` is sufficient for trusted Storage Admin, Auth Admin, and Edge Function admin-client calls. Use legacy `SUPABASE_SERVICE_ROLE_KEY` only as a fallback or comparison target.
- Prefer schema, RLS policies, functions, triggers, storage bucket settings, and anonymized counts.
- Compare the live contract with `supabase/schema.sql`, migrations, edge functions, and client mutations before proposing changes.
- Keep migrations and `supabase/schema.sql` aligned whenever schema, policies, triggers, functions, buckets, or RPCs change.
- Include Edge Functions in the review, but edit them only when the task requires it.
- After live schema changes, run security and performance advisors. Treat anon/PUBLIC SECURITY DEFINER warnings as blockers; document authenticated SECURITY DEFINER RPC warnings when the function is intentionally exposed to signed-in users and has internal authorization checks.
- Run and verify `pnpm backup:supabase` after a fresh live baseline when a maintenance key is configured. The backup helpers accept `SUPABASE_URL` or `SUPABASE_PROJECT_REF`.
- Use official Supabase docs or Context7 before new Supabase tooling, Auth provider, custom domain, self-hosting, or MCP setup work.

## Questions To Resolve

- Which Supabase project is production for `app.bringa.io`?
- Will development use a separate project, branch, or local Supabase?
- Which OAuth providers should be enabled beyond GitHub and Google?
- Should invite approval be admin-mediated through RPC instead of direct client updates?
- Which Storage buckets exist, and what are their size/type/RLS limits?
- How should deleted users, owner reassignment, item visibility, and image retention be enforced in SQL?
- Which changes must be made through migrations, RPCs, or edge functions rather than direct client table access?
- Are Storage object cleanup and backup flows using the Storage API rather than direct SQL metadata deletes?

## MCP Notes

- Keep project-specific MCP credentials scoped to this repository. Prefer repo-local MCP configuration when available.
- Prefer project-scoped mode with `project_ref=<project-ref>` and `read_only=true` for production audits.
- Use `app.bringa.io` as the target project name until the user changes it.
- Do not delete or pause contekt projects without separate explicit confirmation.
- Use official Supabase docs or Context7 for current MCP, custom domain, self-hosting, and Auth provider setup details.
- Put public `supabase.url` and `supabase.publishableKey` in deployment config only after RLS, grants, and Storage policy review.
- Supabase MCP can deploy Edge Functions, but Edge Function secrets and Auth provider redirect URLs may still require the Supabase dashboard, CLI with access token, or another approved management path.
- Never reveal, paste, or commit `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `sb_secret_` values. Document variable names only.
- Never read real user rows without explicit approval.
