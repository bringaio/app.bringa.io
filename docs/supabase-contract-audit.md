---
title: Supabase Contract Audit
---

# Supabase Contract Audit

This audit is based on local source files only. It does not inspect live Supabase rows or real user data.

Use it as the first checklist when Supabase MCP or service-role access is available.

## Contract Goal

The app, schema, migrations, Storage buckets, RLS policies, RPCs, Edge Functions, and docs should describe one backend contract.

The target contract:

- user-facing mutations preserve data invariants even when called by an untrusted browser;
- RLS policies are narrow and understandable;
- admin actions are explicit and auditable;
- uploads are constrained by frontend and backend limits;
- notification behavior is privacy-preserving and throttled;
- forks can configure project-specific values without editing shared logic.

## Local Findings

### Invite Flow

Current UI:

- `src/app/invite/page.tsx` calls `verify_and_apply_invite`.
- The client does not need to read `admins.invite_code` or write validation fields directly.

Current schema:

- `supabase/schema.sql` defines `public.verify_and_apply_invite(invite_code_input text)`.
- `admins` has an admin-only policy, so normal users should not read invite codes directly.
- `prevent_profile_escalation()` prevents authenticated users from changing validation fields directly.

Risk:

- Live projects must include the RPC migration before deploying the UI change.

Target:

- The invite page should call an RPC that validates and applies the code atomically.
- The client should never read invite codes directly.

### Borrow And Return

Current UI:

- `src/app/items/details/page.tsx` calls `borrow_item` and `return_item`.
- The client does not write item status or borrow history directly for borrow/return.

Current schema:

- `items` updates are allowed only for admins or item creators.
- `borrow_history` insert is allowed for validated users, but return updates are not clearly available to borrowers.

Risk:

- Live projects must include the RPC migration before deploying the UI change.

Target:

- Use RPCs such as `borrow_item(item_id)` and `return_item(item_id)` that validate availability, borrower, history, and authorization atomically.

### Admin Mutations

Current UI:

- `src/app/admin/users/page.tsx` calls `promote_admin` and `demote_admin`.
- `src/app/admin/invite-code/page.tsx` calls `get_my_invite_code` and `set_my_invite_code`.
- Admins can open the item edit UI for non-created items.
- Item delete uses direct hard delete.

Risk:

- Live projects must include the admin RPC migrations before deploying the admin role or invite-code UI changes.
- Item delete and admin edit behavior still need lifecycle, versioning, and moderation design.

Target:

- Use RPCs for admin promotion/demotion, item visibility changes, admin edits, and deletion/archive behavior.
- Keep role escalation and moderation rules out of browser-controlled table updates.

### Item Lifecycle

Current model:

- `items` has `status`, `borrowed_by`, `created_by`, and one `image_url`.
- There is no explicit owner, visibility state, soft deletion, version table, moderation state, or image table.

Risk:

- User deletion, operator-owned items, user-hidden items, admin-hidden items, and deleted-item images cannot be represented clearly.

Target:

- Add explicit ownership, visibility, and versioning before building dependent workflows.
- Prefer a separate version table over JSON-in-row if queryability and restore audit matter.

### Storage

Current UI:

- Create item validates configured image MIME types and max upload bytes.
- Edit item still accepts `image/*` and uses hardcoded compression settings.
- Both paths upload a single WebP to the public `items` bucket.

Current schema:

- `supabase/schema.sql` defines the public `items` bucket with MIME and file-size limits.
- `storage.objects` allows validated authenticated users to upload into the `items` bucket.
- Older migrations contain legacy Storage policy material that may not match the generic upstream.

Risk:

- Live projects must include the Storage bucket migration before relying on server-side upload limits.
- Deleting an item does not clean up or preserve images according to a documented policy.
- SQL deletes must not be used to remove Storage objects because that can orphan files.

Target:

- Define bucket creation, MIME allowlist, size limits, ownership paths, public/private access, cleanup, and export behavior in one place.
- Keep create/edit upload validation aligned with `config/bringa.config.jsonc`.

### Edge Functions And Telegram

Current schema:

- Webhook trigger functions read Edge Function URLs from database settings and skip delivery when unset.
- Function directory names use `notifiy`, which should be corrected carefully if renaming.

Current functions:

- Telegram notifications do not implement unseen-request throttling, admin mute windows, or privacy minimization.
- User notifications avoid email by default and send a minimal profile activity summary.

Risk:

- Fresh forks must configure webhook URL settings before expecting Telegram delivery.
- Telegram can still become overly chatty until request dedupe and mute state exist.

Target:

- Keep project URLs/secrets in deploy-time configuration.
- Use a notification event table or state table for dedupe, seen-state, mute windows, and retry behavior.
- Send minimal Telegram summaries and link admins back into the app for details.

### Schema And Migration Drift

Current state:

- `supabase/schema.sql` is a consolidated fresh setup schema.
- Existing migrations include older project-specific names and policies.

Risk:

- Fresh installs and incremental upgrades may create different security behavior.

Target:

- Decide whether `supabase/schema.sql` or migrations are authoritative for fresh setup.
- Keep migration docs explicit about production upgrade order.
- Remove or quarantine obsolete project-specific assumptions.

### Backup Scope

Current script:

- `scripts/backup-supabase.mjs` backs up configured public tables.
- It does not back up Supabase Auth users or Storage objects.

Risk:

- Operators may believe backups are complete when they are table-only.

Target:

- Document Storage and Auth export limits.
- Add restore drills and encrypted backup handling before claiming operational readiness.

## Required RPC Candidates

- `verify_and_apply_invite(invite_code_input text)`
- `borrow_item(item_id uuid)`
- `return_item(item_id uuid)`
- `create_item(...)`
- `update_item(...)`
- `set_item_visibility(...)`
- `archive_or_delete_item(...)`
- `promote_admin(profile_id uuid)`
- `demote_admin(profile_id uuid)`
- `get_my_invite_code()`
- `set_my_invite_code(invite_code_input text)`
- `create_item_suggestion(...)`
- `create_item_flag(...)`
- `mark_moderation_seen(...)`
- `set_telegram_mute(...)`

Names are placeholders. Confirm naming conventions before implementing.

## MCP Review Checklist

When MCP is connected, inspect only schema and metadata unless the user approves row access:

- tables, columns, constraints, indexes;
- functions, triggers, and security definer settings;
- RLS policies and helper functions;
- Storage buckets, object policies, MIME limits, and public/private settings;
- Edge Function names, secrets, environment variables, and deployment URLs;
- Auth providers, redirect URLs, and profile trigger behavior;
- anonymous counts only where useful.

Do not read or summarize real user rows without explicit approval.

## Implementation Order

1. Freeze current contract in docs before changing schema.
2. Design RPCs and RLS together.
3. Add migrations for RPCs and policy tightening.
4. Update UI calls to RPCs.
5. Add browser-test scenarios for invite, borrow, return, admin actions, and upload limits.
6. Verify on development data before production.
7. Only then consider broader ownership, visibility, versioning, and media model migrations.
