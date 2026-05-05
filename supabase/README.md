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
- `set_profile_validation`
- `get_my_invite_code`
- `set_my_invite_code`
- `export_my_data`
- `request_account_deletion`
- `review_account_deletion_request`
- `create_item_suggestion`
- `create_item_flag`
- `review_item_suggestion`
- `apply_item_suggestion`
- `apply_item_image_suggestion`
- `apply_owner_item_suggestion`
- `review_item_flag`
- `restore_item_version`
- `set_item_visibility`
- `request_item_visibility`

`record_item_version` is an internal SQL helper used by item create, update, and restore functions. Direct browser execution is revoked.

Direct browser reads still use RLS policies where appropriate. Direct browser writes to core item state should be avoided.
Direct browser writes to `borrow_history` are also blocked; borrow history is maintained by `borrow_item` and `return_item`.
Borrow history reads are admin-only by default.

## Current Integrity Boundary

`pnpm check:supabase-contract` verifies the consolidated schema contains:

- core browser-write RPCs;
- blocked direct item and borrow-history writes;
- admin-only borrow-history reads;
- item-image Storage bucket limits aligned with resolved deployment config;
- item ownership, visibility, deletion, and handoff columns;
- prepared `item_versions` and `item_images` tables;
- item version capture on create/update and admin restore-by-republish through RPCs;
- admin-only item visibility changes with required reasons;
- user-facing item hide and request-visible changes with required reasons;
- admin-only profile validation changes with self-invalidation protection;
- admin-only content, image metadata, and owner suggestion application with item version capture;
- prepared account deletion request table and non-destructive admin review RPC;
- prepared item suggestion and item flag tables;
- admin-visible `backup_runs` metadata for backup freshness;
- admin-visible `notification_events` and `notification_mutes` for Telegram dedupe, mute windows, seen-state, and retry planning;
- blocked direct browser writes to item versions and item image metadata;
- blocked direct browser writes to account deletion request state;
- blocked direct browser writes to moderation queue state;
- blocked direct browser writes to backup run status;
- blocked direct browser writes to notification event and mute state;
- `borrow_history.item_id` and `item_sharing.item_id` foreign keys to `items.id`;
- unique admin invite codes.

## Data Export And Deletion Requests

`export_my_data` returns the authenticated user's profile, created items, currently borrowed items, borrow history, deletion request history, item suggestions, and item flags as JSON.

`request_account_deletion` records one active operator-reviewed deletion request per user while a request is `pending` or `reviewing`.
`review_account_deletion_request` lets admins mark requests `reviewing` or `cancelled` with review metadata. It does not delete Supabase Auth users, Storage objects, item records, image metadata, or profile rows.

## Moderation Queue

`create_item_suggestion` and `create_item_flag` let validated users send item feedback through RPCs. `review_item_suggestion` and `review_item_flag` let admins transition moderation state through RPCs. `apply_item_suggestion` lets admins apply explicit content item fields from a suggestion review, `apply_item_image_suggestion` applies image suggestions into `item_images`, and `apply_owner_item_suggestion` applies owner suggestions. Application RPCs capture a new item version. Direct browser inserts, updates, and deletes remain blocked.

## Before Live Review

When Supabase MCP or service-role access is available, inspect schema and metadata first:

- table definitions;
- RLS policies;
- functions and triggers;
- Storage buckets and object policies;
- Edge Function configuration;
- Auth providers and redirect URLs.

Ask the user before reading real row contents.
