---
title: Open Source Release
---

# Open Source Release

This page defines what "ready for open source" means for the generic upstream repository. It is not a claim that a live deployment is production-ready.

## Release Shape

The first public version should be useful in three modes:

- contributor mode: `pnpm dev` opens the full local demo without Supabase or OAuth;
- local backend mode: `pnpm exec supabase start`, `pnpm setup:local-supabase --seed`, and `pnpm doctor:local-supabase` cover schema, RLS, RPC, Auth, Storage, and Edge Function work without consuming hosted Supabase quota;
- fork operator mode: one deployment profile controls branding, public Supabase values, repository links, and operator defaults;
- upstream maintainer mode: generic improvements can be reviewed without fighting fork-owned legal text or brand changes.

## Fork Setup

Fast path: fork it, configure it, use it.

1. Fork the repository.
2. Create a Supabase project.
3. Create a deployment profile instead of copying the upstream profile by hand.
4. Connect Supabase Auth providers and bootstrap the first admin.
5. Deploy through GitHub Pages, wait for the certificate, then enforce HTTPS.

```bash
pnpm setup:operator --dry-run
pnpm setup:operator
```

Then edit:

- `config/deployments/share.example.org.jsonc` for public app identity and Supabase browser values;
- `content/deployments/share.example.org/**` for longer local legal, onboarding, help, and issue text when needed;
- `public/brand/deployments/share.example.org/**` for fork-owned assets when needed.

Generate and check:

```bash
BRINGA_DEPLOYMENT=share.example.org pnpm generate:config
BRINGA_DEPLOYMENT=share.example.org pnpm check:config
```

Use [Fork Launch Runbook](fork-launch-runbook.md) for the complete operator path. It includes DNS, GitHub Pages HTTPS timing, Supabase Auth redirect URLs, Google/GitHub OAuth callback URLs, first-admin bootstrap, and invite-gate verification.
Use [Fork Upgrade Runbook](fork-upgrade-runbook.md) when an existing fork wants a newer upstream version.

Public Supabase URL and publishable key belong in the deployment profile. Secrets belong in ignored env files, GitHub secrets, OAuth provider dashboards, or Supabase function secrets.
For trusted local maintenance such as backups or account cleanup, copy `.env.example` to `.env.local` after confirming the target project, set `SUPABASE_PROJECT_REF` or `SUPABASE_URL`, and set `SUPABASE_SECRET_KEY` or `SUPABASE_SECRET_KEYS` there. Legacy service-role keys remain fallback-only.

For Supabase, start fresh projects from `supabase/schema.sql` and use `supabase/migrations/` for existing deployments that need an incremental upgrade path, then configure Auth redirect URLs for the final app domain. The public project URL and publishable key are safe for the browser when Row Level Security and policies are correct; secret keys and service role keys never belong in Git.

## GitHub Pages

The app is a static Next.js export. GitHub Pages publishing uses the manual Pages workflow and the `out/` artifact.

For the upstream mother repository, deploy `app.bringa.io` from `main`. Use `deploy/<slug>` only for forks or long-lived operator-specific publication branches.

For a custom subdomain:

1. Set `app.canonicalUrl` in the deployment profile.
2. Set the repository Pages source to GitHub Actions.
3. Add the custom domain in the repository Pages settings.
4. Point the subdomain CNAME to `<github-owner>.github.io`.
5. Wait for GitHub to issue the Pages certificate, then enable HTTPS. This often takes a few minutes and GitHub documents that the option can take up to 24 hours to become available.
6. In Supabase Auth settings, set the Site URL and exact production redirect URL for the app domain.
7. Run the manual **Pages** workflow from `main` or `deploy/<slug>` with the deployment slug.

The live upstream setup and OAuth handoff values are tracked in [Public Launch Runbook](public-launch-runbook.md).

Keep production redirect URLs exact. Use localhost or documented wildcard redirects only for local development and preview environments.

The default documented deployment path is GitHub Pages plus hosted Supabase because it keeps first use simple and low-maintenance. The app is still a static Next.js export backed by Supabase, so other hosts such as Cloudflare Pages and self-hosted Supabase are technically possible. They are intentionally mentioned here without detailed runbooks until real operators need them.

GitHub Pages is the simple default, not the strongest possible HTTP-header platform. If a deployment needs custom CSP, Referrer-Policy, Permissions-Policy, or cache headers, choose a capable static host or proxy and follow [Security](security.md). Keep that provider-specific path outside the default quick start until an operator actually needs it.

## Pull Requests From Forks

Keep these concerns separate:

- generic code, tests, docs, schema, and scripts belong in upstream pull requests;
- fork deployment profiles, legal text, brand assets, and operator policies belong in the fork unless the pull request is explicitly about fork tooling or examples;
- Supabase secret keys, service role keys, OAuth secrets, and Telegram tokens never belong in Git.

When syncing from upstream, preserve fork-owned config and content deliberately. Do not hide legal or deployment conflicts with ignored files or merge drivers.

Use short-lived PR branches for generic upstream work. Keep optional long-lived `deploy/<deployment-slug>` branches for fork-owned app publication, not for upstream contribution PRs.

`package.json.version` is the app version. Every repository-changing merge to `main` must increase it, and published upstream versions should be taggable as `vX.Y.Z` so forks have a stable upgrade anchor. The generated app config exposes this version in the user menu for support and upgrade diagnosis.

## Before Public Announcement

- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `LICENSE`, issue templates, and the pull request template are present.
- `docs/readiness-checklist.md` names unresolved external blockers instead of implying they are solved.
- Manual CI and Pages workflows stay secret-free and `workflow_dispatch` only.
- Public repository visibility, forkability, Pages source, custom domain, and latest deployment evidence are verified in [Repository Settings](repository-settings.md).
- Cloudflare DNS, GitHub Pages HTTPS enforcement, Supabase Auth URL configuration, and Google/GitHub OAuth provider setup are complete and browser-tested.
- Browser evidence covers local demo, connected Supabase auth, long-content states, admin routes, mobile, desktop, and PWA install where supported.
- Live Supabase schema, RLS, Storage, Edge Functions, an empty-baseline backup, the no-third-party upstream observability default, and log/screenshot evidence retention defaults have been reviewed; Auth redirects, Edge Function secrets, Telegram webhook settings, live restore drills, project-specific backup retention approval, and live notification delivery evidence remain before any production-readiness claim.
