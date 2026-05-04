---
title: Admin Operations
---

# Admin Operations

This page describes the current upstream admin surfaces. Keep operational detail here short and link back to the source of truth for schema, config, and maintenance.

## Current Surfaces

- `/admin/dashboard`: item counts, visibility signals, borrowed-first item list, pending queue counts, recent activity, recent uploads, and system-readiness links for config, Supabase, Storage, backups, docs, and Telegram.
- `/admin/users`: profile list, admin promotion, admin demotion, and self-demotion protection.
- `/admin/user-items?id=<profile-id>`: admin-only item view grouped by current borrower, owner, and creator relationship for one profile.
- `/admin/item-versions?itemId=<item-id>`: admin-only item version timeline with restore-by-republish through the Supabase RPC contract.
- `/admin/deletion-requests`: read-only operator queue for account deletion requests, linked to per-user item review.
- `/admin/notifications`: read-only notification settings view for Telegram status, mute windows, dedupe, and admin seen-state planning.
- `/admin/invite-code`: current admin invite code display and update flow.
- `/admin/moderation`: item suggestions and flags, with admin review actions routed through RPCs.

## Review Queues

Moderation queue records live in Supabase:

- `item_suggestions`: user suggestions for content, images, visibility, owner, or other item changes.
- `item_flags`: user issue reports with a bounded reason set.
- `account_deletion_requests`: user account deletion requests for operator triage before any approved destructive workflow.

Users create these records through `create_item_suggestion` and `create_item_flag`. Admins transition state through `review_item_suggestion` and `review_item_flag`. Direct browser inserts, updates, and deletes remain blocked by RLS.

Status transitions currently record reviewer and reviewed time. They do not yet apply accepted suggestions to item records, notify users, or update Telegram seen-state.

Item creation, item updates, and admin version restore create append-only `item_versions` snapshots through `record_item_version`. Admin restore uses `restore_item_version` and records the restore reason as the newly current version.

The deletion request route is read-only. It does not delete Supabase Auth users, Storage objects, item images, item records, or profile rows.

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

- accepted-suggestion application;
- item/image-specific moderation;
- hide/unhide reason flows from user item review;
- Telegram dedupe, mute windows, and seen-state;
- backup freshness and Supabase health visibility;
- approved account deletion execution, Auth deletion, and Storage cleanup.
