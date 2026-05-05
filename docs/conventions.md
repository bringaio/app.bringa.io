---
title: Conventions
---

# Conventions

These conventions keep the upstream repository easy to review, fork, sync, and maintain.

## Git And Pull Requests

- Use Conventional Commits.
- Prefer small, coherent commits.
- Push after every commit unless the user explicitly asks for local-only work.
- Use rebase merging for pull requests.
- Keep `main` linear and protected once CI is in place.
- Enable GitHub's automatic deletion of head branches after pull requests are merged.
- Merged branches are not an archive. Git history and pull requests are the archive.
- Keep the manual GitHub settings checklist in `docs/repository-settings.md` aligned with these rules.

Recommended branch names:

- `codex/<topic>` for Codex-created branches.
- `feat/<topic>` for human feature work.
- `fix/<topic>` for bug fixes.
- `docs/<topic>` for docs-only work.
- `chore/<topic>` for maintenance.

## Source Of Truth

Every durable fact should have one home.

- Public deployment config: `config/base.config.jsonc` plus `config/deployments/<slug>.jsonc`
- Generated public config: `public/bringa.config.json`
- Typed app config: `src/config/bringa.config.generated.json`
- Secrets: `.env.local`, deployment secrets, or Supabase function secrets
- Agent rules and workflows: `.agents/`
- User-facing docs: `docs/`
- Roadmap and anti-roadmap: `docs/optimization-options.md`

When adding new text, decide whether it is a source of truth, a short summary, or a pointer. Prefer pointers over repeated prose.

## Naming Conventions

Keep names predictable across React, scripts, config, and Supabase. Prefer matching established local patterns over broad renames.

- React component exports use PascalCase.
- Component filenames under `src/components/` use kebab-case.
- Hooks use `useX` names and may keep camelCase filenames such as `src/hooks/useAuth.tsx`.
- App Router route folders use lowercase or kebab-case segments.
- Utility and domain modules under `src/lib/` use kebab-case filenames.
- Config keys use lower camelCase.
- Supabase tables, columns, enums, policies, and RPC function names use snake_case.
- Supabase migrations use `YYYYMMDDHHMMSS_snake_case.sql`.
- Edge Function directory names use kebab-case; preserve legacy deployed names until a migration plan exists.
- Scripts under `scripts/` use kebab-case and pair checkers with `.test.mjs` when behavior is not trivial.
- Branches and commits follow the Git And Pull Requests section.

## CI/CD

CI should be useful for upstream and forks without creating noise on every push.

The shared GitHub workflows are manual-only. Run them with GitHub Actions `workflow_dispatch` when a pull request, release, dependency update, or operational check needs remote verification.

`pnpm check:github-workflows` verifies every workflow in `.github/workflows/` keeps `workflow_dispatch` and does not add automatic triggers such as `push` or `pull_request`.

The manual CI workflow runs these secret-free checks:

- Use Node 24 locally to match CI, `package.json` `engines.node`, `.node-version`, and `@types/node`.
- `pnpm install --frozen-lockfile`
- `pnpm check:config`
- `pnpm test:config`
- `pnpm test:app-config`
- `pnpm test:media-policy`
- `pnpm test:env-example`
- `pnpm test:agents`
- `pnpm test:naming-conventions`
- `pnpm test:copy`
- `pnpm test:optimization-options`
- `pnpm test:docs-index`
- `pnpm test:browser-testing`
- `pnpm test:supabase-branching`
- `pnpm test:restore-drills`
- `pnpm test:observability`
- `pnpm test:production-readiness-audit`
- `pnpm test:release-checklist`
- `pnpm test:github-workflows`
- `pnpm test:dashboard-query`
- `pnpm test:item-visibility-request`
- `pnpm test:issue-prompt`
- `pnpm test:admin-notification-settings`
- `pnpm test:admin-deletion-requests`
- `pnpm test:account-deletion-cleanup`
- `pnpm test:admin-moderation-review`
- `pnpm test:admin-profile-validation`
- `pnpm test:admin-queue-counts`
- `pnpm test:admin-recent-activity`
- `pnpm test:admin-system-health`
- `pnpm test:admin-user-items`
- `pnpm test:admin-item-versions`
- `pnpm test:admin-visibility-queue`
- `pnpm test:backup-supabase`
- `pnpm test:verify-backup`
- `pnpm test:pwa-manifest`
- `pnpm check:env-example`
- `pnpm check:agents`
- `pnpm check:naming-conventions`
- `pnpm check:copy`
- `pnpm check:optimization-options`
- `pnpm check:docs-index`
- `pnpm check:browser-testing`
- `pnpm check:supabase-branching`
- `pnpm check:restore-drills`
- `pnpm check:observability`
- `pnpm check:production-readiness-audit`
- `pnpm check:release-checklist`
- `pnpm check:github-workflows`
- `pnpm test:static-export`
- `pnpm check:static-export`
- `pnpm check:supabase-contract`
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm build` with safe public dummy Supabase values when needed
- GitHub Pages docs build when the manual Docs workflow is run
- The Docs workflow deploys Pages only when manually run on `main`.
- `docs/_config.yml` declares the expected project Pages `url` and `baseurl` so manual branch builds can validate Jekyll output without requiring deployment access to Pages settings.

Lint should be quiet. Treat new warnings as work to resolve or as explicit technical debt that belongs in `docs/optimization-options.md`.

Secret-required work belongs only on trusted branches and environments:

- production deployment
- Supabase backups
- trusted account deletion cleanup through `pnpm cleanup:account-deletion`
- remote Supabase migrations
- Edge Function deployment
- any workflow that needs service role keys or provider secrets

## Documentation

Documentation should be compact, practical, and link to the source of truth.

- Keep setup docs friendly for non-expert maintainers.
- Put conventions that affect contributors in `docs/`.
- Put agent-only operating details in `.agents/`.
- Keep `AGENTS.md` short and navigational.
- Develop docs in this repository so they can later publish cleanly to GitHub Pages.
- Keep English documentation in English; `pnpm check:copy` blocks configured German organization terms in English docs/source-of-truth files.
- Keep `docs/index.md` and the GitHub Pages sidebar navigation linked to every top-level docs page; `pnpm check:docs-index` enforces both.

## Static Export

This app uses Next.js static export. Keep `output: 'export'` and `images.unoptimized: true` in `next.config.ts`, avoid middleware, and keep any future App Router route handlers explicitly static. `pnpm check:static-export` enforces this architecture boundary.

## Hyperoptimum Practice

The best change is the most coherent next improvement, not the largest possible change. Prefer work that reduces hidden complexity, improves forkability, protects privacy, and makes the next contributor more confident. See `docs/hyperoptimum.md` for the durable interpretation.
