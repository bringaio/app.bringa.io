---
name: fork-upgrade-research
description: Use when finding repositories that forked or reused this project, proposing upstream updates, or planning careful synchronization across forks.
---

# Fork Upgrade Research

Goal: help maintainers discover compatible upgrades without overwriting fork identity, legal text, deployment config, or data policies.

## Research Prompt Pattern

Find public forks or repositories derived from `bringaio/app.bringa.io`. For each repository, summarize visible divergence, likely compatibility with upstream, and upgrade risks. Prioritize breaking changes, migrations, legal/branding files, and security fixes. Suggest small PR-sized upgrade paths. Do not assume private repository access.

## Upgrade Proposal Pattern

This upstream change may help your fork because: `<benefit>`. It may be risky because: `<migration/config/legal/security risk>`. Suggested path: `<small ordered steps>`. Before applying: back up Supabase, review fork config, and test auth/item flows.

## Upgrade Execution Pattern

Use `docs/fork-upgrade-runbook.md`. Confirm current fork version, target upstream version or tag, deployment slug, app URL, and Supabase project. Create a short-lived upgrade branch, fetch upstream `main` and tags, merge or rebase the target, preserve fork-owned config/content/assets/Supabase policy, bump `package.json.version` above both fork and upstream using Semantic Versioning 2.0.0 in normal `MAJOR.MINOR.PATCH` form, regenerate config for the fork slug, run secret-free checks, document manual Supabase tasks, smoke-test login/settings/admin/items, and delete the upgrade branch after merge.

## Guardrails

- Preserve fork-specific `config/deployments/<slug>.jsonc` and public content/brand assets.
- Treat migrations and RLS changes as high-risk until reviewed.
- Treat `package.json.version` as the single app version; do not invent a second fork version unless a maintainer explicitly requests it.
- Use patch for compatible fixes, docs, and tooling; minor for intentional compatible feature releases; major for breaking changes.
- Ask before modifying legal terms, privacy text, branding, or production data behavior.
