---
title: Supabase MCP Agent Setup
---

# Supabase MCP Agent Setup

This runbook is for agents and maintainers who need to prepare the live `app.bringa.io` Supabase setup without exposing production data or secrets. It complements [Supabase](supabase.md), [Supabase Branching](supabase-branching.md), [Maintenance](maintenance.md), and the repository-local `.agents/skills/supabase-mcp/SKILL.md`.

## Current Documentation Signals

- 2026-05-05 official Supabase MCP docs say the hosted server URL is `https://mcp.supabase.com/mcp`.
- Dynamic OAuth is the default; personal access tokens are no longer required for normal MCP login.
- Use `project_ref=<project-ref>` once the `app.bringa.io` project ref exists. This scopes the MCP server to one project and disables account management tools.
- Use `read_only=true` for production audits or any project that may contain real user data.
- Supabase recommends development or test projects for MCP work. If the live project must be inspected, combine project scoping, read-only mode, restricted feature groups, and the repository privacy rules below.
- Limit feature groups with `features=database,docs` for ordinary schema/RLS audits; add `development` only when project URLs or publishable keys are needed, `debugging` only when advisors or logs are needed, and `storage` only when bucket metadata or Storage configuration must be reviewed.
- Account management tools such as `list_projects`, `create_project`, `pause_project`, and `restore_project` are disabled in project-scoped mode.
- MCP exposes `get_project_url` and `get_publishable_keys` for public browser config.
- MCP public-key helpers are not a server-side key handoff. Do not use MCP or chat to retrieve, reveal, or transmit secret or service-role keys.
- Storage tools are disabled by default in Supabase MCP, so bucket review requires an explicit `storage` feature group.
- Supabase's current API key docs recommend publishable keys for public browser clients and secret keys over legacy service_role keys where possible.
- Never put `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `sb_secret_` values in docs, commits, browser bundles, screenshots, or chat.
- `pnpm check:secrets` scans committed text for Supabase service-role assignments, `sb_secret_` keys, and legacy service-role JWTs.
- `pnpm check:supabase-maintenance-key` verifies trusted local server-side access without printing key values.

Useful official references:

- [Supabase MCP server](https://supabase.com/docs/guides/getting-started/mcp)
- [Supabase API keys](https://supabase.com/docs/guides/api/api-keys)
- [Supabase Management API](https://supabase.com/docs/reference/api/create-a-project)

## Target Project

- Target project name: `app.bringa.io`.
- Target organization: `bringa-base`.
- Future fork project name: `contekt-bringa-io`.
- Do not delete or pause any contekt project without a separate explicit confirmation in the active session.

If capacity or plan limits block a new project, first report the exact blocker and the available options. Treat deleting a paused `contekt` development project as a destructive action that requires a fresh approval naming the project ref.

## Current Project Discovery

The `app.bringa.io` project exists in `eu-central-1` and was `ACTIVE_HEALTHY` when first discovered through Supabase MCP on 2026-05-05. Keep project refs and public browser values in local operator notes or deployment config after review, rather than hardcoding them into shared fork docs.

Initial safe metadata checks found no applied repository migrations, no deployed Edge Functions, no public app tables, no Storage buckets, no performance advisor lints, and one security advisor warning for public execution of `public.rls_auto_enable()` as a SECURITY DEFINER helper.

As of 2026-05-05, the repository baseline has been applied to the live project, the `items` Storage bucket exists with the expected public image MIME and size policy, both Telegram Edge Functions are deployed with `verify_jwt=true`, and a verified empty baseline backup has been written. The modern `SUPABASE_SECRET_KEY` was enough for Storage Admin and Auth Admin checks; the legacy service-role key remains fallback-only. Security advisors no longer report anon/PUBLIC SECURITY DEFINER execution. Signed-in SECURITY DEFINER warnings remain for intentionally exposed RPCs that enforce authorization internally, and performance advisors currently report only unused indexes on the empty project. Edge Function logs had no invocations in the last 24 hours when checked through MCP; Auth logs had no app auth failures but did show Supabase-managed GoTrue group-name deprecation warnings that should be rechecked after Auth provider setup.

## Agent Workflow

1. Verify that Supabase MCP tools are visible in the current Codex session. If `~/.codex/config.toml` was edited during the session but no Supabase tools are discoverable, start a new Codex session or restart the MCP runtime.
2. Use unscoped MCP only for organization/project discovery and approved project setup. List organizations and projects without reading real row contents.
3. Use the existing `app.bringa.io` project when MCP lists it. If it is missing, create it only after checking project capacity and cost confirmation.
4. After creation, switch to a project-scoped read-only MCP URL for ordinary schema/RLS audits:

   ```text
   https://mcp.supabase.com/mcp?project_ref=<project-ref>&read_only=true&features=database,docs
   ```

5. Add feature groups narrowly for the task: `development` for public browser config, `storage` for bucket metadata, and `debugging` for advisors or logs.
6. Prefer schema, RLS policies, functions, triggers, Storage bucket metadata, advisors, and logs over row contents.
7. Ask before reading real user rows. If copied branch rows exist, treat them as production data.
8. Use a separate non-read-only MCP configuration only for approved setup or migration work.
9. Apply repository schema and migrations through reviewed Supabase CLI or MCP migration steps; keep `supabase/schema.sql` and migrations aligned.
10. Verify Auth redirect URLs, Storage bucket settings, Edge Function secrets, advisors, and logs before calling the live app ready.

## Service Role And Secret Keys

The preferred agent access path is Supabase MCP OAuth. Service-role or secret keys are for trusted server-side maintenance scripts, not general agent browsing.

- Prefer a Supabase secret key for server-side maintenance when supported by the script or tool.
- Existing repository maintenance scripts prefer `SUPABASE_SECRET_KEY` and fall back to the legacy `SUPABASE_SERVICE_ROLE_KEY`.
- Use `pnpm check:supabase-maintenance-key` after `.env.local` or `.env` is configured. Set `SUPABASE_MAINTENANCE_CHECK_AUTH=1` only when a one-row Auth Admin metadata probe is acceptable.
- If the live project uses legacy keys, copy the `service_role` key from Settings > API Keys > Legacy API Keys only as a fallback. New work should prefer `SUPABASE_SECRET_KEY` or `SUPABASE_SECRET_KEYS`.
- If using the Management API, retrieve legacy keys with `GET /v1/projects/{ref}/api-keys` only in a trusted local environment.
- For new secret keys, create them in Settings > API Keys or the Management API and reveal them only once in a trusted local environment.
- Store local maintenance keys only in .env.local or an approved local secret store.
- Do not paste the key back to an agent chat. Once `.env.local` is configured, tell the agent which project ref to verify and which operations are approved.
- Treat MCP `get_project_url` and `get_publishable_keys` as public-browser-config helpers only. They do not replace the trusted local step for `SUPABASE_SECRET_KEY` or legacy `SUPABASE_SERVICE_ROLE_KEY`.

Recommended local `.env.local` shape:

```dotenv
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PROJECT_REF=<project-ref>
SUPABASE_SECRET_KEY=<server-only secret key>
SUPABASE_SECRET_KEYS=<server-only JSON map for Edge Functions, optional>
# Legacy fallback when a secret key is unavailable:
SUPABASE_SERVICE_ROLE_KEY=<server-only legacy service_role key>
```

Use supabase.url and supabase.publishableKey in deployment config for browser-visible values. Those are public by design and can come from MCP `get_project_url` and `get_publishable_keys`.

## Local Handoff

- After `app.bringa.io` exists, record only `SUPABASE_PROJECT_REF` and public browser values in local operator notes.
- Put `supabase.url` and `supabase.publishableKey` in `config/deployments/app.bringa.io.jsonc` after RLS review.
- Run `pnpm backup:supabase` only after `SUPABASE_SECRET_KEY`, `SUPABASE_SECRET_KEYS`, or fallback `SUPABASE_SERVICE_ROLE_KEY` is configured and the target is confirmed. The helper accepts `SUPABASE_URL` or `SUPABASE_PROJECT_REF`.
- Run `pnpm check:supabase-contract` after schema, RLS, Storage, function, or trigger review.
- Keep the `contekt-bringa-io` fork path in mind, but do not mix fork setup into the upstream `app.bringa.io` project.
