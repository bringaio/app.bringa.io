---
title: Security
---

# Security

Security work in this repository should be evidence-driven and privacy-preserving. Prefer repeatable checks, documented live observations, and narrow Supabase access over broad manual inspection.

For vulnerability reporting, use the root `SECURITY.md`. For operational security tasks, use [Maintenance](maintenance.md), [Supabase](supabase.md), [Supabase MCP Agent Setup](supabase-mcp.md), [Restore Drills](restore-drills.md), and [Observability](observability.md).

## Core Rules

- Never commit `.env`, `.env.local`, Supabase secret keys, legacy service-role keys, OAuth secrets, Telegram tokens, database passwords, real user exports, or private backup files.
- Keep public browser values in deployment config: Supabase URL and publishable key are public by design, but only safe when RLS, Storage policies, and RPC boundaries are correct.
- Prefer `SUPABASE_SECRET_KEY` or `SUPABASE_SECRET_KEYS` for trusted local maintenance. Use legacy `SUPABASE_SERVICE_ROLE_KEY` only as fallback.
- Do not inspect real user rows, Auth metadata, Storage objects, logs, screenshots, or exports unless the operator explicitly approves that inspection for the current task.
- Treat Supabase Auth users, Postgres rows, Storage objects, Edge Function secrets, and Telegram delivery settings as separate security surfaces.
- Treat anon or PUBLIC execution of SECURITY DEFINER functions as a blocker. Signed-in RPC exposure must be documented when the function enforces authorization internally.

## Main Surfaces

- Static Next.js frontend hosted through GitHub Pages or a compatible static host.
- Supabase Auth providers, Site URL, and redirect URLs.
- Postgres tables, RLS policies, RPC functions, triggers, indexes, and migrations.
- Supabase Storage bucket policy for item images.
- Supabase Edge Functions for Telegram notifications.
- Local demo mode, invite flow, protected routes, admin routes, profile completion, account export, and account deletion cleanup.
- GitHub Actions workflows, repository settings, branch protection, and release process.

## Static Hosting Headers

2026-05-06 documentation review: GitHub Pages is the default deployment path and provides HTTPS enforcement, but do not treat it as a configurable security-header layer. Do not promise repository-managed CSP, Referrer-Policy, Permissions-Policy, or Cache-Control headers on GitHub Pages.

For the GitHub Pages default, keep the static export small, secret-free, HTTPS-only, and protected by Supabase RLS, Storage policies, exact Auth redirect URLs, local-demo production guards, and production bundle checks. If an operator requires custom HTTP security headers, use a host that supports them, such as Cloudflare Pages with a `_headers` file, Netlify headers, or a reverse proxy or Worker. Document that as a deployment-provider adapter, not as a GitHub Pages feature.

Potential stronger header policy for capable hosts:

- `Content-Security-Policy` after measuring the app's current script, style, image, and Supabase connection needs;
- `Referrer-Policy`, usually `strict-origin-when-cross-origin` or stricter after OAuth/provider checks;
- `Permissions-Policy` with unused browser features disabled;
- `X-Content-Type-Options: nosniff`;
- cache headers that preserve static asset performance without making generated config or HTML stale.

## Security Maintenance Workflow

Use `.agents/skills/security-maintenance/` after dependency upgrades, Supabase schema or policy changes, Edge Function changes, Auth changes, deployment workflow changes, or before release-readiness claims.

Run the checks that match the touched surface:

```bash
pnpm check:secrets
pnpm check:env-example
pnpm check:config
pnpm check:supabase-contract
pnpm check:supabase-cli
pnpm check:edge-functions
pnpm check:security-maintenance
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm check:production-bundle
```

Add focused tests when behavior changes. Current high-value areas include auth redirects, protected route decisions, local demo mode, production bundle fixture isolation, invite flow, profile completion, admin gates, media policy, Supabase contract checks, backup verification, account deletion cleanup, PWA manifest output, static export boundaries, and GitHub workflow triggers.

For GitHub workflow changes, also run:

```bash
pnpm test:github-workflows
pnpm check:github-workflows
```

For production-linked Supabase work, add live evidence when access is available:

- backup or restore-drill decision before destructive or migration work;
- Supabase security and performance advisor output;
- schema, RLS, RPC, trigger, Storage bucket, and Edge Function metadata review;
- repo-local Supabase CLI contract evidence when branch setup or remote migration workflow changes;
- Edge Function log review without copying personal data;
- Auth log review after provider and redirect configuration;
- `pnpm check:supabase-maintenance-key` without printing key values;
- browser evidence for auth, admin, upload, settings, responsive, and PWA flows when UI behavior changed.

Passing local checks is not enough for a production-readiness claim unless those checks cover the changed security surface. Record uncovered gaps in [Optimization Options](optimization-options.md).

## Forks

Fork operators should keep secrets in local environment files, deployment provider secrets, Supabase function secrets, or an approved secret store. Fork-owned app identity, legal text, repository links, and public Supabase values belong in deployment config and deployment content.

Agents setting up a fork should use `.agents/skills/fork-operator-onboarding/`, keep local demo mode available until the fork's Supabase project is verified, and leave a short list of remaining Auth, Storage, Edge Function, backup, GitHub Pages, and branch-protection tasks.

## Security Optimization Backlog

Important security ideas that are not ready to implement yet belong in [Optimization Options](optimization-options.md), especially:

- Storage upload hardening and cleanup semantics;
- optional Supabase development branch Storage/Auth/secret isolation proof before any paid branch workflow is used;
- restore drill and encrypted retention policy evidence;
- Auth diagnostics follow-up after provider setup;
- browser evidence for auth, admin, settings, upload, responsive, and PWA flows;
- future CSP/security-header strategy for GitHub Pages and alternative static hosts;
- rate-limit and abuse-control strategy for uploads, moderation, RPCs, and notification functions.
