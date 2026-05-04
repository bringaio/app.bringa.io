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
- No secrets, real user data, private exports, or service role keys are committed or pasted into docs.
- Verification was run and the result is reported honestly.
- The commit uses Conventional Commits.
- The branch is pushed after the commit unless the user explicitly requested local-only work or the remote is unavailable.

## Required For Code Changes

- `pnpm check:config`
- `pnpm test:config` when config generation, config layering, or generated public config behavior changes
- `pnpm test:dashboard-query` when dashboard item list filtering, search, or default view behavior changes
- `pnpm test:admin-notification-settings` when admin notification settings or planned notification controls change
- `pnpm test:admin-deletion-requests` when admin deletion request summaries or review queues change
- `pnpm test:admin-moderation-review` when moderation review-note requirements change
- `pnpm test:admin-profile-validation` when admin user validation actions or labels change
- `pnpm test:admin-queue-counts` when admin dashboard queue-count logic changes
- `pnpm test:admin-recent-activity` when admin dashboard recent activity signals change
- `pnpm test:admin-system-health` when admin dashboard system-health signals change
- `pnpm test:admin-user-items` when admin user item grouping or per-user admin item review changes
- `pnpm test:admin-item-versions` when admin item version timelines or restore flows change
- `pnpm test:admin-visibility-queue` when admin visibility queue filtering or labels change
- `pnpm test:pwa-manifest` when app metadata, manifest, PWA config, or brand icon config changes
- `pnpm test:copy` and `pnpm check:copy` when docs, agent instructions, or public source-of-truth copy changes
- `pnpm test:docs-index` and `pnpm check:docs-index` when top-level docs are added, removed, or renamed
- `pnpm test:static-export` and `pnpm check:static-export` when Next.js routing, config, or app architecture changes
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm build` with safe public Supabase values when build behavior may be affected
- Focused lint or targeted tests when a change touches a risky subsystem

## Required For Docs And Agent Changes

- `git diff --check`
- GitHub Pages docs build is expected to pass for `docs/` changes.
- ASCII or intentional Unicode check for new durable project files
- Links point to the current source of truth where possible
- Docs avoid repeating long content already maintained elsewhere

## Required Before Merging To Main

- Run the manual CI and Docs workflows when the change needs remote verification, release confidence, or docs deployment.
- PR describes user-facing and fork-facing impact.
- Fork customization surfaces were preserved or migration notes were added.
- Security/privacy impact is explicitly considered.
- Merged head branch can be deleted.

## Current Known Exceptions

- Full `pnpm lint` is expected to pass without warnings.
- Supabase MCP/service-role verification is pending. Do not claim production database hardening until schema, RLS, Storage, functions, and migrations have been reviewed with approved access.
- The CI workflow is secret-free and manual-only. Docs deployment is also manual-only and only deploys from `main`. Supabase backups and remote migrations require separate trusted workflows.
