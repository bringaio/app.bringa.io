---
name: fork-and-ci-maintenance
description: Use when changing fork customization, deployment profiles, GitHub Actions, GitHub Pages docs, PR merge conventions, branch cleanup, or CI/CD behavior.
---

# Fork And CI Maintenance

Keep upstream changes easy to adopt by forks. Do not solve fork customization by hiding files from CI or by relying on local-only Git merge drivers.

## Read First

- `docs/conventions.md`
- `docs/forking.md`
- `docs/fork-content-strategy.md`
- `.agents/rules/source-of-truth.md`

## Rules

- Push after every commit unless the user explicitly asks for local-only work or the remote is unavailable.
- Agent-created upstream branches use `codex/<type>-<topic>`.
- Human upstream contribution branches use `<type>/<topic>`.
- Fork-owned publishing branches may use `deploy/<deployment-slug>` and should not be used for upstream pull requests.
- Normal feature work should happen on a fork or short-lived branch, not directly on `main`.
- `package.json.version` is the single app version. Bump it for every repository-changing merge to `main` using Semantic Versioning 2.0.0 in normal `MAJOR.MINOR.PATCH` form, and keep generated runtime config current.
- Rebase is the preferred PR merge style.
- Protect `main` at least against force pushes and deletion. Add required pull requests/status checks when the maintainer workflow is ready for them.
- Merged head branches should be deleted automatically where GitHub settings allow it.
- Local or fast-forward merges still need explicit cleanup: delete the merged remote head branch on GitHub and then delete the local branch.
- CI should split secret-free checks from secret-required deployment work.
- Fork-specific identity, legal text, and brand assets should move toward deployment profiles.
- Legal text is expected to diverge by operator, jurisdiction, and language. Validate structure, not upstream wording.
- When a fork upgrades from upstream, preserve fork-owned deployment config, legal text, brand assets, Supabase policy, and operator branches; choose one SemVer version greater than both fork and upstream versions.

## Before Finishing

- Update user-facing docs when the convention affects other developers.
- Update `.agents/` when the convention should affect future agents.
- Run `pnpm check:version-bump -- --base origin/main` before merge-oriented completion.
- Add follow-up ideas to `docs/optimization-options.md` instead of expanding the task.
