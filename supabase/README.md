# Supabase Contract

This directory defines the generic upstream Supabase contract for `app.bringa.io`.

Do not inspect or commit real production user data while working here.

## Sources Of Truth

- `schema.sql`: consolidated fresh-project schema for a new Supabase project.
- `migrations/*.sql`: incremental upgrade path for existing projects.
- `migrations/old/`: legacy reference only. Do not apply these files to new projects unless a maintainer explicitly asks for a historical recovery task.
- `functions/`: Supabase Edge Functions.
- `config.toml`: local Supabase CLI function configuration.

## Migration Rules

- Add a timestamped migration for every schema, policy, function, trigger, bucket, or Storage policy change.
- Keep `schema.sql` aligned with the resulting fresh-project state.
- Keep project-specific URLs, tokens, and secrets out of SQL and committed files.
- Prefer RPCs for browser-triggered mutations so RLS policies can stay narrow.
- Do not delete Storage objects with SQL metadata deletes. Use the Storage API so files are actually removed.
- Run secret-free app checks after changing Supabase-facing code:

```bash
pnpm check:config
pnpm check:supabase-contract
pnpm lint
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=dummy pnpm build
```

## Current RPC Boundary

The browser should call RPCs for these writes:

- `verify_and_apply_invite`
- `create_item`
- `update_item`
- `borrow_item`
- `return_item`
- `delete_item`
- `promote_admin`
- `demote_admin`
- `get_my_invite_code`
- `set_my_invite_code`

Direct browser reads still use RLS policies where appropriate. Direct browser writes to core item state should be avoided.
Direct browser writes to `borrow_history` are also blocked; borrow history is maintained by `borrow_item` and `return_item`.
Borrow history reads are admin-only by default.

## Current Integrity Boundary

`pnpm check:supabase-contract` verifies the consolidated schema contains:

- core browser-write RPCs;
- blocked direct item and borrow-history writes;
- admin-only borrow-history reads;
- item-image Storage bucket limits aligned with resolved deployment config;
- `borrow_history.item_id` and `item_sharing.item_id` foreign keys to `items.id`;
- unique admin invite codes.

## Before Live Review

When Supabase MCP or service-role access is available, inspect schema and metadata first:

- table definitions;
- RLS policies;
- functions and triggers;
- Storage buckets and object policies;
- Edge Function configuration;
- Auth providers and redirect URLs.

Ask the user before reading real row contents.
