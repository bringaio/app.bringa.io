---
title: Definition Of Done
---

# Definition Of Done

This is the current definition of done for upstream work. It is intentionally practical: the hyperoptimum is reached through verified, coherent increments.

## Required For Every Change

- The change has one clear purpose.
- Source-of-truth rules were considered.
- User-facing conventions are documented in `docs/` when they affect contributors, forks, setup, CI/CD, security, or operations.
- Agent-facing conventions are documented in `.agents/` when future agents should remember or enforce them.
- No secrets, real user data, private exports, or Supabase server-side maintenance keys are committed or pasted into docs. `pnpm check:secrets` guards committed Supabase secret-key and legacy service-role patterns.
- Verification was run and the result is reported honestly.
- The commit uses Conventional Commits.
- The branch is pushed after the commit unless the user explicitly requested local-only work or the remote is unavailable.

## Required For Code Changes

- `pnpm check:config`
- `pnpm test:config` when config generation, config layering, or generated public config behavior changes
- `pnpm test:create-deployment` when fork deployment profile scaffolding, deployment-profile docs, or fork setup behavior changes
- `pnpm test:operator-setup` when operator setup prompts, first-run fork setup docs, or setup checklist behavior changes
- `pnpm test:auth-redirect` when OAuth redirect URL normalization or provider sign-in redirect behavior changes
- `pnpm test:app-config` when typed app-config helpers or page-title formatting change
- `pnpm test:admin-route-gate` when admin route loading, redirect, or render decisions change
- `pnpm test:media-policy` when upload MIME validation, upload size copy, byte formatting, or image compression options change
- `pnpm test:protected-route` when protected route auth, invite, profile-completion, or redirect decisions change
- `pnpm test:env-example` and `pnpm check:env-example` when `.env.example`, backup defaults, or operational env docs change
- `pnpm test:agents` and `pnpm check:agents` when `AGENTS.md`, `.agents/`, agent workflows, or agent skills change
- `pnpm test:naming-conventions` and `pnpm check:naming-conventions` when source, script, route, config, Supabase, branch, or commit naming conventions change
- `pnpm test:optimization-options` and `pnpm check:optimization-options` when `docs/optimization-options.md` changes
- `pnpm test:docs-view` when in-app docs routing, generated docs links, or docs navigation helpers change
- `pnpm test:dashboard-query` when dashboard item list filtering, search, or default view behavior changes
- `pnpm test:item-visibility-request` when user-facing item visibility actions change
- `pnpm test:issue-prompt` when issue prompt content paths or rendering changes
- `pnpm test:settings-data-actions` when settings data export filenames, account deletion request messages, or data action status presentation changes
- `pnpm test:login-terms` when login terms acceptance, OAuth button gating, or login terms copy changes
- `pnpm test:local-demo-mode` and `pnpm test:local-demo-supabase` when first-run local development, demo auth, or demo Supabase behavior changes
- `pnpm test:invite-flow` when invite code normalization, invite page messages, submit state, or pending-approval copy changes
- `pnpm test:profile-completion` when profile completion validation, labels, placeholders, or submit state changes
- `pnpm test:admin-notification-settings` when admin notification settings or planned notification controls change
- `pnpm test:admin-deletion-requests` when admin deletion request summaries or review queues change
- `pnpm test:account-deletion-cleanup` when trusted account deletion cleanup arguments, safety gates, Storage cleanup, or Auth deletion behavior changes
- `pnpm test:admin-moderation-review` when moderation review-note requirements change
- `pnpm test:admin-profile-validation` when admin user validation actions or labels change
- `pnpm test:admin-queue-counts` when admin dashboard queue-count logic changes
- `pnpm test:admin-recent-activity` when admin dashboard recent activity signals change
- `pnpm test:admin-system-health` when admin dashboard system-health signals change
- `pnpm test:admin-user-items` when admin user item grouping or per-user admin item review changes
- `pnpm test:admin-item-versions` when admin item version timelines or restore flows change
- `pnpm test:admin-visibility-queue` when admin visibility queue filtering or labels change
- `pnpm test:backup-supabase` when Supabase backup behavior or backup safety helpers change
- `pnpm test:verify-backup` when Supabase backup verification, manifest, or restore-drill helper behavior changes
- `pnpm test:pwa-manifest` when app metadata, manifest, PWA config, or brand icon config changes
- `pnpm test:copy` and `pnpm check:copy` when docs, agent instructions, or public source-of-truth copy changes
- `pnpm test:docs-index` and `pnpm check:docs-index` when top-level docs are added, removed, renamed, linked from `docs/index.md`, or generated for the in-app docs route
- `pnpm test:browser-testing` and `pnpm check:browser-testing` when browser testing docs, browser scenarios, role coverage, or browser-testing skills change
- `pnpm test:supabase-branching` and `pnpm check:supabase-branching` when Supabase branching setup, branch privacy, migration dry-run, or development-branch docs change
- `pnpm test:restore-drills` and `pnpm check:restore-drills` when backup restore drill, encrypted retention, or recovery evidence docs change
- `pnpm test:observability` and `pnpm check:observability` when privacy-preserving diagnostics, log boundaries, or live observability setup tasks change
- `pnpm test:production-readiness-audit` and `pnpm check:production-readiness-audit` when prompt-to-artifact evidence, release blockers, or goal-completion criteria change
- `pnpm test:release-checklist` and `pnpm check:release-checklist` when package scripts, manual CI, release checklist, or CI/CD docs change
- `pnpm test:github-workflows` and `pnpm check:github-workflows` when GitHub workflow files or CI/CD docs change
- `pnpm test:supabase-contract` and `pnpm check:supabase-contract` when Supabase schema, migrations, RPCs, RLS policies, Storage limits, or Supabase contract checker behavior change
- `pnpm test:static-export` and `pnpm check:static-export` when Next.js routing, config, or app architecture changes
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm build` with safe public Supabase values when build behavior may be affected
- Focused lint or targeted tests when a change touches a risky subsystem

## Required For Docs And Agent Changes

- `git diff --check`
- The in-app docs build path is expected to pass for `docs/` changes.
- ASCII or intentional Unicode check for new durable project files
- Links point to the current source of truth where possible
- Docs avoid repeating long content already maintained elsewhere

## Required Before Merging To Main

- Run the manual CI and Pages workflows when the change needs remote verification, release confidence, or app deployment.
- PR describes user-facing and fork-facing impact.
- Fork customization surfaces were preserved or migration notes were added.
- Security/privacy impact is explicitly considered.
- Merged head branch can be deleted.

## Current Known Exceptions

- Full `pnpm lint` is expected to pass without warnings.
- Supabase MCP/server-side maintenance verification is pending. Do not claim production database hardening until schema, RLS, Storage, functions, and migrations have been reviewed with approved access.
- The CI workflow is secret-free and manual-only. `pnpm check:github-workflows` guards that workflow files keep `workflow_dispatch` and avoid automatic triggers. Docs deployment is also manual-only and only deploys from `main`. Supabase backups and remote migrations require separate trusted workflows.
