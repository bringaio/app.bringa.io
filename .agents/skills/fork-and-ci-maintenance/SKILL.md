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
- Rebase is the preferred PR merge style.
- Merged head branches should be deleted automatically where GitHub settings allow it.
- CI should split secret-free checks from secret-required deployment work.
- Fork-specific identity, legal text, and brand assets should move toward deployment profiles.
- Legal text is expected to diverge by operator, jurisdiction, and language. Validate structure, not upstream wording.

## Before Finishing

- Update user-facing docs when the convention affects other developers.
- Update `.agents/` when the convention should affect future agents.
- Add follow-up ideas to `docs/optimization-options.md` instead of expanding the task.
