---
name: security-maintenance
description: Use after dependency upgrades, Supabase schema or policy changes, Edge Function changes, auth changes, deployment changes, or before release readiness claims.
---

# Security Maintenance

Treat security maintenance as a repeatable evidence workflow, not a vibe check.

## Read First

- `docs/maintenance.md`
- `docs/security.md`
- `docs/supabase-contract-audit.md`
- `docs/observability.md`
- `docs/restore-drills.md`
- `.agents/skills/supabase-mcp/SKILL.md` when Supabase is involved
- `.agents/workflows/quality-loop.md`

## Baseline Checks

Run the checks that match the touched surface:

```bash
pnpm check:secrets
pnpm check:env-example
pnpm check:config
pnpm check:supabase-contract
pnpm check:supabase-cli
pnpm check:edge-functions
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

For GitHub workflow changes, run:

```bash
pnpm check:github-workflows
pnpm test:github-workflows
```

## Supabase Work

- Confirm the target project or branch before any live operation.
- Run `pnpm check:supabase-cli` when branch setup, Supabase CLI docs, or remote migration workflow changes.
- Prefer schema, policy, function, trigger, Storage bucket settings, advisor output, and anonymized counts.
- Do not inspect real user rows unless the maintainer explicitly approves that access for the current task.
- Run or offer a backup before production-linked database changes when a maintenance key is configured.
- Prefer `SUPABASE_SECRET_KEY` or `SUPABASE_SECRET_KEYS`; treat `SUPABASE_SERVICE_ROLE_KEY` as a legacy fallback.
- Run Supabase security and performance advisors after schema/policy/function changes when MCP or dashboard access is available.
- Treat anon/PUBLIC `SECURITY DEFINER` execution warnings as blockers.
- Document intentional signed-in RPC exposure when the function enforces authorization internally.

## Post-Update Evidence

Before calling an update release-ready, collect:

- secret scan result;
- config and generated-docs freshness result;
- RLS/RPC/Storage contract result;
- repo-local Supabase CLI contract result when branch or CLI workflow changed;
- Edge Function Deno typecheck result;
- lint, TypeScript, and static build result;
- manual GitHub CI result when changes are pushed;
- restore-drill or backup evidence when data safety is part of the claim;
- browser evidence for auth, admin, settings, upload, responsive, and PWA flows when UI behavior changed.

Add uncovered risks and security improvement ideas to `docs/optimization-options.md` instead of burying them in chat.
