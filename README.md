# bringa.io

Open source sharing and borrowing software for communities, clubs, associations, and local operators.

[Configuration](docs/configuration.md) | [Open source release](docs/open-source-release.md) | [Supabase](docs/supabase.md) | [Repository settings](docs/repository-settings.md) | [Roadmap](docs/roadmap.md) | [Contributing](CONTRIBUTING.md) | [Security](SECURITY.md)

## Status

This repository is the upstream app for `app.bringa.io`. Organization-specific deployments should keep branding, legal text, repository links, and operator defaults in configuration or fork-owned docs instead of hardcoding them across the app.

## Stack

- Next.js static export
- React
- Supabase Auth, Postgres, Storage, RLS, and Edge Functions
- pnpm

## Quick Start

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`, then use **Open local demo** on the login page. The first run does not need a live Supabase project, OAuth provider, `.env.local`, or invite code.

The local demo uses in-browser fixture data and is guarded so it only runs in development builds. Production builds ignore the demo flag even when it is present in public config.

## Configuration

Public deployment settings are resolved from `config/base.config.jsonc` plus a deployment profile in `config/deployments/`.

```bash
pnpm generate:config
pnpm check:config
```

Set `BRINGA_DEPLOYMENT=<profile-slug>` to generate a fork profile. The upstream default is `app.bringa.io`.

To scaffold a fork deployment profile:

```bash
pnpm create:deployment -- share.example.org --owner your-github-owner --repo your-fork
BRINGA_DEPLOYMENT=share.example.org pnpm generate:config
```

Browser-visible Supabase values are public by design. Set `supabase.url` and `supabase.publishableKey` in the selected deployment config, not in `.env.local`. Secrets stay in `.env.local` or the deployment provider. Never put service role keys in public config.

## Supabase

Read `docs/supabase.md` before changing schema, RLS, Auth, Storage, or Edge Functions.

For local backend work:

```bash
supabase start
supabase status
```

Use `supabase status -o env` to inspect the local API URL and anon key. To use the local Supabase stack instead of the browser demo, create an ignored `config/local.config.jsonc`, set `development.localDemoMode` to `false`, add the local public Supabase values there, then run:

```bash
BRINGA_CONFIG_INCLUDE_LOCAL=true pnpm dev
```

When a service role key is available, table backups can be created with:

```bash
pnpm backup:supabase
```

Backups are written to `backups/`, which is ignored by Git. Storage objects and Auth users need separate export steps.

## Agents

Agents should start with `AGENTS.md`, then read relevant rules, skills, and workflows in `.agents/`.

Important sources of truth:

- `.agents/rules/core.md`
- `.agents/rules/privacy-and-supabase.md`
- `docs/optimization-options.md`
- `docs/issue-prompt-template.md`

## Verification

```bash
pnpm check:config
pnpm test:config
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

`pnpm lint` should pass without warnings. Treat new warnings as work to resolve or explicitly track.

## GitHub Pages

The app is built as a static Next.js export and can be deployed through the manual **Pages** workflow. The upstream deployment is `app.bringa.io`; forks should add their own deployment profile, set Pages source to GitHub Actions, configure a custom subdomain, and point Supabase Auth redirect URLs at that domain. See `docs/repository-settings.md`.

## Contributing

Use Conventional Commits and small pull requests. Preserve fork-specific config and legal/branding text when syncing from upstream. See `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`.

## License

MIT. See `LICENSE`.
