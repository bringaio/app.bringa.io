---
title: Fork Content Strategy
---

# Fork Content Strategy

This repository is the generic `app.bringa.io` upstream. Forks should be able to change title, logo, legal text, language, repository links, operator identity, Supabase settings, and deployment behavior while still rebasing or merging upstream updates cleanly.

## Principle

Do not solve fork customization by ignoring files, hiding conflicts, or editing shared app logic for local content.

Prefer layered sources of truth:

1. upstream defaults;
2. documented deployment config;
3. deployment content overrides;
4. deployment secrets;
5. generated artifacts.

## What Belongs Where

### Structured Public Settings

Use config for short, structured values:

- app name and short name;
- canonical URL and home route;
- logo text and simple brand labels;
- repository, issue, and discussion links;
- operator name and contact placeholders;
- media limits and accepted MIME types;
- feature switches.

Current source of truth: `config/bringa.config.jsonc`.

Target direction:

```text
config/base.config.jsonc
config/deployments/app.bringa.io.jsonc
config/deployments/example-community.jsonc
config/local.config.jsonc
```

### Longer Local Text

Use content files for text that will diverge by operator, language, jurisdiction, or tone:

- terms;
- privacy notes;
- public-domain or fallback-license wording;
- contribution notes;
- onboarding copy;
- local help pages;
- legal disclaimers.

Target direction:

```text
content/default/legal/en.md
content/default/legal/de.md
content/deployments/<deployment-slug>/legal/en.md
content/deployments/<deployment-slug>/legal/de.md
```

Upstream should validate that required content exists, but should not require every fork to use upstream wording.

### Brand Assets

Use stable asset paths that can be overridden by deployment:

```text
public/brand/default/logo.svg
public/brand/default/icon.svg
public/brand/deployments/<deployment-slug>/logo.svg
public/brand/deployments/<deployment-slug>/icon.svg
```

Generated favicons and app icons should be documented as generated artifacts when automation exists.

### Secrets

Secrets never belong in config or content files.

Use local env files, deployment secrets, or Supabase function secrets for:

- service role keys;
- Telegram tokens;
- deployment tokens;
- private MCP credentials;
- provider client secrets.

## Pull Requests Across Forks

Fork-specific content should be tracked normally in the fork. The strategy is not to hide it from git.

To keep upstream PRs smooth:

- keep generic code changes separate from local content changes;
- prefer small rebaseable branches;
- document deployment config changes in PR descriptions;
- avoid custom merge drivers for legal or config conflicts;
- resolve legal/content conflicts manually and intentionally;
- delete merged branches when GitHub settings allow it.

## CI/CD

Upstream workflows should stay secret-free by default.

Required shared checks:

- install dependencies;
- generate config;
- validate config;
- lint;
- typecheck or static build;
- docs build.

Optional deployment checks:

- deploy static app;
- deploy Supabase migrations;
- deploy Edge Functions;
- run backups;
- run environment-specific smoke tests.

Forks should add repository variables and secrets for optional deployment jobs without editing shared checks where possible.

## GitHub Pages Docs

Docs live in `docs/` and should remain publishable through GitHub Pages.

Forks can:

- publish upstream docs as-is;
- add local setup pages;
- link local legal pages;
- keep the upstream roadmap and optimization register visible while adding fork-specific notes.

## Future Automation

Before automating fork upgrades, research current GitHub fork/template APIs and metadata.

Agents should propose careful upgrade PRs that:

- identify breaking changes;
- preserve local config and content;
- call out manual legal or Supabase decisions;
- run secret-free checks before suggesting deployment.
