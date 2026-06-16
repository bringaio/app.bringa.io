# Roadmap

Bringa starts as a focused sharing and borrowing app for communities. The long-term direction is a federated, decentralized, agent-friendly system for sharing and borrowing anything communities can responsibly manage.

## First Open-Source Version

- Keep `pnpm dev` useful without Supabase or OAuth through local demo mode.
- Keep fork deployment changes isolated in `config/deployments/<slug>.jsonc`, deployment content, and brand assets.
- Keep public Supabase browser values in deployment config and private credentials outside Git.
- Keep CI and Pages workflows manual-only, secret-free by default, and forkable.
- Publish docs through the app and keep every top-level doc indexed and generated.
- Make contribution, conduct, security, issue, pull request, and release-readiness expectations visible from the repository root.

## Next Product Work

- Finish browser evidence for auth persistence, logout, PWA install, slow network, long content, mobile, desktop, and admin flows.
- Add multi-image item handling with previews, cover image selection, newest-first ordering, moderation, and export/download policy.
- Wire the prepared ownership model through UI and RPCs for operator-owned, profile-owned, and free-text owner cases.
- Continue moderation follow-through for suggestions, flags, visibility requests, image metadata, and user-facing notification history.
- Improve search actions, breadcrumbs, responsive polish, empty states, and keyboard flow after browser evidence points to concrete issues.
- Multilingual UI: centralize user-facing copy, use `app.defaultLocale` and `app.locales` as config inputs, keep English primary while adding German, and allow fork/operator terminology overrides before considering a larger i18n framework.

## Data And Trust

- Keep sensitive Supabase mutations behind RPCs and enforce RLS as the primary data boundary.
- Review live schema, RLS, functions, triggers, Storage, and Edge Functions with approved access before production-readiness claims.
- Complete live backup restore drills, project-specific encrypted retention approval, account deletion cleanup rehearsal, live notification delivery evidence, and any deployment-specific observability setup.
- Keep contribution terms deployment-specific, with public-domain intent where possible and a reviewed fallback operator license where required.

## Security

- Keep [Security Roadmap](security-roadmap.md) visible as the fork-hosting flaw and remediation source for operators, maintainers, and agents.
- Separate low-risk operator setup hardening from app contract hardening before implementation to avoid accidental product behavior changes.
- Prioritize critical fork-hosting blockers: secret leakage, broken RLS/RPC/Storage boundaries, anon or PUBLIC SECURITY DEFINER execution, unsafe Auth redirect setup, and unsafe first-admin bootstrap.
- Prioritize high-impact operational hardening: server-enforced upload limits, backup and restore proof, account deletion coverage across database/Auth/Storage, Telegram Edge Function secrets, production bundle fixture isolation, and invite or abuse controls.
- Treat static-host security headers, branch protection, secret scanning, dependency automation, redacted live debugging, and generated config freshness as required fork readiness checks.
- Verify security fixes with the relevant local checks, Supabase advisor evidence, redacted logs, and browser evidence before calling any fork production-ready.

## Longer Direction

- Explore federation, decentralized sharing, and cross-community discovery only after the single-deployment model is reliable.
- Grow agent workflows around repeatable maintenance, fork sync, schema review, browser evidence, and release checks.
