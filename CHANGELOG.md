# Changelog

This file records human-readable upstream app versions. `package.json` is the source of truth for the current app version, using [Semantic Versioning 2.0.0](https://semver.org/) in normal `MAJOR.MINOR.PATCH` form. Git tags such as `v0.2.1` are the preferred stable anchors for fork upgrades.

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
