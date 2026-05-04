---
title: Admin Operations
---

# Admin Operations

This page describes the current upstream admin surfaces. Keep operational detail here short and link back to the source of truth for schema, config, and maintenance.

## Current Surfaces

- `/admin/dashboard`: item counts, visibility signals, borrowed-first item list, pending queue counts, recent activity, recent uploads, and system-readiness links for config, Supabase, Storage, backups, docs, and Telegram.
- `/admin/users`: profile list, user validation, access revocation with self-protection, admin promotion, admin demotion, and self-demotion protection.
- `/admin/user-items?id=<profile-id>`: admin-only item view grouped by current borrower, owner, and creator relationship for one profile.
- `/admin/item-versions?itemId=<item-id>`: admin-only item version timeline with restore-by-republish through the Supabase RPC contract.
- `/admin/deletion-requests`: non-destructive operator queue for account deletion requests, review notes, cancellation, and per-user item review.
- `/admin/notifications`: read-only notification settings view for Telegram status, mute windows, dedupe, and admin seen-state planning.
- `/admin/invite-code`: current admin invite code display and update flow.
- `/admin/moderation`: pending visibility requests, item suggestions, and flags, with admin review and content/image suggestion application routed through RPCs.

## Review Queues

Moderation queue records live in Supabase:

- `item_suggestions`: user suggestions for content, images, visibility, owner, or other item changes.
- `item_flags`: user issue reports with a bounded reason set.
- `items.visibility_state = 'pending_visible'`: item visibility requests that require an admin reason before approval or hiding.
- `account_deletion_requests`: user account deletion requests for operator triage before any approved destructive workflow.

Users create these records through `create_item_suggestion`, `create_item_flag`, and `request_account_deletion`. Admins transition state through `review_item_suggestion`, `review_item_flag`, `set_item_visibility`, and `review_account_deletion_request`; content/image suggestions can be applied through `apply_item_suggestion`. Final suggestion and flag decisions require an admin note; cancelled deletion requests require an admin note. Direct browser inserts, updates, and deletes remain blocked by RLS.

Status transitions record reviewer and reviewed time. Applying a content/image suggestion updates explicit item fields and creates a new `item_versions` snapshot. Owner-specific application, image metadata application, user notifications, and Telegram seen-state are still pending.

Item creation, item updates, and admin version restore create append-only `item_versions` snapshots through `record_item_version`. Admin restore uses `restore_item_version` and records the restore reason as the newly current version.

The deletion request route is non-destructive. It can mark requests `reviewing` or `cancelled` and record admin notes, but it does not delete Supabase Auth users, Storage objects, item images, item records, or profile rows.

## Privacy Defaults

- Use the app for detail review instead of sending personal data through Telegram.
- Keep queue summaries compact and avoid exporting row contents into chat or issue comments.
- Do not inspect real user rows through Supabase tools unless the maintainer explicitly approves that access for the current task.
- Run or offer `pnpm backup:supabase` before production database work when a service role key is available.
- Use `/admin/user-items` for item review instead of copying user item lists into chat or external systems.
- Use `/admin/deletion-requests` for account deletion triage instead of exporting deletion request rows into chat or issue comments.

## Before Production Changes

1. Confirm the target Supabase project and deployment profile.
2. Run a table backup if `SUPABASE_SERVICE_ROLE_KEY` is configured.
3. Apply migrations in order and compare the live contract with `supabase/schema.sql`.
4. Run `pnpm check:supabase-contract` after local schema or policy changes.
5. Verify admin routes with the agentic browser skill using admin and non-admin accounts.

## Remaining Admin Work

Keep the roadmap in [Optimization Options](optimization-options.md) current for:

- owner-specific and image-metadata suggestion application;
- item/image-specific moderation;
- hide/unhide reason flows from user item review;
- Telegram dedupe, mute windows, and seen-state;
- backup freshness and Supabase health visibility;
- approved account deletion execution, Auth deletion, and Storage cleanup.
