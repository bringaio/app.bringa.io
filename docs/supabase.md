---
title: Supabase
---

# Supabase

Supabase is the current backend for Auth, Postgres, Storage, RLS, and Edge Functions.

Before changing schema or policies, read [Supabase Contract Audit](supabase-contract-audit.md).

## Before MCP Access

- Configure `.env.local` from `.env.example`.
- Do not add real service role keys to docs or commits.
- Use `pnpm backup:supabase` only after confirming the target project.
- Prefer schema and policy review before reading real rows.

## Tomorrow's MCP Review

When Supabase MCP and service role access are available, inspect:

- Tables, columns, constraints, indexes, triggers, functions, and migration drift.
- RLS policies for `profiles`, `admins`, `items`, `borrow_history`, `item_sharing`, and Storage buckets.
- Whether invite validation, admin promotion, borrow/return, visibility, deletion, and moderation should move behind RPC functions.
- Edge Function names, secrets, app URL defaults, retry behavior, and Telegram notification throttling.
- Storage limits for image MIME types, file size, animated formats, cleanup, title images, and export/download.

Use the audit checklist to compare local UI behavior, schema, migrations, Storage, and Edge Functions before proposing migrations.

## Storage Contract

The upstream schema creates a public `items` bucket for item images and mirrors the default media settings from `config/bringa.config.jsonc`:

- MIME types: `image/jpeg`, `image/png`, `image/webp`
- File size limit: `10485760` bytes
- Upload permission: validated authenticated users can insert into the `items` bucket

Public buckets provide public download URLs. Upload, list, update, and delete operations still require Storage policies.

Storage object deletion must go through the Storage API, not direct SQL, so that files are removed instead of orphaned.

## Privacy Default

Do not query real user contents unless the user explicitly approves it for the task. Counts, schema, policies, and anonymized examples are preferred.
