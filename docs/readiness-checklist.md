---
title: First Big Version Readiness Checklist
---

# First Big Version Readiness Checklist

Use this checklist before calling the generic upstream ready for a first large open-source release. It is not a launch claim for any live deployment.

## Repository Foundation

- [x] `AGENTS.md` points agents to `.agents/`.
- [x] Agent rules cover privacy, source of truth, implementation, quality, and finishing work.
- [x] Conventional Commits and branch cleanup expectations are documented.
- [x] Manual secret-free CI checks exist for config, lint, TypeScript, build, and docs.
- [ ] GitHub branch protection and manual Pages deployment settings have been confirmed in the repository UI.

As of 2026-05-05, GitHub API checks show the repository is private, `has_pages` is `false`, the Pages endpoint returns 404, and the branch-protection endpoint returns 403 unless the repository is public or on a plan that supports branch protection for private repositories. Confirm this item in the GitHub UI after the visibility or plan decision is made.

## Forkability

- [x] Public configuration is layered through `config/base.config.jsonc` and `config/deployments/<slug>.jsonc`.
- [x] Generated runtime config is checked for staleness.
- [x] Branding, public links, media limits, legal paths, SSO display, and feature flags are config-driven.
- [x] Forking and fork-content strategy docs describe upstream sync and tracked fork overrides.
- [x] Docs index links every top-level docs page and is covered by `pnpm check:docs-index`.
- [x] Deployment content profiles generate legal, onboarding, help, and issue copy from `content/default` plus deployment overrides.

## Supabase Contract

- [x] Consolidated `supabase/schema.sql` exists for fresh setup.
- [x] Incremental migrations cover current prepared schema changes.
- [x] Browser mutations for invite, item CRUD, borrow/return, admin roles, deletion request, and moderation use RPC boundaries.
- [x] Direct writes to core item state, borrow history, item versions, item images, deletion requests, and moderation queues are blocked by RLS.
- [x] Storage bucket MIME and size limits are checked against deployment config.
- [x] Supabase development-branch transition tasks are documented.
- [ ] Live Supabase schema, RLS, functions, triggers, Storage, and Edge Functions have been reviewed with approved access.
- [ ] Local app development is linked to a Supabase development branch from production.

## User Experience

- [x] Dashboard defaults to borrowed items only when the user has current borrowed items.
- [x] Dashboard public item lists and search filter to visible items while borrowed view stays user-scoped.
- [x] Create/edit image flow has config-driven validation and immediate preview.
- [x] Settings exposes repo links, issue prompt copy, JSON data export, and account deletion request.
- [x] Item details let users suggest changes, flag issues, hide their own items, or request visibility for admin review.
- [x] PWA manifest fields are generated from public app and branding config and covered by `pnpm test:pwa-manifest`.
- [ ] Auth persistence, logout, PWA install, slow network, and long-content states have been browser-tested across target browsers.

## Admin Experience

- [x] Admin dashboard shows item counts, visibility states, media stats, and system-readiness placeholders.
- [x] Admin dashboard shows pending suggestions, flags, account deletion requests, and unvalidated users.
- [x] Admin dashboard shows recent borrow/return activity and recent image uploads.
- [x] Admin dashboard links config, Supabase contract, Storage contract, backups, docs, and Telegram health to source-of-truth docs.
- [x] Admin users route supports user validation, access revocation with self-protection, admin promotion, and admin demotion with self-demotion protection.
- [x] Admin moderation route lists pending visibility requests, suggestions, and flags, and reviews status through RPCs with notes for final decisions.
- [x] Admin moderation can apply content/image and owner suggestions through admin-only RPCs with item version capture.
- [x] Admin user item views group current borrower, owner, and creator relationships for one profile, with reasoned visibility actions through RPCs.
- [x] Admin item version route lists snapshots and restores selected versions through an admin-only RPC.
- [x] Admin deletion request queue triages operator-reviewed account deletion requests without destructive action.
- [x] Admin notification settings route shows Telegram, mute-window, dedupe, and seen-state planning without mutating user data.
- [ ] Approved deletion execution, image-metadata suggestion application, and notification execution are complete.

## Operations

- [x] `pnpm backup:supabase` exports configured public tables and Storage buckets with a service role key.
- [x] Maintenance docs distinguish operator table/Storage backups, optional Auth metadata export, and user-facing export.
- [x] Data export includes profile, items, borrow history, deletion requests, suggestions, and flags.
- [ ] Restore drills, encrypted backup handling, and backup freshness UI are complete.
- [ ] Telegram notification dedupe, mute windows, retry state, and privacy review are complete.

## Verification Before Release

- [ ] `pnpm check:config`
- [ ] `pnpm test:config`
- [ ] `pnpm test:dashboard-query`
- [ ] `pnpm test:item-visibility-request`
- [ ] `pnpm test:issue-prompt`
- [ ] `pnpm test:copy`
- [ ] `pnpm test:docs-index`
- [ ] `pnpm test:admin-notification-settings`
- [ ] `pnpm test:admin-deletion-requests`
- [ ] `pnpm test:admin-moderation-review`
- [ ] `pnpm test:admin-profile-validation`
- [ ] `pnpm test:admin-queue-counts`
- [ ] `pnpm test:admin-recent-activity`
- [ ] `pnpm test:admin-system-health`
- [ ] `pnpm test:admin-user-items`
- [ ] `pnpm test:admin-item-versions`
- [ ] `pnpm test:admin-visibility-queue`
- [ ] `pnpm test:backup-supabase`
- [ ] `pnpm test:pwa-manifest`
- [ ] `pnpm check:copy`
- [ ] `pnpm check:docs-index`
- [ ] `pnpm test:static-export`
- [ ] `pnpm check:static-export`
- [ ] `pnpm check:supabase-contract`
- [ ] `pnpm outdated`
- [ ] `pnpm lint`
- [ ] `pnpm exec tsc --noEmit`
- [ ] `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=dummy-anon-key pnpm build`
- [ ] Manual GitHub Pages docs build
- [ ] Agentic browser testing for user, admin, uninvited, mobile, desktop, and PWA flows

Keep unresolved items in [Optimization Options](optimization-options.md) until implementation, docs, tests, or live verification become the source of truth.
