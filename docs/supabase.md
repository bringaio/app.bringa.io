---
title: Supabase
---

# Supabase

Supabase is the current backend for Auth, Postgres, Storage, RLS, and Edge Functions.

Before changing schema or policies, read [Supabase Contract Audit](supabase-contract-audit.md).
The repository-level Supabase source-of-truth notes live in `supabase/README.md`.
Agent and maintainer setup for Supabase MCP lives in [Supabase MCP Agent Setup](supabase-mcp.md).
Default local backend development lives in [Local Supabase Development](local-supabase-development.md).
Optional remote-preview branch setup tasks live in [Supabase Branching](supabase-branching.md).
Restore rehearsal and encrypted retention evidence live in [Restore Drills](restore-drills.md).
Privacy-preserving diagnostics and live log boundaries live in [Observability](observability.md).
Run `pnpm check:supabase-contract` after changing RPCs, item write policies, or Storage bucket limits.

## Quick Operator Setup

For a fork that wants to run the app:

1. Create a Supabase project.
2. For a fresh project, apply `supabase/schema.sql` as the baseline. For an existing project, apply reviewed incremental migrations from `supabase/migrations/`.
3. Create or confirm the `items` Storage bucket and policies through the schema/migration flow.
4. Configure Auth providers such as GitHub or Google in Supabase.
5. Set the Supabase Site URL to the final app URL, for example `https://share.example.org`.
6. Add the exact app redirect URL used by `supabase.authRedirectPath`, for example `https://share.example.org/dashboard`.
7. Copy the public project URL and publishable key into `config/deployments/<slug>.jsonc`.
8. Copy `.env.example` to `.env.local`, set `SUPABASE_URL` or `SUPABASE_PROJECT_REF`, and set `SUPABASE_SECRET_KEY` or `SUPABASE_SECRET_KEYS` only for trusted local maintenance after confirming the target project.
9. Keep Supabase secret keys, service role keys, OAuth secrets, and provider secrets outside Git.
10. Run `pnpm check:supabase-maintenance-key` to verify server-side maintenance access without printing key values.

The public project URL and publishable key are expected to reach the browser. They are safe only when Row Level Security, Storage policies, and RPC boundaries are correct. Run `pnpm check:supabase-contract` after schema or policy changes.

Hosted Supabase is the default documented path. Self-hosted Supabase is possible, but currently needs operator-owned documentation for backups, upgrades, SMTP/Auth provider configuration, Storage, Edge Functions, and observability.

## Local Development Default

For contributors and free-account-oriented forks, use the repo-local Supabase CLI stack before considering a second hosted dev project or Supabase Branching:

```bash
pnpm exec supabase start
pnpm setup:local-supabase --seed
pnpm doctor:local-supabase
BRINGA_CONFIG_INCLUDE_LOCAL=true pnpm dev
```

The local stack is sufficient for normal schema, RLS, RPC, Auth, Storage, and Edge Function development. The doctor checks the running local stack and ignored local config without printing keys. Local development does not replace final hosted checks for OAuth redirects, custom domains, live secrets, backups, advisors, logs, and Telegram delivery. See [Local Supabase Development](local-supabase-development.md).

Supabase Branching is optional for paid remote preview, staging, or QA workflows. It is not the default path for forks that target free Supabase accounts.

## Before MCP Access

- Configure `.env.local` from `.env.example`.
- Do not add real Supabase secret keys or service role keys to docs or commits.
- Use `pnpm backup:supabase` only after confirming the target project.
- Prefer schema and policy review before reading real rows.
- Use [Supabase MCP Agent Setup](supabase-mcp.md) for project-scoped MCP, read-only audit mode, the `app.bringa.io` project, and secret-key or legacy service-role handoff.

## Live MCP Review

When Supabase MCP and server-side maintenance access are available, inspect:

- Tables, columns, constraints, indexes, triggers, functions, and migration drift.
- RLS policies for `profiles`, `admins`, `items`, `borrow_history`, `item_sharing`, and Storage buckets.
- Whether invite validation, admin promotion, borrow/return, visibility, deletion, and moderation should move behind RPC functions.
- Edge Function names, secrets, app URL defaults, retry behavior, and Telegram notification throttling.
- Edge Function logs, dashboard Invocations, and Logs Explorer access boundaries without copying personal data.
- Storage limits for image MIME types, file size, animated formats, cleanup, title images, and export/download.

Use the audit checklist to compare local UI behavior, schema, migrations, Storage, and Edge Functions before proposing migrations.

## Live Setup Sequence

Use this sequence for the upstream `app.bringa.io` project after an operator explicitly approves live writes for the project ref.

1. Confirm the target project in Supabase MCP without reading row contents.
2. Save the project ref, public project URL, and publishable key in local operator notes.
3. Run Supabase security and performance advisors before changing anything.
4. For a fresh empty project, apply `supabase/schema.sql` as the reviewed baseline through MCP or the Supabase SQL editor.
5. For an existing project, link the repo-local CLI with `pnpm exec supabase link --project-ref <project-ref>`, preview migrations with `pnpm exec supabase db push --dry-run`, and apply the reviewed incremental migration path.
6. Run `pnpm check:supabase-maintenance-key`; use `SUPABASE_MAINTENANCE_CHECK_AUTH=1` only when the one-row Auth Admin metadata probe is acceptable.
7. Rerun `pnpm check:supabase-contract`.
8. Deploy Edge Functions with Supabase MCP or `pnpm exec supabase functions deploy --project-ref <project-ref>` only after function secrets and URL settings are reviewed.
9. Configure Auth Site URL and redirect URLs for the app domain.
10. Verify Storage bucket limits, MIME allowlists, and policies through Supabase metadata.
11. Rerun security and performance advisors. Resolve anon/PUBLIC `SECURITY DEFINER` execute warnings before calling the backend ready; document signed-in RPC warnings when the functions are intentionally exposed and enforce authorization internally.
12. Update `config/deployments/app.bringa.io.jsonc` with public browser values only after RLS, Storage, and RPC boundaries are confirmed.

## app.bringa.io Live Baseline

As of 2026-05-05, the upstream `app.bringa.io` Supabase project in `eu-central-1` has the repository baseline applied:

- public app tables and the `items` Storage bucket exist with RLS enabled;
- anon/PUBLIC execution grants were removed from SECURITY DEFINER functions;
- RLS policies are scoped to `authenticated` and use statement-stable auth helper calls where appropriate;
- missing foreign-key indexes were added;
- both Telegram Edge Functions are deployed with `verify_jwt=true`;
- `pnpm backup:supabase` and `pnpm verify:backup` completed against the empty live baseline.

Known remaining live setup items are Auth provider configuration, Site URL and redirect URL confirmation, Edge Function secrets, Telegram webhook URL settings, live notification delivery log review, and restore drill evidence. Edge Function logs had no invocations in the last 24-hour windows checked through MCP on 2026-05-05 and 2026-05-06; Auth logs still show the known Supabase-managed GoTrue default/admin group deprecation warnings until provider setup is complete. Supabase Branching is no longer a release blocker for the free-account default path; it remains an optional paid remote-preview follow-up.

## Edge Function Runtime

Supabase Edge Functions run on a Deno-compatible edge runtime. Context7's Supabase documentation review on 2026-05-05 confirmed that Supabase's documented function authoring, local serving, and deployment path is Deno/TypeScript through the Supabase CLI and Edge Runtime.

The Next.js app itself does not require Deno. This repository keeps Deno scoped to `supabase/functions/**` so the notification handlers can be type-checked before deployment:

```bash
pnpm check:edge-functions
```

The current Deno config is function-scoped to avoid a root `deno.lock` or repository-wide Deno project. The alternative is to move notification delivery to another server-side runtime such as a Node service, Cloudflare Worker, or GitHub-hosted job. That would add hosting, secret management, and invocation complexity. Keeping these small notification handlers as Supabase Edge Functions keeps them close to database webhooks and Supabase function secrets while preserving a static GitHub Pages frontend.

Never paste database passwords, Supabase secret keys, service-role keys, OAuth secrets, or provider secrets into chat, docs, commits, screenshots, or issue text.

## Storage Contract

The upstream schema creates a public `items` bucket for item images and mirrors the default media settings from resolved deployment config:

- MIME types: `image/jpeg`, `image/png`, `image/webp`
- File size limit: `10485760` bytes
- Upload permission: validated authenticated users can insert into the `items` bucket

Public buckets provide public download URLs. Upload, list, update, and delete operations still require Storage policies.

Storage object deletion must go through the Storage API, not direct SQL, so that files are removed instead of orphaned.

## Privacy Default

Do not query real user contents unless the user explicitly approves it for the task. Counts, schema, policies, and anonymized examples are preferred.
