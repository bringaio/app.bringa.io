---
title: Supabase MCP Agent Setup
---

# Supabase MCP Agent Setup

This runbook is for agents and maintainers who need to prepare the live `app.bringa.io` Supabase setup without exposing production data or secrets. It complements [Supabase](supabase.md), [Supabase Branching](supabase-branching.md), [Maintenance](maintenance.md), and the repository-local `.agents/skills/supabase-mcp/SKILL.md`.

## Current Documentation Signals

- 2026-05-05 official Supabase MCP docs say the hosted server URL is `https://mcp.supabase.com/mcp`.
- Dynamic OAuth is the default; personal access tokens are no longer required for normal MCP login.
- Use `project_ref=<project-ref>` once the `app-bringa-io` project ref exists. This scopes the MCP server to one project and disables account management tools.
- Use `read_only=true` for production audits or any project that may contain real user data.
- Limit feature groups with `features=database,docs` for ordinary audits; add `debugging,development` only when logs, project URLs, or publishable keys are needed.
- Account management tools such as `list_projects`, `create_project`, `pause_project`, and `restore_project` are disabled in project-scoped mode.
- MCP exposes `get_project_url` and `get_publishable_keys` for public browser config.
- Supabase's current API key docs recommend publishable keys for public browser clients and secret keys over legacy service_role keys where possible.
- Never put `SUPABASE_SERVICE_ROLE_KEY` or `sb_secret_` values in docs, commits, browser bundles, screenshots, or chat.
- `pnpm check:secrets` scans committed text for Supabase service-role assignments, `sb_secret_` keys, and legacy service-role JWTs.

Useful official references:

- [Supabase MCP server](https://supabase.com/docs/guides/getting-started/mcp)
- [Supabase API keys](https://supabase.com/docs/guides/api/api-keys)
- [Supabase Management API](https://supabase.com/docs/reference/api/create-a-project)

## Target Project

- Target project name: `app-bringa-io`.
- Target organization: `bringa`.
- Future fork project name: `contekt-bringa-io`.
- Do not delete or pause any contekt project without a separate explicit confirmation in the active session.

If capacity or plan limits block a new project, first report the exact blocker and the available options. Treat deleting a paused `contekt` development project as a destructive action that requires a fresh approval naming the project ref.

## Agent Workflow

1. Verify that Supabase MCP tools are visible in the current Codex session. If `~/.codex/config.toml` was edited during the session but no Supabase tools are discoverable, start a new Codex session or restart the MCP runtime.
2. Use unscoped MCP only for organization/project discovery and approved project setup. List organizations and projects without reading real row contents.
3. Create app-bringa-io only after checking project capacity and cost confirmation.
4. After creation, switch to a project-scoped read-only MCP URL for audits:

   ```text
   https://mcp.supabase.com/mcp?project_ref=<project-ref>&read_only=true&features=database,docs,debugging,development
   ```

5. Prefer schema, RLS policies, functions, triggers, Storage buckets, advisors, and logs over row contents.
6. Ask before reading real user rows. If copied branch rows exist, treat them as production data.
7. Use a separate non-read-only MCP configuration only for approved setup or migration work.
8. Apply repository schema and migrations through reviewed Supabase CLI or MCP migration steps; keep `supabase/schema.sql` and migrations aligned.
9. Verify Auth redirect URLs, Storage bucket settings, Edge Function secrets, advisors, and logs before calling the live app ready.

## Service Role And Secret Keys

The preferred agent access path is Supabase MCP OAuth. Service-role or secret keys are for trusted server-side maintenance scripts, not general agent browsing.

- Prefer a Supabase secret key for server-side maintenance when supported by the script or tool.
- Existing repository scripts currently expect `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
- If the live project uses legacy keys, copy the `service_role` key from Settings > API Keys > Legacy API Keys.
- If using the Management API, retrieve legacy keys with `GET /v1/projects/{ref}/api-keys` only in a trusted local environment.
- For new secret keys, create them in Settings > API Keys or the Management API and reveal them only once in a trusted local environment.
- Store local maintenance keys only in .env.local or an approved local secret store.
- Do not paste the key back to an agent chat. Once `.env.local` is configured, tell the agent which project ref to verify and which operations are approved.

Recommended local `.env.local` shape:

```dotenv
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PROJECT_REF=<project-ref>
SUPABASE_SERVICE_ROLE_KEY=<server-only legacy service_role key>
```

Use supabase.url and supabase.publishableKey in deployment config for browser-visible values. Those are public by design and can come from MCP `get_project_url` and `get_publishable_keys`.

## Local Handoff

- After `app-bringa-io` exists, record only `SUPABASE_PROJECT_REF` and public browser values in local operator notes.
- Put `supabase.url` and `supabase.publishableKey` in `config/deployments/app.bringa.io.jsonc` after RLS review.
- Run `pnpm backup:supabase` only after `SUPABASE_SERVICE_ROLE_KEY` is configured and the target is confirmed.
- Run `pnpm check:supabase-contract` after schema, RLS, Storage, function, or trigger review.
- Keep the `contekt-bringa-io` fork path in mind, but do not mix fork setup into the upstream `app-bringa-io` project.
