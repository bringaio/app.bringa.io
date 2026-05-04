---
title: Configuration
---

# Configuration

Public deployment settings are resolved from layered JSONC config.

Current sources of truth:

- `config/base.config.jsonc`: shared defaults for all deployments.
- `config/deployments/app.bringa.io.jsonc`: default upstream deployment profile.
- `config/deployments/<slug>.jsonc`: fork or environment profile, selected with `BRINGA_DEPLOYMENT`.
- `config/local.config.jsonc`: ignored local override, only used when `BRINGA_CONFIG_INCLUDE_LOCAL=true`.

Run:

```bash
pnpm generate:config
```

The default deployment is `app.bringa.io`. To generate another deployment:

```bash
BRINGA_DEPLOYMENT=example-community pnpm generate:config
```

This writes:

- `public/bringa.config.json` for runtime/public inspection.
- `src/config/bringa.config.generated.json` for typed app imports.

Run:

```bash
pnpm check:config
```

This resolves the selected deployment profile, checks generated files for staleness, and verifies that configured public content and brand asset paths point to files in `public/`.

Run:

```bash
pnpm test:config
```

This verifies the config-layering behavior itself.

Use `.env.local` for secrets and deployment-specific values that must not be public. Service role keys never belong in JSONC config.

## Layering Rules

Later layers override earlier layers:

1. base config;
2. selected deployment profile;
3. local override when explicitly enabled.

Nested objects are merged. Arrays and scalar values replace earlier values. `$schema` is allowed in source layers but is removed from generated public config.

Local overrides are opt-in because generated config is tracked. This avoids accidentally making `public/bringa.config.json` and `src/config/bringa.config.generated.json` depend on one developer's ignored local file.

## Common Fork Fields

- `app.name`, `app.shortName`, `branding.logoText`: visible app identity.
- `branding.logoPath`, `branding.iconPath`, `branding.appleTouchIconPath`: public brand assets used by navigation, metadata, and the PWA manifest.
- `branding.themeColor`, `branding.backgroundColor`: install and browser chrome colors for the generated manifest.
- `operator.defaultOwnerLabel`: default owner label for operator-owned items.
- `repository.url`, `repository.issuesUrl`: GitHub links shown in the app.
- `legal.termsPath`: app route that displays terms.
- `legal.termsContentPath`: public Markdown file fetched by the terms route.
- `legal.publicDomainIntent`: contribution intent flag for UI and docs.
- `media.*`: accepted image types and upload/compression limits.
- `features.*`: public feature switches.
