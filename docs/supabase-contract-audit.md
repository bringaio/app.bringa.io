---
title: Supabase Contract Audit
---

# Supabase Contract Audit

This audit is based on local source files only. It does not inspect live Supabase rows or real user data.

Use it as the first checklist when Supabase MCP or server-side maintenance access is available.

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
- Item details call `request_item_visibility` for user hide/request-visible actions instead of writing visibility fields directly.

Current schema:

- `borrow_item` and `return_item` are defined in `supabase/schema.sql`.
- Direct `items` updates and direct `borrow_history` inserts are blocked by RLS.
- Borrow history reads are admin-only in the consolidated schema; legacy read-all policies must be removed by migration.

Risk:

- Live projects must include the RPC migration before deploying the UI change.
- Live projects with older schema-dump policies must drop all legacy direct-insert and read-all borrow-history policies.

Target:

- Use RPCs such as `borrow_item(item_id)` and `return_item(item_id)` that validate availability, borrower, history, and authorization atomically.

### Admin Mutations

Current UI:

- Item create calls `create_item`.
- Item edit calls `update_item`.
- `src/app/admin/users/page.tsx` calls `set_profile_validation`, `promote_admin`, and `demote_admin`.
- `src/app/admin/invite-code/page.tsx` calls `get_my_invite_code` and `set_my_invite_code`.
- Admins can open the item edit UI for non-created items.
- Item delete calls `delete_item`; direct item deletes are blocked by RLS.

Risk:

- Live projects must include the item/admin RPC migrations before deploying these UI changes.
- Item delete is still a hard delete internally and needs lifecycle, versioning, retention, and Storage cleanup design.

Target:

- Use RPCs for item creation, item updates, admin promotion/demotion, item visibility changes, user visibility requests, admin edits, and deletion/archive behavior.
- Keep role escalation and moderation rules out of browser-controlled table updates.

### Item Lifecycle

Current model:

- `items` keeps current `status`, `borrowed_by`, `created_by`, and legacy `image_url` fields for the existing UI.
- `items` also prepares `owner_kind`, `owner_profile_id`, `owner_label`, `visibility_state`, deletion metadata, and `handoff_policy`.
- `item_versions` is the queryable append-only versioning source of truth. `create_item`, `update_item`, and `restore_item_version` capture snapshots through `record_item_version`.
- `item_images` exists as prepared metadata for multiple item images, cover image selection, captions, alt text, and moderation state. The current UI still writes one legacy `image_url`.

Risk:

- User deletion, operator-owned items, user-hidden items, admin-hidden items, and deleted-item images are representable in schema, but dependent RPCs, UI flows, Storage cleanup, and export semantics are not complete.

Target:

- Route ownership, remaining suggestion application, image metadata writes, and cleanup through RPCs or Edge Functions before exposing the remaining flows in UI.
- Keep `item_versions` as the versioning source of truth instead of JSON-in-row.

### Moderation Queue

Current model:

- `item_suggestions` records validated-user suggestions for content, image, visibility, owner, or other item improvements.
- `item_flags` records validated-user item issue reports with a bounded reason set.
- Users create both through `create_item_suggestion` and `create_item_flag`; direct browser inserts, updates, and deletes are blocked by RLS.
- Admins inspect and transition queue status in `/admin/moderation` through `review_item_suggestion`, `review_item_flag`, and `set_item_visibility`.
- Admins can also change item visibility from `/admin/user-items` through `set_item_visibility` with a required reason.
- Admins can apply content suggestions through `apply_item_suggestion`, image metadata suggestions through `apply_item_image_suggestion`, and owner suggestions through `apply_owner_item_suggestion`. Application RPCs update explicit item fields or image metadata, mark the suggestion accepted, and record a new item version.

Risk:

- Admin processing records status, reviewer, reviewed time, and admin notes for final app decisions. Content, image metadata, and owner suggestion application update current item fields or image metadata and version the item. User-facing in-app notifications remain incomplete.
- Live projects must apply the moderation migration before enabling the user-facing queue controls.

Target:

- Add focused RPCs for image-metadata suggestion application, item/image-specific review actions, and Telegram seen-state.
- Keep moderation rows in user export and table backups so users and operators can audit feedback history.

### Storage

Current UI:

- Create and edit validate configured image MIME types and max upload bytes.
- Both paths upload a single WebP to the public `items` bucket.

Current schema:

- `supabase/schema.sql` defines the public `items` bucket with MIME and file-size limits.
- `item_images` prepares metadata for multiple images, cover image selection, captions, alt text, and moderation state.
- `storage.objects` allows validated authenticated users to upload into the `items` bucket.
- Older migrations contain legacy Storage policy material that may not match the generic upstream.

Risk:

- Live projects must include the Storage bucket migration before relying on server-side upload limits.
- Deleting an item does not clean up or preserve images according to a documented policy.
- SQL deletes must not be used to remove Storage objects because that can orphan files.

Target:

- Define bucket creation, MIME allowlist, size limits, ownership paths, public/private access, cleanup, and export behavior in one place.
- Keep create/edit upload validation aligned with resolved deployment config.
- Keep browser metadata writes for item images behind narrow RPCs; full multiple-image create/edit UI is still pending.

### Edge Functions And Telegram

Current schema:

- Webhook trigger functions read Edge Function URLs from database settings and skip delivery when unset.
- Function directory names use `notifiy`, which should be corrected carefully if renaming.

Current functions:

- Telegram notifications enqueue `notification_events` before delivery, suppress duplicate unseen events by dedupe key, honor `notification_mutes`, and record send status through `record_notification_delivery`.
- Telegram payloads contain only a short title and an app-relative URL by default. Admins use the app for details instead of receiving row bodies, emails, names, or notes in Telegram.
- User profile notifications avoid email by default and use the same minimal event payload contract.

Risk:

- Fresh forks must configure webhook URL settings before expecting Telegram delivery.
- A deployment still needs its webhook URLs, function secrets, and service role status write tested with approved live access.

Target:

- Keep project URLs/secrets in deploy-time configuration.
- Keep `notification_events` and `notification_mutes` as the source of truth for dedupe, seen-state, mute windows, and retry planning.
- Add an operator retry job only if manual retry planning is not enough for the deployment.

### Schema And Migration Drift

Current state:

- `supabase/schema.sql` is a consolidated fresh setup schema.
- Existing migrations include older project-specific names and policies.
- The local contract checker now verifies core item-reference foreign keys and invite-code uniqueness in addition to RPCs, RLS policy names, and Storage limits.

Risk:

- Fresh installs and incremental upgrades may create different security behavior.

Target:

- Treat `supabase/schema.sql` as the authoritative baseline for fresh projects; use `supabase/migrations/` as the reviewed incremental upgrade path for existing deployments.
- Keep migration docs explicit about production upgrade order.
- Remove or quarantine obsolete project-specific assumptions.
- Add checker coverage when new ownership, visibility, versioning, moderation, and media tables become durable schema.

### Backup Scope

Current script:

- `scripts/backup-supabase.mjs` backs up configured public tables and configured Storage buckets.
- It can optionally export Supabase Auth user metadata with `SUPABASE_BACKUP_AUTH_USERS=1`, but it does not export passwords, provider secrets, or a full Auth restore package.
- After the `backup_runs` migration is present, the backup script records compact run metadata by default. The admin dashboard reads the latest admin-visible row for backup freshness.
- User-facing `export_my_data` returns profile, created items, currently borrowed items, borrow history, deletion request history, item suggestions, and item flags for the authenticated user.
- `request_account_deletion` records one active operator-reviewed request while a request is `pending` or `reviewing`.
- `review_account_deletion_request` lets admins mark requests `reviewing` or `cancelled` and record review metadata.
- `execute_account_deletion_request` lets admins complete the database-side deletion stage for requests already in review. It anonymizes the profile, hides user-owned or user-created non-operator items, clears prepared profile references, records item versions for hidden items, and returns counters plus Auth/Storage follow-up flags.
- `pnpm cleanup:account-deletion` provides the trusted server-side follow-up for completed requests. It is dry-run-first, verifies the completed request row, removes supplied Storage object paths through the Storage API before Auth deletion, and calls `auth.admin.deleteUser` only when `--execute --confirm-user-id <auth-user-id>` are supplied.

Risk:

- Operators may believe backups are complete without restore drills, encrypted retention policy, and Auth/Storage reconciliation checks.
- Users may expect account deletion to be immediate unless UI and operator docs stay explicit about review, retention, Storage cleanup, and Auth deletion boundaries.

Target:

- Add restore drills and encrypted backup handling before claiming operational readiness.
- Rehearse trusted Auth deletion and Storage cleanup with approved access, backup/export evidence, and operator retention policy before claiming live operational readiness.

## Required RPC Candidates

- `verify_and_apply_invite(invite_code_input text)`
- `borrow_item(item_id uuid)`
- `return_item(item_id uuid)`
- `create_item(...)`
- `update_item(...)`
- `set_item_visibility(...)`
- `request_item_visibility(...)`
- `delete_item(item_id uuid)`
- `archive_or_delete_item(...)`
- `set_profile_validation(profile_id uuid, profile_valid boolean)`
- `promote_admin(profile_id uuid)`
- `demote_admin(profile_id uuid)`
- `get_my_invite_code()`
- `set_my_invite_code(invite_code_input text)`
- `create_item_suggestion(...)`
- `create_item_flag(...)`
- `review_item_suggestion(...)`
- `apply_item_suggestion(...)`
- `apply_item_image_suggestion(...)`
- `apply_owner_item_suggestion(...)`
- `review_item_flag(...)`
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
