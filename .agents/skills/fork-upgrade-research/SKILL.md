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

## Guardrails

- Preserve fork-specific `config/bringa.config.jsonc`.
- Treat migrations and RLS changes as high-risk until reviewed.
- Ask before modifying legal terms, privacy text, branding, or production data behavior.
