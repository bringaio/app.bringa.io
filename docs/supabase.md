---
title: Supabase
---

# Supabase

Supabase is the current backend for Auth, Postgres, Storage, RLS, and Edge Functions.

Before changing schema or policies, read [Supabase Contract Audit](supabase-contract-audit.md).
The repository-level Supabase source-of-truth notes live in `supabase/README.md`.
Agent and maintainer setup for Supabase MCP lives in [Supabase MCP Agent Setup](supabase-mcp.md).
Future development-branch setup tasks live in [Supabase Branching](supabase-branching.md).
Restore rehearsal and encrypted retention evidence live in [Restore Drills](restore-drills.md).
Privacy-preserving diagnostics and live log boundaries live in [Observability](observability.md).
Run `pnpm check:supabase-contract` after changing RPCs, item write policies, or Storage bucket limits.

## Quick Operator Setup

For a fork that wants to run the app:

1. Create a Supabase project.
2. Apply the committed schema and migrations from `supabase/`.
3. Create or confirm the `items` Storage bucket and policies through the schema/migration flow.
4. Configure Auth providers such as GitHub or Google in Supabase.
5. Set the Supabase Site URL to the final app URL, for example `https://share.example.org`.
6. Add the exact app redirect URL used by `supabase.authRedirectPath`, for example `https://share.example.org/dashboard`.
7. Copy the public project URL and publishable key into `config/deployments/<slug>.jsonc`.
8. Keep service role keys, OAuth secrets, and provider secrets outside Git.

The public project URL and publishable key are expected to reach the browser. They are safe only when Row Level Security, Storage policies, and RPC boundaries are correct. Run `pnpm check:supabase-contract` after schema or policy changes.

Hosted Supabase is the default documented path. Self-hosted Supabase is possible, but currently needs operator-owned documentation for backups, upgrades, SMTP/Auth provider configuration, Storage, Edge Functions, and observability.

## Before MCP Access

- Configure `.env.local` from `.env.example`.
- Do not add real service role keys to docs or commits.
- Use `pnpm backup:supabase` only after confirming the target project.
- Prefer schema and policy review before reading real rows.
- Use [Supabase MCP Agent Setup](supabase-mcp.md) for project-scoped MCP, read-only audit mode, `app-bringa-io` creation, and service-role or secret-key handoff.

## Live MCP Review

When Supabase MCP and service role access are available, inspect:

- Tables, columns, constraints, indexes, triggers, functions, and migration drift.
- RLS policies for `profiles`, `admins`, `items`, `borrow_history`, `item_sharing`, and Storage buckets.
- Whether invite validation, admin promotion, borrow/return, visibility, deletion, and moderation should move behind RPC functions.
- Edge Function names, secrets, app URL defaults, retry behavior, and Telegram notification throttling.
- Edge Function logs, dashboard Invocations, and Logs Explorer access boundaries without copying personal data.
- Storage limits for image MIME types, file size, animated formats, cleanup, title images, and export/download.

Use the audit checklist to compare local UI behavior, schema, migrations, Storage, and Edge Functions before proposing migrations.

## Storage Contract

The upstream schema creates a public `items` bucket for item images and mirrors the default media settings from resolved deployment config:

- MIME types: `image/jpeg`, `image/png`, `image/webp`
- File size limit: `10485760` bytes
- Upload permission: validated authenticated users can insert into the `items` bucket

Public buckets provide public download URLs. Upload, list, update, and delete operations still require Storage policies.

Storage object deletion must go through the Storage API, not direct SQL, so that files are removed instead of orphaned.

## Privacy Default

Do not query real user contents unless the user explicitly approves it for the task. Counts, schema, policies, and anonymized examples are preferred.
