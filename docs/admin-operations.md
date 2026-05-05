---
title: Admin Operations
---

# Admin Operations

This page describes the current upstream admin surfaces. Keep operational detail here short and link back to the source of truth for schema, config, and maintenance.

## Current Surfaces

- `/admin/dashboard`: item counts, visibility signals, borrowed-first item list, pending queue counts, recent activity, recent uploads, latest backup run status when `backup_runs` exists, and system-readiness links for config, Supabase, Storage, development branch setup, backups, docs, and Telegram.
- `/admin/users`: profile list, user validation, access revocation with self-protection, admin promotion, admin demotion, and self-demotion protection.
- `/admin/user-items?id=<profile-id>`: admin-only item view grouped by current borrower, owner, and creator relationship for one profile, with visibility actions routed through `set_item_visibility`.
- `/admin/item-versions?itemId=<item-id>`: admin-only item version timeline with restore-by-republish through the Supabase RPC contract.
- `/admin/deletion-requests`: operator queue for account deletion requests, review notes, cancellation, per-user item review, and the approved database-side completion stage.
- `/admin/notifications`: notification status view for Telegram configuration, active mute windows, unseen dedupe state, and admin seen-state.
- `/admin/invite-code`: current admin invite code display and update flow.
- `/admin/moderation`: pending visibility requests, item suggestions, and flags, with admin review and content, image metadata, and owner suggestion application routed through RPCs.

## Review Queues

Moderation queue records live in Supabase:

- `item_suggestions`: user suggestions for content, images, visibility, owner, or other item changes.
- `item_flags`: user issue reports with a bounded reason set.
- `items.visibility_state = 'pending_visible'`: item visibility requests that require an admin reason before approval or hiding.
- `account_deletion_requests`: user account deletion requests for operator triage and approved database-side completion before trusted Auth and Storage cleanup.

Users create these records through `create_item_suggestion`, `create_item_flag`, `request_item_visibility`, and `request_account_deletion`. Admins transition state through `review_item_suggestion`, `review_item_flag`, `set_item_visibility`, and `review_account_deletion_request`; content/image suggestions can be applied through `apply_item_suggestion`, and owner suggestions through `apply_owner_item_suggestion`. Approved deletion requests in review can run the database-side completion stage through `execute_account_deletion_request`. Final suggestion and flag decisions require an admin note; cancelled deletion requests and completed deletion requests require admin notes. Direct browser inserts, updates, and deletes remain blocked by RLS.

Status transitions record reviewer and reviewed time. Applying a content, image metadata, or owner suggestion updates explicit item fields or image metadata and creates a new `item_versions` snapshot. Admin item visibility actions require a reason and reuse `set_item_visibility`, including version capture. Telegram notification events now dedupe unseen subjects, support per-profile mute windows, and record delivery status. User-facing in-app notifications are still pending.

Item creation, item updates, and admin version restore create append-only `item_versions` snapshots through `record_item_version`. Admin restore uses `restore_item_version` and records the restore reason as the newly current version.

The deletion request route separates triage from execution. Review actions can mark requests `reviewing` or `cancelled` and record admin notes. The completion action anonymizes the profile, hides user-owned or user-created non-operator items, clears prepared profile references, and records item versions for hidden items. Self-execution is blocked so an admin cannot complete their own account deletion request. The database stage does not delete Supabase Auth users or Storage objects; those must run from a trusted server-side maintenance workflow after export, retention, and Storage policy checks.

For the trusted follow-up, use `pnpm cleanup:account-deletion` from a server-side operator environment. It is dry-run-first, verifies the request is already `completed`, removes explicitly supplied Storage object paths through the Storage API, then deletes the Auth user through the Supabase Admin API. Collect Storage paths before anonymizing or from backup/operator evidence; do not infer them from chat logs.

## Privacy Defaults

- Use the app for detail review instead of sending personal data through Telegram.
- Keep queue summaries compact and avoid exporting row contents into chat or issue comments.
- Do not inspect real user rows through Supabase tools unless the maintainer explicitly approves that access for the current task.
- Run or offer `pnpm backup:supabase` before production database work when a server-side Supabase maintenance key is available.
- Use `/admin/user-items` for item review instead of copying user item lists into chat or external systems.
- Use `/admin/deletion-requests` for account deletion triage instead of exporting deletion request rows into chat or issue comments.
- Use [Observability](observability.md) for diagnostics, live log boundaries, and redaction rules before sharing troubleshooting evidence.

## Before Production Changes

1. Confirm the target Supabase project and deployment profile.
2. Run a table and Storage backup if `SUPABASE_SECRET_KEY` or legacy `SUPABASE_SERVICE_ROLE_KEY` is configured; explicitly decide whether optional Auth user metadata export is needed.
3. Apply migrations in order and compare the live contract with `supabase/schema.sql`.
4. Run `pnpm check:supabase-contract` after local schema or policy changes.
5. Verify admin routes with the agentic browser skill using admin and non-admin accounts.

## Remaining Admin Work

Keep the roadmap in [Optimization Options](optimization-options.md) current for:

- item/image-specific moderation;
- operator retry jobs for failed Telegram sends when manual retry planning is not enough;
- restore drills, encrypted backup handling, and live Supabase health visibility;
- live rehearsal or approved production run of trusted Auth deletion and Storage cleanup after the approved database-side deletion stage.
