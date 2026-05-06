---
title: Local Supabase Development
---

# Local Supabase Development

Use the local Supabase CLI stack as the default backend development path for contributors and free-account-oriented forks.

This page is based on a 2026-05-06 review of the current Supabase local development, CLI, seeding, Edge Functions, and branching documentation.

## Decision

Local Supabase is enough for normal app development in this repository:

- database migrations and schema resets;
- RLS, RPC, trigger, and Storage policy testing;
- local Auth sign-up/sign-in behavior with the Supabase Auth service;
- local Storage buckets and object uploads;
- local Edge Function serving through the Supabase CLI;
- reproducible seed data for developer and agent workflows.

Supabase Branching remains useful for paid teams that want remote preview, staging, or QA environments. It is not the default path for forks that target free Supabase accounts, because each branch is a separate environment with its own usage and billing surface. Do not create a separate `app.bringa.io_dev` project by default either; use a local stack first, then one hosted project for the fork's real deployment.

## Development Ladder

1. Browser local demo: run `pnpm dev`, open the app, and use **Open local demo**. This needs no Docker, Supabase, OAuth, `.env.local`, or invite code.
2. Local Supabase stack: use this when changing schema, RLS, RPCs, Auth flows, Storage uploads, or Edge Functions.
3. Hosted Supabase project: use this for final operator setup, OAuth provider redirects, custom domains, live secrets, backups, advisors, and logs.
4. Supabase Branching or a separate dev project: use only after an operator accepts the cost, maintenance, and privacy tradeoffs.

## Prerequisites

- Node and pnpm from this repository.
- A Docker-compatible container runtime such as Docker Desktop, Rancher Desktop, Podman, OrbStack, or Colima.
- The repo-local Supabase CLI installed through `pnpm install`.

Use `pnpm exec supabase ...`; do not require a global Supabase binary.

## Start The Local Stack

```bash
pnpm install
pnpm exec supabase start
pnpm setup:local-supabase
pnpm doctor:local-supabase
```

The local Supabase Studio usually opens at `http://127.0.0.1:54323`, and the local API usually runs at `http://127.0.0.1:54321`.

Never expose the local Supabase stack publicly. If you are on an untrusted network, bind the Docker network to localhost as described in the official Supabase local development docs.

`pnpm setup:local-supabase` reads `pnpm exec supabase status -o env`, writes only the local public API URL and publishable key to ignored `config/local.config.jsonc`, and sets `development.localDemoMode` to `false`. It refuses remote Supabase URLs and refuses secret or service-role keys.

Use one command when you also want deterministic local data:

```bash
pnpm setup:local-supabase --seed
```

Then run the doctor when an agent or developer needs a quick handoff check:

```bash
pnpm doctor:local-supabase
```

The doctor verifies that the CLI status points at a local Supabase API URL, confirms that a public key is present, checks whether `config/local.config.jsonc` matches the running local stack, and never prints Supabase keys. If the local config is missing or drifted, it points back to `pnpm setup:local-supabase --seed`.

## Point The App At Local Supabase

The setup helper creates this file automatically. Create or edit it manually only when you need a custom local override.

Create `config/local.config.jsonc`; it is ignored by Git:

```jsonc
{
  "supabase": {
    "url": "http://127.0.0.1:54321",
    "publishableKey": "<local publishable or anon key from pnpm exec supabase status -o env>"
  },
  "development": {
    "localDemoMode": false
  }
}
```

Then run:

```bash
BRINGA_CONFIG_INCLUDE_LOCAL=true pnpm dev
```

Keep the local key in `config/local.config.jsonc` or `.env.local`, not in committed deployment profiles.

## Seed Local Demo Data

After the local stack is running, seed deterministic local users and items:

```bash
pnpm seed:local-supabase
```

The script only accepts localhost Supabase URLs. It refuses remote Supabase project URLs so production, staging, or fork-hosted projects cannot be seeded accidentally.

Default local accounts:

- `admin@bringa.local` with password `bringa-local-admin-123`
- `member@bringa.local` with password `bringa-local-member-123`

The script creates validated profiles, an admin invite code `LOCAL-DEMO`, sample visible items, and one borrowed item with history. These accounts are local development fixtures only. Do not reuse these passwords in hosted projects.

If the script cannot discover local credentials, run `pnpm exec supabase status -o env` and provide local values explicitly:

```bash
BRINGA_LOCAL_SUPABASE_URL=http://127.0.0.1:54321 \
BRINGA_LOCAL_SUPABASE_SECRET_KEY=<local secret or service-role key> \
pnpm seed:local-supabase
```

## Reset And Rebuild

Use a full reset when migrations or seed assumptions change:

```bash
pnpm exec supabase db reset
pnpm seed:local-supabase
BRINGA_CONFIG_INCLUDE_LOCAL=true pnpm dev
```

`supabase db reset` reapplies migrations and seed files. The Bringa seed helper is separate because it uses Auth Admin APIs to create local Auth users before inserting profile and admin records.

## Edge Functions

Type-check Edge Functions with:

```bash
pnpm check:edge-functions
```

Serve functions locally when working on Telegram or webhook behavior:

```bash
pnpm exec supabase functions serve --env-file .env.local
```

Keep real Telegram tokens, OAuth secrets, and Supabase server-side keys outside Git.

## What Local Supabase Does Not Prove

Local Supabase is the right default for development, but it does not replace live deployment evidence:

- final OAuth provider configuration and redirect URLs;
- custom domains and HTTPS behavior;
- Supabase dashboard settings that are not represented in `supabase/config.toml`;
- production-like logs, advisors, billing quotas, rate limits, and cold-start behavior;
- live backup and restore drills;
- Telegram delivery against real function secrets.

Use the hosted fork project for those final checks. Use Supabase Branching only when remote preview environments are worth the extra operational and billing surface.
