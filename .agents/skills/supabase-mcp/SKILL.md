---
name: supabase-mcp
description: Use when connecting this repository to Supabase MCP, reviewing Supabase schema or policies, preparing backups, or planning database/auth/storage changes.
---

# Supabase MCP

Protect privacy first. Before reading real table contents, ask the user for explicit approval and explain why schema-only access is insufficient.

## Before Connecting

- Confirm the target: production, staging, or development.
- Confirm whether real user data may be inspected. Default: no.
- Run or offer `pnpm backup:supabase` when `SUPABASE_SERVICE_ROLE_KEY` is available.
- Prefer schema, RLS policies, functions, triggers, storage bucket settings, and anonymized counts.

## Questions To Resolve

- Which Supabase project is production for `app.bringa.io`?
- Will development use a separate project, branch, or local Supabase?
- Which OAuth providers should be enabled beyond GitHub and Google?
- Should invite approval be admin-mediated through RPC instead of direct client updates?
- Which Storage buckets exist, and what are their size/type/RLS limits?
- How should deleted users, owner reassignment, item visibility, and image retention be enforced in SQL?

## MCP Notes

- Keep project-specific MCP credentials scoped to this repository. Prefer repo-local MCP configuration when available.
- Use official Supabase docs or Context7 for current MCP, custom domain, self-hosting, and Auth provider setup details.
- Never paste secrets into docs. Document variable names only.
