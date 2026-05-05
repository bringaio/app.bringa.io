---
title: First Big Version Readiness Checklist
---

# First Big Version Readiness Checklist

Use this checklist before calling the generic upstream ready for a first large open-source release. It is not a launch claim for any live deployment.

For the prompt-to-artifact evidence map and the remaining blockers that prevent `/goal` completion, see [Production Readiness Audit](production-readiness-audit.md).

## Repository Foundation

- [x] `AGENTS.md` points agents to `.agents/`.
- [x] Agent rules cover privacy, source of truth, implementation, quality, and finishing work.
- [x] Conventional Commits and branch cleanup expectations are documented.
- [x] Source, script, route, config, Supabase, branch, and commit naming conventions are documented and checked.
- [x] Manual secret-free CI checks exist for config, lint, TypeScript, build, and docs.
- [ ] GitHub branch protection and manual Pages deployment settings have been confirmed in the repository UI.

As of 2026-05-05, GitHub API checks show the repository is private, `has_pages` is `false`, the Pages endpoint returns 404, and the branch-protection endpoint returns 403 unless the repository is public or on a plan that supports branch protection for private repositories. Confirm this item in the GitHub UI after the visibility or plan decision is made.

## Forkability

- [x] Public configuration is layered through `config/base.config.jsonc` and `config/deployments/<slug>.jsonc`.
- [x] Generated runtime config is checked for staleness.
- [x] Branding, public links, media limits, legal paths, SSO display, and feature flags are config-driven.
- [x] Forking and fork-content strategy docs describe upstream sync and tracked fork overrides.
- [x] Docs index and GitHub Pages navigation link every top-level docs page and are covered by `pnpm check:docs-index`.
- [x] Deployment content profiles generate legal, onboarding, help, and issue copy from `content/default` plus deployment overrides.

## Supabase Contract

- [x] Consolidated `supabase/schema.sql` exists for fresh setup.
- [x] Incremental migrations cover current prepared schema changes.
- [x] Browser mutations for invite, item CRUD, borrow/return, admin roles, deletion request, and moderation use RPC boundaries.
- [x] Direct writes to core item state, borrow history, item versions, item images, deletion requests, and moderation queues are blocked by RLS.
- [x] Storage bucket MIME and size limits are checked against deployment config.
- [x] Supabase development-branch transition tasks are documented and checked.
- [ ] Live Supabase schema, RLS, functions, triggers, Storage, and Edge Functions have been reviewed with approved access.
- [ ] Local app development is linked to a Supabase development branch from production.

## User Experience

- [x] Dashboard defaults to borrowed items only when the user has current borrowed items.
- [x] Dashboard public item lists and search filter to visible items while borrowed view stays user-scoped.
- [x] Create/edit image flow has config-driven validation and immediate preview.
- [x] Settings exposes repo links, issue prompt copy, JSON data export, and account deletion request.
- [x] Item details let users suggest changes, flag issues, hide their own items, or request visibility for admin review.
- [x] PWA manifest fields, PNG install icons, and maskable icon paths are generated from public app and branding config and covered by `pnpm test:pwa-manifest`.
- [ ] Auth persistence, logout, PWA install, slow network, and long-content states have been browser-tested across target browsers.

## Admin Experience

- [x] Admin dashboard shows item counts, visibility states, media stats, and system-readiness placeholders.
- [x] Admin dashboard shows pending suggestions, flags, account deletion requests, and unvalidated users.
- [x] Admin dashboard shows recent borrow/return activity and recent image uploads.
- [x] Admin dashboard links config, Supabase contract, Storage contract, development branch setup, backups, docs, and Telegram health to source-of-truth docs.
- [x] Admin dashboard shows latest backup run freshness when the `backup_runs` migration is present.
- [x] Admin users route supports user validation, access revocation with self-protection, admin promotion, and admin demotion with self-demotion protection.
- [x] Admin moderation route lists pending visibility requests, suggestions, and flags, and reviews status through RPCs with notes for final decisions.
- [x] Admin moderation can apply content, image metadata, and owner suggestions through admin-only RPCs with item version capture.
- [x] Admin user item views group current borrower, owner, and creator relationships for one profile, with reasoned visibility actions through RPCs.
- [x] Admin item version route lists snapshots and restores selected versions through an admin-only RPC.
- [x] Admin deletion request queue triages operator-reviewed account deletion requests without destructive action.
- [x] Approved database-side deletion execution stage is complete for anonymizing profiles and hiding user-owned contributions.
- [x] Trusted Auth deletion and Storage cleanup operator workflow is documented and covered by a dry-run-first test.
- [x] Admin notification settings route shows Telegram status, mute-window state, dedupe state, and admin seen-state without exposing user data.
- [ ] Trusted account deletion cleanup has been rehearsed or run with approved access, backup/export evidence, and operator retention policy.

## Operations

- [x] `pnpm backup:supabase` exports configured public tables and Storage buckets with a service role key.
- [x] `pnpm backup:supabase` records compact admin-visible backup run metadata after the `backup_runs` migration.
- [x] Local backup integrity verification checks manifest table counts and Storage object hashes before restore drills.
- [x] Maintenance docs distinguish operator table/Storage backups, optional Auth metadata export, and user-facing export.
- [x] Data export includes profile, items, borrow history, deletion requests, suggestions, and flags.
- [x] Restore drill and encrypted retention evidence requirements are documented and checked.
- [ ] Live restore drills and encrypted backup handling are complete with approved access and policy.
- [x] Telegram notification dedupe, mute windows, retry state, and privacy review are complete in the local contract.
- [x] Privacy-preserving observability runbook is documented and checked.
- [ ] Live Supabase health checks, Edge Function log review, and any external error-reporting decision are complete with approved access and policy.

## Verification Before Release

- [ ] `pnpm check:config`
- [ ] `pnpm test:config`
- [ ] `pnpm test:auth-redirect`
- [ ] `pnpm test:app-config`
- [ ] `pnpm test:admin-route-gate`
- [ ] `pnpm test:media-policy`
- [ ] `pnpm test:protected-route`
- [ ] `pnpm test:env-example`
- [ ] `pnpm check:env-example`
- [ ] `pnpm test:agents`
- [ ] `pnpm check:agents`
- [ ] `pnpm test:naming-conventions`
- [ ] `pnpm check:naming-conventions`
- [ ] `pnpm test:optimization-options`
- [ ] `pnpm check:optimization-options`
- [ ] `pnpm test:dashboard-query`
- [ ] `pnpm test:item-visibility-request`
- [ ] `pnpm test:issue-prompt`
- [ ] `pnpm test:settings-data-actions`
- [ ] `pnpm test:login-terms`
- [ ] `pnpm test:invite-flow`
- [ ] `pnpm test:profile-completion`
- [ ] `pnpm test:github-workflows`
- [ ] `pnpm test:copy`
- [ ] `pnpm test:docs-index`
- [ ] `pnpm test:browser-testing`
- [ ] `pnpm test:supabase-branching`
- [ ] `pnpm test:restore-drills`
- [ ] `pnpm test:observability`
- [ ] `pnpm test:production-readiness-audit`
- [ ] `pnpm test:release-checklist`
- [ ] `pnpm test:supabase-contract`
- [ ] `pnpm test:admin-notification-settings`
- [ ] `pnpm test:admin-deletion-requests`
- [ ] `pnpm test:account-deletion-cleanup`
- [ ] `pnpm test:admin-moderation-review`
- [ ] `pnpm test:admin-profile-validation`
- [ ] `pnpm test:admin-queue-counts`
- [ ] `pnpm test:admin-recent-activity`
- [ ] `pnpm test:admin-system-health`
- [ ] `pnpm test:admin-user-items`
- [ ] `pnpm test:admin-item-versions`
- [ ] `pnpm test:admin-visibility-queue`
- [ ] `pnpm test:backup-supabase`
- [ ] `pnpm test:verify-backup`
- [ ] `pnpm test:pwa-manifest`
- [ ] `pnpm check:copy`
- [ ] `pnpm check:docs-index`
- [ ] `pnpm check:browser-testing`
- [ ] `pnpm check:supabase-branching`
- [ ] `pnpm check:restore-drills`
- [ ] `pnpm check:observability`
- [ ] `pnpm check:production-readiness-audit`
- [ ] `pnpm check:release-checklist`
- [ ] `pnpm check:github-workflows`
- [ ] `pnpm test:static-export`
- [ ] `pnpm check:static-export`
- [ ] `pnpm check:supabase-contract`
- [ ] `pnpm outdated`
- [ ] `pnpm lint`
- [ ] `pnpm exec tsc --noEmit`
- [ ] `pnpm build`
- [ ] Manual GitHub Pages app deploy
- [ ] Agentic browser testing for user, admin, uninvited, mobile, desktop, and PWA flows

Keep unresolved items in [Optimization Options](optimization-options.md) until implementation, docs, tests, or live verification become the source of truth.
