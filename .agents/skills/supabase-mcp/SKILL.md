---
name: supabase-mcp
description: Use when connecting this repository to Supabase MCP, reviewing Supabase schema or policies, preparing backups, or planning database/auth/storage changes.
---

# Supabase MCP

Protect privacy first. Before reading real table contents, ask the user for explicit approval and explain why schema-only access is insufficient.

## Before Connecting

- Read `supabase/README.md`, `docs/supabase.md`, `docs/supabase-contract-audit.md`, `docs/maintenance.md`, and the Supabase entries in `docs/optimization-options.md`.
- Confirm the target: production, staging, or development.
- Confirm whether real user data may be inspected. Default: no.
- Run or offer `pnpm backup:supabase` when `SUPABASE_SERVICE_ROLE_KEY` is available.
- Prefer schema, RLS policies, functions, triggers, storage bucket settings, and anonymized counts.
- Compare the live contract with `supabase/schema.sql`, migrations, edge functions, and client mutations before proposing changes.

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
- Use official Supabase docs or Context7 for current MCP, custom domain, self-hosting, and Auth provider setup details.
- Never paste secrets into docs. Document variable names only.
- Do not read or summarize real user rows unless the user explicitly approves that exact access.
