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

To create a new fork profile before generating config:

```bash
pnpm create:deployment -- share.example.org --owner your-github-owner --repo your-fork
```

For first deployment, the normal operator flow is:

1. create a Supabase project;
2. scaffold a deployment profile;
3. set `app.canonicalUrl`, repository links, `supabase.url`, and `supabase.publishableKey`;
4. generate config;
5. configure Supabase Auth redirect URLs for the final app domain;
6. run the manual Pages workflow from `main` or `deploy/<slug>`.

This writes:

- `public/bringa.config.json` for runtime/public inspection.
- `src/config/bringa.config.generated.json` for typed app imports.
- `public/content/generated/**` for deployment-resolved public Markdown content.
- `public/content/generated/docs/**` for the in-app documentation route.

Run:

```bash
pnpm check:config
```

This resolves the selected deployment profile, checks generated files and generated public content for staleness, and verifies that configured public content and brand asset paths point to files in `public/`.

Run:

```bash
pnpm test:config
```

This verifies the config-layering behavior itself.

Use `.env.local` for secrets and deployment-specific values that must not be public. Service role keys never belong in JSONC config.

Browser-visible Supabase values are not secrets. Set `supabase.url` and `supabase.publishableKey` in the selected deployment config or an explicitly enabled `config/local.config.jsonc`. They are included in the static app bundle and should match the Supabase project or local CLI stack that the deployment uses.

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are intentionally not used. Next.js inlines `NEXT_PUBLIC_*` values into browser bundles at build time, so keeping these public values in deployment config gives forks and GitHub Pages builds one clear source of truth.

## Local Demo Mode

`development.localDemoMode` enables the browser-only local demo for `pnpm dev`. It is useful for first-run development, agentic browser testing, and UI review without a running Supabase stack or OAuth providers.

Production builds ignore local demo mode in code. Keep it documented as a development convenience, not as an authorization feature. To test against the Supabase CLI stack instead:

```bash
supabase start
supabase status -o env
BRINGA_CONFIG_INCLUDE_LOCAL=true pnpm dev
```

Use an ignored `config/local.config.jsonc` for the local CLI `supabase.url`, `supabase.publishableKey`, and `"development": { "localDemoMode": false }`.

## Layering Rules

Later layers override earlier layers:

1. base config;
2. selected deployment profile;
3. local override when explicitly enabled.

Nested objects are merged. Arrays and scalar values replace earlier values. `$schema` is allowed in source layers but is removed from generated public config.

Local overrides are opt-in because generated config is tracked. This avoids accidentally making `public/bringa.config.json` and `src/config/bringa.config.generated.json` depend on one developer's ignored local file.

## Deployment Content

Longer deployment-specific text is kept out of JSONC and layered as files:

```text
content/default/**
content/deployments/<slug>/**
public/content/generated/**  # generated artifact
```

Default content is copied first, then `content/deployments/<slug>` overrides matching files. `content.requiredFiles` lists files that every resolved content profile must provide. Set `legal.termsContentPath` to the generated public path used by the app, usually `/content/generated/legal/en.md`.

## Common Fork Fields

- `app.name`, `app.shortName`, `branding.logoText`: visible app identity.
- `branding.logoPath`, `branding.iconPath`, `branding.pwaIcon192Path`, `branding.pwaIcon512Path`, `branding.maskableIcon512Path`, `branding.appleTouchIconPath`: public brand assets used by navigation, metadata, install icons, and the PWA manifest.
- `branding.themeColor`, `branding.backgroundColor`: install and browser chrome colors for the generated manifest.
- `operator.defaultOwnerLabel`: default owner label for operator-owned items.
- `repository.url`, `repository.issuesUrl`: GitHub links shown in the app.
- `content.sourcePath`, `content.deploymentPath`, `content.publicPath`: content profile inputs and generated public output.
- `content.docsPublicPath`: generated public output for the in-app docs route.
- `content.requiredFiles`: deployment content files required before config generation succeeds.
- `legal.termsPath`: app route that displays terms.
- `legal.termsContentPath`: public Markdown file fetched by the terms route.
- `legal.publicDomainIntent`: contribution intent flag for UI and docs.
- `supabase.url`, `supabase.publishableKey`: public browser client values for the Supabase API.
- `supabase.authRedirectPath`: app-relative redirect path used by OAuth buttons.
- `development.localDemoMode`: development-only in-browser demo data mode; ignored by production builds.
- `media.*`: accepted image types and upload/compression limits.
- `features.*`: public feature switches.
