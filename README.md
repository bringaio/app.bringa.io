# bringa.io

Open source sharing and borrowing software for communities, clubs, and associations.

[Configuration](docs/configuration.md) | [Supabase](docs/supabase.md) | [Maintenance](docs/maintenance.md) | [Roadmap](docs/roadmap.md) | [Security](SECURITY.md)

## Status

This repository is the upstream app for `app.bringa.io`. Organization-specific deployments, such as a CONTEKT fork, should keep branding, legal text, repository links, and operator defaults in configuration or fork-owned docs instead of hardcoding them across the app.

## Stack

- Next.js static export
- React
- Supabase Auth, Postgres, Storage, RLS, and Edge Functions
- pnpm

## Quick Start

```bash
pnpm install
cp .env.example .env.local
pnpm generate:config
pnpm dev
```

Open `http://localhost:3000`.

## Configuration

Public deployment settings live in `config/bringa.config.jsonc`.

```bash
pnpm generate:config
pnpm check:config
```

Secrets stay in `.env.local` or the deployment provider. Never put service role keys in public config.

## Supabase

Read `docs/supabase.md` before changing schema, RLS, Auth, Storage, or Edge Functions.

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
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

`pnpm lint` currently reports known legacy issues. Keep new work scoped and document unrelated failures until the lint cleanup is complete.

## Contributing

Use Conventional Commits and small pull requests. Preserve fork-specific config and legal/branding text when syncing from upstream.

## License

MIT. See `LICENSE`.
