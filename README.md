# bringa.io

Open source sharing and borrowing software for communities, clubs, associations, and local operators.

[Fork launch](docs/fork-launch-runbook.md) | [Fork upgrades](docs/fork-upgrade-runbook.md) | [Configuration](docs/configuration.md) | [Open source release](docs/open-source-release.md) | [Supabase](docs/supabase.md) | [Local Supabase Development](docs/local-supabase-development.md) | [Repository settings](docs/repository-settings.md) | [Changelog](CHANGELOG.md) | [Roadmap](docs/roadmap.md) | [Contributing](CONTRIBUTING.md) | [Security](SECURITY.md)

## Fork In 3 Steps

Bringa is meant to be pleasant to operate for your own community.

1. Configure the fork with a deployment profile.

   ```bash
   pnpm install
   pnpm setup:operator
   BRINGA_DEPLOYMENT=share.example.org pnpm generate:config
   BRINGA_DEPLOYMENT=share.example.org pnpm check:config
   ```

2. Connect Supabase, OAuth, and the first admin.

   Apply the committed schema or migrations, set Supabase Auth URLs, enable Google or GitHub OAuth, let the intended first admin sign in once, then run the guarded first-admin helper:

   ```bash
   pnpm bootstrap:first-admin --confirm-project-ref <project-ref>
   pnpm bootstrap:first-admin --confirm-project-ref <project-ref> --execute
   ```

3. Publish with GitHub Pages.

   Set Pages source to **GitHub Actions**, add your custom domain, point DNS to `<github-owner>.github.io`, run the manual **Pages** workflow, wait calmly for GitHub to issue the certificate, then enable **Enforce HTTPS**. GitHub says the HTTPS option can take up to 24 hours to become available, so a pending certificate is normal.

Use [Fork Launch Runbook](docs/fork-launch-runbook.md) for the full step-by-step guide. It covers Cloudflare DNS, GitHub Pages HTTPS timing, Supabase Auth redirect URLs, Google/GitHub OAuth callbacks, first-admin bootstrap, invite-gate verification, and agent-assisted setup.

When a fork wants the latest upstream version, use [Fork Upgrade Runbook](docs/fork-upgrade-runbook.md). Preserve fork-owned deployment config, legal text, brand assets, Supabase policy, and operator branches; bump `package.json.version`; regenerate config; run checks; and delete the upgrade branch after merge.

GitHub Pages plus hosted Supabase is the default documented path because it keeps the first deployment simple. The app is a static Next.js export backed by Supabase, so other hosts such as Cloudflare Pages and self-hosted Supabase are possible too; detailed runbooks can be added when an operator actually needs them.

If a public fork opens before it is connected to its own Supabase project, the login page shows a setup-required view with links back to the fork launch docs instead of starting OAuth against placeholder or upstream config.

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

For repository work, use a short-lived branch or fork branch. Do not commit new features directly to `main`; keep `main` as the protected integration branch and use pull requests or explicit maintainer merge work.

`package.json.version` is the single app version. The repository uses [Semantic Versioning 2.0.0](https://semver.org/) in normal `MAJOR.MINOR.PATCH` form: patch for compatible fixes, docs, and tooling; minor for intentional compatible feature releases; major for breaking changes. Every merge to `main` that changes the repository must increase it, and the generated app config exposes that version in the user menu.

## Configuration

Public deployment settings are resolved from `config/base.config.jsonc` plus a deployment profile in `config/deployments/`.

```bash
pnpm generate:config
pnpm check:config
```

Set `BRINGA_DEPLOYMENT=<profile-slug>` to generate a fork profile. The upstream default is `app.bringa.io`.

To scaffold a fork deployment profile:

```bash
pnpm setup:operator --dry-run
pnpm setup:operator
# or, non-interactively:
pnpm create:deployment -- share.example.org --owner your-github-owner --repo your-fork --dry-run
pnpm create:deployment -- share.example.org --owner your-github-owner --repo your-fork
BRINGA_DEPLOYMENT=share.example.org pnpm generate:config
```

Browser-visible Supabase values are public by design. Set `supabase.url` and `supabase.publishableKey` in the selected deployment config, not in `.env.local`. Secrets stay in `.env.local` or the deployment provider. Never put service role or secret keys in public config.

Invite codes grant app access, not admin rights. To make another person an admin, they sign in once, enter a valid invite code or get validated by an existing admin, then an existing admin promotes them from `/admin/users`.

## Supabase

Read `docs/supabase.md` before changing schema, RLS, Auth, Storage, or Edge Functions.

The Supabase CLI is installed as a repo-local dev dependency. Use `pnpm exec supabase ...` for local and remote Supabase commands so forks, agents, and CI do not depend on a global CLI install. A bare global `supabase` binary is optional.

For local backend work:

```bash
pnpm exec supabase start
pnpm setup:local-supabase --seed
pnpm doctor:local-supabase
```

Use the local Supabase stack as the default backend path for schema, RLS, RPC, Auth, Storage, and Edge Function work. It is the preferred development path for free-account-oriented forks; Supabase Branching remains optional for paid remote preview or staging workflows.

Use `pnpm exec supabase status -o env` to inspect the local API URL and anon key. `pnpm setup:local-supabase` creates the ignored local config from those public values and refuses remote URLs or secret keys. `pnpm doctor:local-supabase` checks the running local stack and local config without printing keys. Then run:

```bash
pnpm dev:docker
```

See [Local Supabase Development](docs/local-supabase-development.md) for the local seed users, reset flow, and limits of what local testing can prove.

When a server-side Supabase maintenance key is available, table backups can be created with:

```bash
pnpm check:supabase-maintenance-key
pnpm backup:supabase
```

The maintenance check prefers `SUPABASE_SECRET_KEY` and also supports `SUPABASE_SECRET_KEYS` JSON maps. Legacy `SUPABASE_SERVICE_ROLE_KEY` is supported only as a fallback for older projects.

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

The app is built as a static Next.js export and can be deployed through the manual **Pages** workflow. The upstream deployment is `app.bringa.io`; forks should add their own deployment profile, set Pages source to GitHub Actions, configure a custom subdomain, and point Supabase Auth redirect URLs at that domain. Forks can deploy from `main` or a long-lived `deploy/<slug>` branch. See `docs/repository-settings.md`.

## Contributing

Use Conventional Commits and small pull requests. Preserve fork-specific config and legal/branding text when syncing from upstream. See `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`.

## License

MIT. See `LICENSE`.
