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
- [x] `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue templates, and the pull request template exist.
- [x] Security maintenance, fork safety, server-only key handling, live evidence expectations, and security optimization gaps are documented.
- [x] Security maintenance docs, skill guidance, local checks, and live-evidence caveats are aligned by `pnpm check:security-maintenance`.
- [x] GitHub merge settings prefer rebase merges, disable merge and squash merges, allow pull request branch updates, and delete merged head branches automatically.
- [x] GitHub repository description and topics are configured for open-source discovery.
- [ ] Repository visibility or organization policy allows forks.
- [ ] GitHub branch protection and manual Pages deployment settings have been confirmed in the repository UI.

As of 2026-05-05, GitHub API checks confirm the merge settings above. The repository is private, `has_pages` is `false`, the Pages endpoint returns 404, creating a Pages site with `build_type=workflow` returns `422 Your current plan does not support GitHub Pages for this repository`, setting `allow_forking=true` returns `422 This organization does not allow private repository forking`, and the branch-protection endpoint returns 403 unless the repository is public or on a plan that supports branch protection for private repositories. Confirm the remaining repository-setting items after the visibility, plan, or organization-policy decision is made.

## Forkability

- [x] Public configuration is layered through `config/base.config.jsonc` and `config/deployments/<slug>.jsonc`.
- [x] Generated runtime config is checked for staleness.
- [x] Branding, public links, media limits, legal paths, SSO display, and feature flags are config-driven.
- [x] Forking and fork-content strategy docs describe upstream sync and tracked fork overrides.
- [x] Docs index and generated in-app docs artifacts cover every top-level docs page and are checked by `pnpm check:docs-index`.
- [x] Deployment content profiles generate legal, onboarding, help, and issue copy from `content/default` plus deployment overrides.
- [x] Fork deployment profiles can be scaffolded with `pnpm create:deployment -- <slug>` and are covered by `pnpm test:create-deployment`.
- [x] Fork operators have an interactive `pnpm setup:operator` first-run helper covered by `pnpm test:operator-setup`.

## Supabase Contract

- [x] Consolidated `supabase/schema.sql` exists for fresh setup.
- [x] Incremental migrations cover current prepared schema changes.
- [x] Browser mutations for invite, item CRUD, borrow/return, admin roles, deletion request, and moderation use RPC boundaries.
- [x] Direct writes to core item state, borrow history, item versions, item images, deletion requests, and moderation queues are blocked by RLS.
- [x] Storage bucket MIME and size limits are checked against deployment config.
- [x] Local Supabase CLI development path is documented and checked for free-account-oriented forks.
- [x] Optional Supabase development-branch transition tasks are documented and checked.
- [x] Repo-local Supabase CLI dependency and invocation are documented and checked.
- [x] Live Supabase schema, RLS, functions, triggers, Storage, and Edge Functions have been reviewed and baseline-applied with approved access.
- [x] Local app development has a no-hosted-quota backend path through the local Supabase CLI stack, deterministic seed helper, and key-safe doctor command.

As of 2026-05-05, Supabase MCP can see the `app.bringa.io` project in `eu-central-1` with `ACTIVE_HEALTHY` status. The live baseline now has the repository schema applied, RLS enabled on app tables, the `items` Storage bucket configured with the expected image MIME and size limits, both Telegram Edge Functions deployed with `verify_jwt=true`, anon/PUBLIC SECURITY DEFINER execution removed, and a verified empty backup recorded. `pnpm check:supabase-maintenance-key` confirmed the modern `SUPABASE_SECRET_KEY` can reach Storage Admin and Auth Admin APIs, so the legacy service-role key is only a fallback for this project. Edge Function logs had no invocations in the last 24-hour windows checked on 2026-05-05 and 2026-05-06. Auth logs still show the known Supabase-managed GoTrue default/admin group deprecation warnings, while API/Storage health metadata and Postgres routine logs did not surface a new app blocker in the redacted 2026-05-06 review. Remaining blockers are Auth provider/redirect setup, Edge Function secrets, Telegram webhook URL settings, live notification delivery log review, and restore drills. Supabase Branching is no longer a release blocker for the free-account default path; it remains an optional paid remote-preview workflow.

## User Experience

- [x] Dashboard defaults to borrowed items only when the user has current borrowed items.
- [x] Dashboard public item lists and search filter to visible items while borrowed view stays user-scoped.
- [x] Create/edit image flow has config-driven validation and immediate preview.
- [x] Settings exposes repo links, issue prompt copy, JSON data export, and account deletion request.
- [x] Item details let users suggest changes, flag issues, hide their own items, or request visibility for admin review.
- [x] PWA manifest fields, PNG install icons, and maskable icon paths are generated from public app and branding config and covered by `pnpm test:pwa-manifest`.
- [x] Production browser chunks are checked to exclude development-only local demo fixture markers after static builds.
- [ ] Auth persistence, logout, PWA install, slow network, and long-content states have been browser-tested across target browsers.

A 2026-05-05 local in-app browser pass covered login/local demo, dashboard, long item details, in-app docs, admin dashboard, and item creation in local demo mode. A 2026-05-06 quick-start contract check confirmed the default `pnpm dev` config enables local demo mode without a Supabase server and remains production-disabled through the `NODE_ENV` guard. Browser Use could not attach to an in-app browser on 2026-05-06, so connected auth, PWA install, slow-network, visual browser, and target-browser evidence remain open.

## Admin Experience

- [x] Admin dashboard shows item counts, visibility states, media stats, and system-readiness placeholders.
- [x] Admin dashboard shows pending suggestions, flags, account deletion requests, and unvalidated users.
- [x] Admin dashboard shows recent borrow/return activity and recent image uploads.
- [x] Admin dashboard links config, Supabase contract, Storage contract, local backend setup, backups, docs, and Telegram health to source-of-truth docs.
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

- [x] `pnpm backup:supabase` exports configured public tables and Storage buckets with `SUPABASE_SECRET_KEY` or legacy `SUPABASE_SERVICE_ROLE_KEY`.
- [x] `pnpm backup:supabase` records compact admin-visible backup run metadata after the `backup_runs` migration.
- [x] Local backup integrity verification checks manifest table counts and Storage object hashes before restore drills.
- [x] A 2026-05-05 live empty-baseline backup was written and verified after the initial schema setup.
- [x] Maintenance docs distinguish operator table/Storage backups, optional Auth metadata export, and user-facing export.
- [x] Data export includes profile, items, borrow history, deletion requests, suggestions, and flags.
- [x] Restore drill evidence requirements and starter encrypted-retention policy template are documented and checked.
- [ ] Live restore drills and project-specific encrypted backup retention approval are complete with approved access and policy.
- [x] Telegram notification dedupe, mute windows, retry state, and privacy review are complete in the local contract.
- [x] Privacy-preserving observability runbook is documented and checked.
- [ ] Live Supabase health checks, Edge Function log review, and any external error-reporting decision are complete with approved access and policy.

## Verification Before Release

2026-05-05 manual GitHub Actions run `25392381617` on `main` passed the full secret-free quality workflow on commit `d9f842e11f20648720849852f98ce52dd49b583a`, including generated config, unit/script checks, documentation checks, committed secret scanning, lint, TypeScript, and static build. The latest branch run, `25409135823` on commit `667c2fa27d11ec3f11c2a1e5a688907cf01b7bd2`, passed the full secret-free workflow after adding production bundle fixture isolation, the production bundle checker, and the readiness-audit evidence update. Keep the newest run evidence in the active pull request when the checklist itself only changes evidence wording.

- [ ] `pnpm check:config`
- [ ] `pnpm test:config`
- [ ] `pnpm test:create-deployment`
- [ ] `pnpm test:operator-setup`
- [ ] `pnpm test:auth-redirect`
- [ ] `pnpm test:app-config`
- [ ] `pnpm test:admin-route-gate`
- [ ] `pnpm test:media-policy`
- [ ] `pnpm test:protected-route`
- [ ] `pnpm test:env-example`
- [ ] `pnpm test:secrets`
- [ ] `pnpm check:env-example`
- [ ] `pnpm check:secrets`
- [ ] `pnpm test:agents`
- [ ] `pnpm check:agents`
- [ ] `pnpm test:naming-conventions`
- [ ] `pnpm check:naming-conventions`
- [ ] `pnpm test:optimization-options`
- [ ] `pnpm check:optimization-options`
- [ ] `pnpm test:docs-view`
- [ ] `pnpm test:dashboard-query`
- [ ] `pnpm test:item-visibility-request`
- [ ] `pnpm test:issue-prompt`
- [ ] `pnpm test:settings-data-actions`
- [ ] `pnpm test:login-terms`
- [ ] `pnpm test:local-demo-mode`
- [ ] `pnpm test:local-demo-supabase`
- [ ] `pnpm test:invite-flow`
- [ ] `pnpm test:profile-completion`
- [ ] `pnpm test:github-workflows`
- [ ] `pnpm test:copy`
- [ ] `pnpm test:docs-index`
- [ ] `pnpm test:browser-testing`
- [ ] `pnpm test:production-bundle`
- [ ] `pnpm test:local-supabase`
- [ ] `pnpm test:supabase-mcp`
- [ ] `pnpm test:supabase-cli`
- [ ] `pnpm test:supabase-branching`
- [ ] `pnpm test:restore-drills`
- [ ] `pnpm test:observability`
- [ ] `pnpm test:security-maintenance`
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
- [ ] `pnpm check:local-supabase`
- [ ] `pnpm check:supabase-mcp`
- [ ] `pnpm check:supabase-cli`
- [ ] `pnpm check:supabase-branching`
- [ ] `pnpm check:restore-drills`
- [ ] `pnpm check:observability`
- [ ] `pnpm check:security-maintenance`
- [ ] `pnpm check:production-readiness-audit`
- [ ] `pnpm check:release-checklist`
- [ ] `pnpm check:github-workflows`
- [ ] `pnpm check:edge-functions`
- [ ] `pnpm test:static-export`
- [ ] `pnpm check:static-export`
- [ ] `pnpm check:production-bundle`
- [ ] `pnpm check:supabase-contract`
- [ ] `pnpm outdated`
- [ ] `pnpm lint`
- [ ] `pnpm exec tsc --noEmit`
- [ ] `pnpm build`
- [ ] Manual GitHub Pages app deploy
- [ ] Agentic browser testing for user, admin, uninvited, mobile, desktop, and PWA flows

Keep unresolved items in [Optimization Options](optimization-options.md) until implementation, docs, tests, or live verification become the source of truth.
