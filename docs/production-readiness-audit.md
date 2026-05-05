---
title: Production Readiness Audit
---

# Production Readiness Audit

This audit maps the active goal prompt to durable repository artifacts. It is not a release announcement and does not replace the operational checks in [First Big Version Readiness Checklist](readiness-checklist.md).

## Objective And Scope

- Generic upstream `app.bringa.io`, not a deployment fork.
- Bring the repository toward a first large production-ready open-source foundation.
- No real Supabase row contents or real user data may be inspected without explicit approval.
- Hyperoptimum covers maintainability, scalability, extensibility, testability, consistency, reusability, accessibility, performance, reliability, security, observability, and developer experience.
- Local work can make the repo app-, docs-, contract-, and operations-ready, but it cannot prove live backend, browser, repository-settings, or retention readiness without approved access and evidence.

## Prompt-To-Artifact Checklist

| Prompt requirement | Evidence | Status |
| --- | --- | --- |
| Read `temp/20260504-prompt.md` and `temp/goal-mode-hyperoptimum-production-readiness-plan.md` | This audit maps those temp prompts to durable docs, code, scripts, and blockers. | Covered |
| Source of truth and hyperoptimum | `docs/hyperoptimum.md`, `docs/optimization-options.md`, `.agents/rules/source-of-truth.md` | Covered |
| Naming conventions and developer experience | `docs/conventions.md`, `pnpm test:naming-conventions`, `pnpm check:naming-conventions` | Covered |
| Agent rules, skills, and workflows | `AGENTS.md`, `.agents/workflows/session-start.md`, `.agents/workflows/goal-mode-preflight.md`, `.agents/workflows/quality-loop.md`, `.agents/skills/*/SKILL.md`, `pnpm check:agents` | Covered |
| Forkability and configuration | `config/base.config.jsonc`, `config/deployments/app.bringa.io.jsonc`, `config/bringa.config.schema.json`, `scripts/create-deployment-profile.mjs`, `scripts/setup-operator.mjs`, `docs/configuration.md`, `docs/forking.md`, `docs/fork-content-strategy.md`, `pnpm test:create-deployment`, `pnpm test:operator-setup`, `pnpm check:config` | Covered |
| Open-source contribution surface | `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, issue templates, pull request template, `docs/open-source-release.md` | Covered locally |
| Secret-free manual CI/CD | `.github/workflows/ci.yml`, `.github/workflows/pages.yml`, `docs/conventions.md`, `docs/repository-settings.md`, `pnpm check:github-workflows` | Covered |
| In-app docs | `docs/index.md`, `public/content/generated/docs/index.json`, `/docs`, `pnpm check:docs-index` | Covered locally |
| Supabase contract and privacy | `supabase/schema.sql`, `supabase/migrations/`, `supabase/README.md`, `docs/supabase.md`, `docs/supabase-mcp.md`, `docs/supabase-contract-audit.md`, `pnpm test:supabase-contract`, `pnpm check:supabase-contract`, `pnpm check:supabase-mcp` | Partial until live review |
| Supabase development branch setup | `docs/supabase-branching.md`, `pnpm check:supabase-branching` | Blocked until approved project refs and access |
| Product model and admin operations | `docs/admin-operations.md`, `docs/readiness-checklist.md`, `pnpm test:admin-route-gate`, `scripts/admin-system-health.test.mjs`, admin route tests in `scripts/admin-*.test.mjs` | Partial until browser and live backend evidence |
| Auth and onboarding decision boundaries | `pnpm test:auth-redirect`, `pnpm test:protected-route`, `docs/supabase-branching.md` Auth redirect URL tasks | Partial until live Auth provider and browser persistence review |
| Media upload and Storage contract | `src/lib/media.ts`, create/edit item routes, `supabase/schema.sql`, `pnpm check:supabase-contract` | Partial until live Storage bucket review |
| Browser, accessibility, and PWA QA | `docs/browser-testing.md`, `.agents/skills/agentic-browser-testing/SKILL.md`, local in-app browser pass, `pnpm test:pwa-manifest` | Partial until connected auth, PWA, slow-network, and target-browser evidence |
| Backups, restore, and deletion cleanup | `scripts/backup-supabase.mjs`, `scripts/verify-supabase-backup.mjs`, `scripts/cleanup-account-deletion.mjs`, `docs/maintenance.md`, `docs/restore-drills.md`, `pnpm test:account-deletion-cleanup`, `pnpm check:restore-drills` | Partial until live rehearsal and retention policy |
| Privacy-preserving observability | `docs/observability.md`, `pnpm test:observability`, `pnpm check:observability` | Partial until live log review and external error-reporting decision |
| Dependency and tooling currency | `package.json`, `pnpm-lock.yaml`, `docs/dependency-audit.md`, `pnpm outdated` | Partial; major upgrades intentionally deferred |
| German organization wording removed from English docs | `pnpm check:copy` and direct `rg` check | Covered |

## Evidence Sources

- `docs/readiness-checklist.md`
- `docs/open-source-release.md`
- `docs/definition-of-done.md`
- `docs/optimization-options.md`
- `docs/conventions.md`
- `docs/browser-testing.md`
- `docs/supabase-branching.md`
- `docs/restore-drills.md`
- `docs/observability.md`
- `supabase/README.md`
- `.agents/`
- `.github/workflows/`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `package.json`
- `scripts/`

## Remaining Blockers

- GitHub branch protection and manual Pages deployment settings require repository UI or plan access. Merge method and branch cleanup settings are confirmed through the GitHub API, while GitHub Pages site creation currently returns a plan limitation for this private repository.
- Live Supabase schema, RLS, functions, triggers, Storage, and Edge Functions review requires approved access.
- Live Supabase health checks, Edge Function log review, and any external error-reporting decision require approved access and policy.
- Local app development cannot be linked to a Supabase development branch without approved project refs and branch access.
- Auth persistence, logout, PWA install, slow network, and long-content states still need browser evidence. Connected auth and target-browser coverage remain open.
- Trusted account deletion cleanup still needs approved rehearsal or production run with backup/export evidence and operator retention policy.
- Live restore drills and encrypted backup handling still need approved access and policy.

## Completion Rule

Do not mark the active goal complete until every blocker is either resolved with evidence or explicitly descoped by the user.

Before completion, rerun the release verification list in [First Big Version Readiness Checklist](readiness-checklist.md), inspect the relevant artifacts named above, and verify that no proxy signal is being treated as proof for a requirement it does not cover.
