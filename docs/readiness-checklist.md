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

## Forkability

- [x] Public configuration is layered through `config/base.config.jsonc` and `config/deployments/<slug>.jsonc`.
- [x] Generated runtime config is checked for staleness.
- [x] Branding, public links, media limits, legal paths, SSO display, and feature flags are config-driven.
- [x] Forking and fork-content strategy docs describe upstream sync and tracked fork overrides.
- [x] Docs index links every top-level docs page and is covered by `pnpm check:docs-index`.
- [ ] Deployment content profiles for longer local copy are implemented beyond legal content paths.

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
- [x] Item details let users suggest changes or flag issues for admin review.
- [x] PWA manifest fields are generated from public app and branding config and covered by `pnpm test:pwa-manifest`.
- [ ] Auth persistence, logout, PWA install, slow network, and long-content states have been browser-tested across target browsers.

## Admin Experience

- [x] Admin dashboard shows item counts, visibility states, media stats, and system-readiness placeholders.
- [x] Admin dashboard shows pending suggestions, flags, account deletion requests, and unvalidated users.
- [x] Admin dashboard shows recent borrow/return activity and recent image uploads.
- [x] Admin dashboard links config, Supabase contract, Storage contract, backups, docs, and Telegram health to source-of-truth docs.
- [x] Admin users route supports admin promotion and demotion with self-demotion protection.
- [x] Admin moderation route lists pending visibility requests, suggestions, and flags, and reviews status through RPCs.
- [x] Admin user item views group current borrower, owner, and creator relationships for one profile.
- [x] Admin item version route lists snapshots and restores selected versions through an admin-only RPC.
- [x] Admin deletion request queue lists operator-reviewed account deletion requests without destructive action.
- [x] Admin notification settings route shows Telegram, mute-window, dedupe, and seen-state planning without mutating user data.
- [ ] Accepted-suggestion application, approved deletion execution, and notification execution are complete.

## Operations

- [x] `pnpm backup:supabase` exports configured public tables with a service role key.
- [x] Maintenance docs distinguish operator table backups from user-facing export.
- [x] Data export includes profile, items, borrow history, deletion requests, suggestions, and flags.
- [ ] Storage object backups, Auth export limits, restore drills, encrypted backup handling, and backup freshness UI are complete.
- [ ] Telegram notification dedupe, mute windows, retry state, and privacy review are complete.

## Verification Before Release

- [ ] `pnpm check:config`
- [ ] `pnpm test:config`
- [ ] `pnpm test:dashboard-query`
- [ ] `pnpm test:copy`
- [ ] `pnpm test:docs-index`
- [ ] `pnpm test:admin-notification-settings`
- [ ] `pnpm test:admin-deletion-requests`
- [ ] `pnpm test:admin-queue-counts`
- [ ] `pnpm test:admin-recent-activity`
- [ ] `pnpm test:admin-system-health`
- [ ] `pnpm test:admin-user-items`
- [ ] `pnpm test:admin-item-versions`
- [ ] `pnpm test:admin-visibility-queue`
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
