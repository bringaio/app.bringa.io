# Supabase

Supabase is the current backend for Auth, Postgres, Storage, RLS, and Edge Functions.

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

## Privacy Default

Do not query real user contents unless the user explicitly approves it for the task. Counts, schema, policies, and anonymized examples are preferred.
