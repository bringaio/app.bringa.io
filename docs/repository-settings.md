---
title: Repository Settings
---

# Repository Settings

Some GitHub settings are repository state, not code. Keep this checklist aligned with `docs/conventions.md` and review it after major workflow changes.

## Pull Requests

- Enable rebase merging.
- Disable merge commits.
- Keep squash merging disabled unless maintainers explicitly want one-commit PR history.
- Enable automatic deletion of head branches after pull requests merge.
- Require PR review before merging once the maintainer team grows beyond one trusted operator.

## Branch Protection

Protect `main` after the manual CI process is stable.

Manual checks to run before important merges or releases:

- `Secret-free quality checks`
- `Deploy GitHub Pages app`

Recommended rules:

- Require linear history.
- Block force pushes.
- Block branch deletion for `main`.
- Allow administrators to bypass only when an outage or security incident requires it.
- Do not require automatic status checks while workflows are manual-only unless maintainers explicitly commit to running them before merge.

## GitHub Pages

- Set GitHub Pages source to GitHub Actions.
- Use the `github-pages` environment.
- Protect the `github-pages` environment if deployments should require approval.
- Keep app deployment secret-free and run it manually from `main` when deployment is needed.

## Forks

Fork operators can keep these workflows without upstream secrets. Deployment-specific app hosting, Supabase secrets, custom domains, and legal text belong in fork-owned repository settings, environment variables, and config files.
