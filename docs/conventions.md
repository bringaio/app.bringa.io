---
title: Conventions
---

# Conventions

These conventions keep the upstream repository easy to review, fork, sync, and maintain.

## Git And Pull Requests

- Use Conventional Commits.
- Prefer small, coherent commits.
- Push after every commit unless the user explicitly asks for local-only work.
- Work from a branch. Do not commit directly to `main` for normal development.
- Use rebase merging for pull requests.
- Keep `main` linear and protected once CI is in place.
- Enable GitHub's automatic deletion of head branches after pull requests are merged.
- Merged branches are not an archive. Git history and pull requests are the archive.
- Keep the manual GitHub settings checklist in `docs/repository-settings.md` aligned with these rules.

Branch naming standard:

- `main` is the protected upstream integration and release branch.
- `codex/<type>-<topic>` for agent-created upstream work, for example `codex/docs-branch-conventions` or `codex/fix-auth-redirect`.
- `<type>/<topic>` for human community pull requests, using the same intent words as Conventional Commits: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, or `ci`.
- `deploy/<deployment-slug>` for optional long-lived fork deployment branches, for example `deploy/share.example.org`.
- Branch names use lowercase ASCII, kebab-case topics, and only `/` as a namespace separator.

Branch handling:

- Create short-lived PR branches from the freshest target branch, usually `main` or the fork's synced upstream branch.
- Keep one behavioral purpose per branch. Do not mix generic upstream work with fork-specific legal text, branding, deployment profiles, or generated deployment artifacts.
- Rebase or otherwise sync a PR branch before review when the target branch has moved.
- Do not open upstream pull requests from `deploy/*`; open a clean short-lived branch based on upstream `main` instead.
- Delete merged or closed short-lived branches. Keep only durable branches such as `main` and intentional `deploy/*` branches.
- Avoid force-pushing after review starts unless history cleanup is necessary; if it is necessary, mention it in the pull request.

## Source Of Truth

Every durable fact should have one home.

- Public deployment config: `config/base.config.jsonc` plus `config/deployments/<slug>.jsonc`
- Deployment profile scaffolding: `scripts/create-deployment-profile.mjs` exposed as `pnpm create:deployment -- <slug>` with `--dry-run` for previews
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

## Scripts

Scripts are operational tooling, so optimize them for reviewability and predictable failure output.

- Prefer small pure helper functions that can be imported by matching `.test.mjs` files.
- Use CLI output that names the failing file, key, command, or missing artifact directly.
- Add JSDoc only where it clarifies a non-obvious contract, exported helper shape, side effect, environment variable, or security boundary.
- Do not add decorative comments to simple one-off checks; tests and command names should carry the routine documentation.
- Keep secret-handling scripts explicit about which environment variables are read and never print secret values.
- Pair any new checker that protects a durable contract with a `pnpm check:*` script and, when useful, a `pnpm test:*` script.

## CI/CD

CI should be useful for upstream and forks without creating noise on every push.

The shared GitHub workflows are manual-only. Run them with GitHub Actions `workflow_dispatch` when a pull request, release, dependency update, or operational check needs remote verification.

`pnpm check:github-workflows` verifies every workflow in `.github/workflows/` keeps `workflow_dispatch` and does not add automatic triggers such as `push` or `pull_request`.

The manual CI workflow runs these secret-free checks:

- Use Node 24 locally to match CI, `package.json` `engines.node`, `.node-version`, and `@types/node`.
- `pnpm install --frozen-lockfile`
- `pnpm check:config`
- `pnpm test:config`
- `pnpm test:create-deployment`
- `pnpm test:operator-setup`
- `pnpm test:auth-redirect`
- `pnpm test:app-config`
- `pnpm test:admin-route-gate`
- `pnpm test:media-policy`
- `pnpm test:protected-route`
- `pnpm test:env-example`
- `pnpm test:secrets`
- `pnpm test:agents`
- `pnpm test:naming-conventions`
- `pnpm test:copy`
- `pnpm test:optimization-options`
- `pnpm test:docs-view`
- `pnpm test:docs-index`
- `pnpm test:browser-testing`
- `pnpm test:supabase-mcp`
- `pnpm test:supabase-cli`
- `pnpm test:supabase-branching`
- `pnpm test:restore-drills`
- `pnpm test:observability`
- `pnpm test:production-readiness-audit`
- `pnpm test:release-checklist`
- `pnpm test:github-workflows`
- `pnpm test:supabase-contract`
- `pnpm test:dashboard-query`
- `pnpm test:item-visibility-request`
- `pnpm test:issue-prompt`
- `pnpm test:settings-data-actions`
- `pnpm test:login-terms`
- `pnpm test:local-demo-mode`
- `pnpm test:local-demo-supabase`
- `pnpm test:invite-flow`
- `pnpm test:profile-completion`
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
- `pnpm check:secrets`
- `pnpm check:agents`
- `pnpm check:naming-conventions`
- `pnpm check:copy`
- `pnpm check:optimization-options`
- `pnpm check:docs-index`
- `pnpm check:browser-testing`
- `pnpm check:supabase-mcp`
- `pnpm check:supabase-cli`
- `pnpm check:supabase-branching`
- `pnpm check:restore-drills`
- `pnpm check:observability`
- `pnpm check:production-readiness-audit`
- `pnpm check:release-checklist`
- `pnpm check:github-workflows`
- `pnpm test:static-export`
- `pnpm check:static-export`
- `pnpm check:supabase-contract`
- `pnpm check:edge-functions`
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm build`
- The manual Pages workflow builds the static app artifact from `out/` and deploys it only when run on `main`.
- Public Supabase browser values come from deployment config, not `NEXT_PUBLIC_*` CI environment variables.

Lint should be quiet. Treat new warnings as work to resolve or as explicit technical debt that belongs in `docs/optimization-options.md`.

Secret-required work belongs only on trusted branches and environments:

- production deployment
- Supabase backups
- trusted account deletion cleanup through `pnpm cleanup:account-deletion`
- remote Supabase migrations
- Edge Function deployment
- any workflow that needs Supabase secret keys, service role keys, or provider secrets

## Documentation

Documentation should be compact, practical, and link to the source of truth.

- Keep setup docs friendly for non-expert maintainers.
- Put conventions that affect contributors in `docs/`.
- Put agent-only operating details in `.agents/`.
- Keep `AGENTS.md` short and navigational.
- Develop docs in this repository and expose them through the app, not through a separate GitHub Pages docs site.
- Keep English documentation in English; `pnpm check:copy` blocks configured German organization terms in English docs/source-of-truth files.
- Keep `docs/index.md` linked to every top-level docs page; `pnpm check:docs-index` enforces this.

## Static Export

This app uses Next.js static export. Keep `output: 'export'` and `images.unoptimized: true` in `next.config.ts`, avoid middleware, and keep any future App Router route handlers explicitly static. `pnpm check:static-export` enforces this architecture boundary.

## Hyperoptimum Practice

The best change is the most coherent next improvement, not the largest possible change. Prefer work that reduces hidden complexity, improves forkability, protects privacy, and makes the next contributor more confident. See `docs/hyperoptimum.md` for the durable interpretation.
