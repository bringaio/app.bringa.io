import assert from "node:assert/strict";
import test from "node:test";

import {
  checkSupabaseMcpContent,
  checkSupabaseMcpSkillContent,
} from "./check-supabase-mcp.mjs";

const validRunbook = `---
title: Supabase MCP Agent Setup
---

# Supabase MCP Agent Setup

## Current Documentation Signals

- 2026-05-05 official Supabase MCP docs say the hosted server URL is https://mcp.supabase.com/mcp.
- Dynamic OAuth is the default; personal access tokens are no longer required for normal MCP login.
- Use project-scoped mode with project_ref=<project-ref> once the app.bringa.io project ref exists.
- Use read_only=true for production or any project that may contain real user data.
- Supabase recommends development or test projects for MCP work.
- Limit feature groups with features=database,docs for ordinary schema/RLS audits; add development, debugging, or storage only when needed.
- Account management tools such as list_projects, create_project, pause_project, and restore_project are disabled in project-scoped mode.
- MCP exposes get_project_url and get_publishable_keys for public browser config.
- MCP public-key helpers are not a server-side key handoff. Do not use MCP or chat to retrieve, reveal, or transmit secret or service-role keys.
- Storage tools are disabled by default in Supabase MCP, so bucket review requires an explicit storage feature group.
- Supabase's current API key docs recommend publishable keys for public browser clients and secret keys over legacy service_role keys where possible.
- Never put SUPABASE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, or sb_secret_ values in docs, commits, browser bundles, screenshots, or chat.

## Target Project

- Target project name: app.bringa.io.
- Target organization: bringa-base.
- Future fork project name: contekt-bringa-io.
- Do not delete or pause any contekt project without a separate explicit confirmation in the active session.

## Agent Workflow

1. Verify that Supabase MCP tools are visible in the current Codex session.
2. List organizations and projects without reading real row contents.
3. Use the existing \`app.bringa.io\` project when MCP lists it. If it is missing, create it only after checking project capacity and cost confirmation.
4. Add feature groups narrowly for the task.
5. Prefer schema, RLS policies, functions, triggers, Storage buckets, advisors, and logs over row contents.
6. Ask before reading real user rows.
7. Configure Codex for the app project with project_ref=<project-ref>&read_only=true for audits.
8. Use a separate non-read-only MCP configuration only for approved setup or migration work.

## CLI Fallback

- When MCP branch tooling fails, use the repo-local CLI after pnpm install.
- Run pnpm exec supabase branches list --project-ref <production-ref>.
- This requires supabase login or SUPABASE_ACCESS_TOKEN.
- Keep access tokens outside Git, generated docs, screenshots, and chat.

## Service Role And Secret Keys

- Prefer a Supabase secret key for server-side maintenance when supported by the script or tool.
- Existing repository maintenance scripts prefer SUPABASE_SECRET_KEY and fall back to the legacy SUPABASE_SERVICE_ROLE_KEY.
- If the live project uses legacy keys, copy the service_role key from Settings > API Keys > Legacy API Keys.
- If using the Management API, retrieve legacy keys with GET /v1/projects/{ref}/api-keys only in a trusted local environment.
- For new secret keys, create them in Settings > API Keys or the Management API and reveal them only once in a trusted local environment.
- Store local maintenance keys only in .env.local or an approved local secret store.
- Treat MCP get_project_url and get_publishable_keys as public-browser-config helpers only.
- Run pnpm check:supabase-maintenance-key after configuring local maintenance keys.

## Local Handoff

- After app.bringa.io exists, record only SUPABASE_PROJECT_REF and public browser values in local operator notes.
- Put supabase.url and supabase.publishableKey in config/deployments/app.bringa.io.jsonc after RLS review.
- Run pnpm backup:supabase only after SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is configured and the target is confirmed.
`;

test("accepts a complete Supabase MCP setup runbook", () => {
  assert.doesNotThrow(() => checkSupabaseMcpContent(validRunbook));
});

test("requires project scoping, read-only defaults, key handling, and non-destructive project policy", () => {
  const incomplete = validRunbook
    .replace("project_ref=<project-ref>", "project ref")
    .replace("read_only=true", "read only")
    .replace("app.bringa.io", "app")
    .replace("Do not delete or pause any contekt project without a separate explicit confirmation in the active session.", "")
    .replace("SUPABASE_SECRET_KEY", "SECRET_KEY")
    .replace("SUPABASE_SERVICE_ROLE_KEY", "SERVICE_KEY");

  assert.throws(
    () => checkSupabaseMcpContent(incomplete),
    /missing required/i,
  );
});

test("requires the MCP runbook to document the repo-local CLI fallback", () => {
  assert.throws(
    () => checkSupabaseMcpContent(validRunbook.replace(/## CLI Fallback[\s\S]*?(?=## Service Role And Secret Keys)/, "")),
    /CLI Fallback/,
  );
});

test("requires the agent skill to point at the durable MCP runbook and privacy gates", () => {
  assert.doesNotThrow(() => checkSupabaseMcpSkillContent(`---
name: supabase-mcp
description: Use when connecting this repository to Supabase MCP, reviewing Supabase schema or policies, preparing backups, or planning database/auth/storage changes.
---

# Supabase MCP

Read docs/supabase-mcp.md before project setup or live review.
Prefer project-scoped mode with project_ref=<project-ref> and read_only=true for audits.
Use app.bringa.io as the target project name until the user changes it.
Never read real user rows without explicit approval.
Never reveal, paste, or commit SUPABASE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, or sb_secret_ values.
Do not delete or pause contekt projects without separate explicit confirmation.
`));
});
