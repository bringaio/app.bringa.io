# Changelog

This file records human-readable upstream app versions. `package.json` is the source of truth for the current app version, using [Semantic Versioning 2.0.0](https://semver.org/) in normal `MAJOR.MINOR.PATCH` form. Git tags such as `v0.2.2` are the preferred stable anchors for fork upgrades.

## 0.2.7 - 2026-05-14

- Added optional `code-review-graph` setup, stewardship guidance, and agent-first development documentation.
- Cleaned repository root Markdown by moving GitHub community files to `.github/` and the changelog into `docs/`.
- Added shared image referrer-policy hardening for rendered app images.

## 0.2.2 - 2026-05-13

- Tightened docs source-of-truth ownership and reduced duplicated fork launch guidance.
- Updated current GitHub Pages, DNS, HTTPS, and Supabase CLI evidence in readiness docs.
- Added a docs-health checker for source-of-truth docs, multilingual roadmap language, fork runbook pointers, and documented `pnpm` commands.
- Clarified that locale config is metadata today and full multilingual UI remains roadmap work.

## 0.2.1 - 2026-05-13

- Documented SemVer 2.0.0 as the repository's version-numbering standard.
- Added a dev-server startup rule for browser testing so agents first check for an existing local server and only stop servers they started.
- Updated browser-testing checks to keep the dev-server startup rule present in docs and skills.

## 0.2.0 - 2026-05-13

- Added fork-upgrade guidance for syncing forks with upstream while preserving deployment config, legal text, brand assets, Supabase data policy, and operator branches.
- Added a version-bump check so changed branches must increase `package.json.version` before merge.
- Added generated release metadata from `package.json` and surfaced the app version in the user menu.
- Updated agent workflows and fork-maintenance skills so future repository changes include version bumps and merged-branch cleanup.

## 0.1.0 - 2026-05-12

- Established the first public fork setup path with GitHub Pages, Supabase Auth/OAuth, first-admin bootstrap, setup-readiness guard, and fork-safe documentation.
