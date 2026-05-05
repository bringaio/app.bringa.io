---
name: fork-operator-onboarding
description: Use when an agent is asked to configure, publish, or operate a fork of this repository for a new domain, community, organization, or Supabase project.
---

# Fork Operator Onboarding

Help operators get from fork to usable app without leaking secrets or making upstream pull requests painful.

## Read First

- `docs/forking.md`
- `docs/configuration.md`
- `docs/open-source-release.md`
- `docs/supabase.md`
- `docs/supabase-mcp.md` when live Supabase access is involved
- `.agents/skills/fork-and-ci-maintenance/SKILL.md`
- `.agents/skills/supabase-mcp/SKILL.md` when schema, Auth, Storage, Edge Functions, or backups are involved

## Workflow

1. Confirm the fork target: deployment slug/domain, GitHub owner/repo, app/operator name, and whether the work is for upstream or a fork.
2. Keep fork-owned identity, legal text, brand assets, repository links, and public Supabase values in deployment config or deployment content.
3. Never put Supabase secret keys, service-role keys, OAuth secrets, Telegram tokens, or database passwords into Git, generated public config, screenshots, issues, or chat.
4. Start with a dry run:

   ```bash
   pnpm setup:operator --dry-run
   ```

5. Create or update the deployment profile with `pnpm setup:operator` or `pnpm create:deployment -- <slug> --owner <owner> --repo <repo>`.
6. Generate and check public config:

   ```bash
   BRINGA_DEPLOYMENT=<slug> pnpm generate:config
   BRINGA_DEPLOYMENT=<slug> pnpm check:config
   ```

7. For Supabase setup, prefer a fresh project, apply the committed schema/migrations, configure Auth Site URL and redirect URLs, then verify RLS, Storage, Edge Functions, and maintenance-key access before disabling local demo mode.
8. For GitHub Pages, keep workflows manual-only and use Pages source `GitHub Actions`; use `deploy/<slug>` only for fork-owned publication branches, not upstream contribution PRs.
9. Run the local quality gates before pushing fork setup changes.
10. Record deployment-specific open items in fork docs or operator notes; add generic reusable ideas to `docs/optimization-options.md`.

## Default Answer To "Set Up This Fork"

If a user asks an agent to set up a fork, the agent should:

- create or update a deployment profile instead of editing upstream defaults directly;
- keep local demo mode available until the fork's Supabase project is verified;
- guide the operator through public Supabase URL/publishable-key config and server-only maintenance keys separately;
- run config, secret, workflow, Supabase contract, lint, typecheck, Edge Function, and build checks;
- push changes on an appropriate branch when the repo remote is available.
