---
title: Security Roadmap
---

# Security Roadmap

This roadmap lists important security work for fork operators and maintainers. It focuses on what can go wrong when a fork is hosted in its own environment, how to fix it, and whether the fix is mostly operational or can change app behavior.

## Critical Fork-Hosting Flaws

### Supabase Secret Or Service-Role Key Exposure

Risk: Supabase secret keys, legacy service-role keys, OAuth secrets, Telegram tokens, database passwords, private backups, and `.env.local` values can grant broad backend access.

Fix:

- Keep secrets only in `.env.local`, deployment provider secrets, Supabase function secrets, or an approved secret store.
- Never place secrets in `config/*.jsonc`, generated public config, docs, screenshots, commits, or GitHub issues.
- Run `pnpm check:secrets` before publishing or opening a pull request.
- Rotate any exposed key immediately.

Impact category: operator setup hardening.

### Broken Supabase RLS, Storage, Or RPC Authorization

Risk: the Supabase URL and publishable key are public by design. They are safe only when Row Level Security, Storage policies, and RPC authorization checks are correct.

Fix:

- Apply `supabase/schema.sql` for a fresh project, or apply reviewed migrations for an existing project.
- Confirm RLS is enabled on application tables.
- Keep browser-triggered mutations behind RPCs for invite validation, item create/update/delete, borrow/return, visibility, moderation, deletion, and admin role changes.
- Run `pnpm check:supabase-contract` after schema, policy, Storage, or RPC changes.
- Review Supabase security advisor output before public launch.

Impact category: app contract hardening. Fixing this can block flows that currently work only because policies are too permissive.

### Public Or Anon Execution Of SECURITY DEFINER Functions

Risk: SECURITY DEFINER functions run with elevated database privileges. If exposed to `anon` or `PUBLIC`, they can become privilege-escalation paths.

Fix:

- Treat anon or PUBLIC execution grants on SECURITY DEFINER functions as release blockers.
- Grant callable RPC access only to the minimum intended role.
- For signed-in RPCs, ensure each function checks the authenticated user and authorization internally.
- Re-run Supabase advisor checks after changes.

Impact category: app contract hardening.

### Incorrect Auth Redirect And OAuth Setup

Risk: wrong Supabase Site URL, redirect URLs, or OAuth provider callback URLs can break login, redirect users to the wrong environment, or create unsafe auth behavior across forks.

Fix:

- Set the Supabase Site URL to the fork's real HTTPS app URL.
- Add only intended app redirect URLs.
- Configure Google/GitHub provider callback URLs against the fork's Supabase project, not the upstream project.
- Test login, logout, invite validation, profile completion, and auth persistence in the deployed environment.

Impact category: operator setup hardening.

### Unsafe First-Admin Bootstrap

Risk: promoting the wrong account to admin gives that user access to administrative moderation, user, item, and system surfaces.

Fix:

- Let the intended first admin sign in once before bootstrapping.
- Confirm the Supabase project ref before any admin bootstrap.
- Run the dry run first:

```bash
pnpm bootstrap:first-admin --confirm-project-ref <project-ref>
```

- Execute only after verifying the target user and project:

```bash
pnpm bootstrap:first-admin --confirm-project-ref <project-ref> --execute
```

Impact category: operator setup hardening.

## High-Priority Security Work

### Storage Upload Abuse

Risk: browser-side image validation and compression improve UX but are not security enforcement. Attackers can bypass browser checks and attempt oversized, unsupported, or abusive uploads.

Fix:

- Enforce MIME type and file-size limits in the Supabase Storage bucket.
- Keep Storage bucket settings aligned with deployment config.
- Keep accepted types conservative: JPEG, PNG, and WebP unless the operator explicitly supports more.
- Do not support animated GIF or larger media without a separate abuse and processing review.
- Run `pnpm check:supabase-contract` after Storage policy or media-limit changes.

Impact category: app contract hardening. Users may see stricter upload rejections.

### Incomplete Backup, Restore, Export, Or Deletion Coverage

Risk: Supabase table rows, Auth users, Storage objects, Edge Function secrets, and generated backups are separate surfaces. A fork may believe it can recover or delete data when only part of the system is covered.

Fix:

- Back up Postgres tables and Storage objects before production migrations or destructive work.
- Verify backup manifests and Storage hashes.
- Document what is and is not covered for Auth user metadata.
- Rehearse restore drills before claiming production readiness.
- For account deletion, handle database rows, Auth users, and Storage objects through the documented cleanup workflow.

Impact category: operator setup hardening, with possible app contract changes around deletion and retention behavior.

### Telegram Edge Function Misconfiguration

Risk: notification functions can leak operational data, fail silently, or accept unauthorized webhook calls if secrets and webhook settings are wrong.

Fix:

- Configure Telegram bot tokens and `TELEGRAM_WEBHOOK_SECRET` per deployment.
- Ensure the database webhook and function handler use matching shared-secret settings.
- Run `pnpm check:edge-functions`.
- Review Edge Function logs after first live delivery without copying personal data into public places.
- Keep notification dedupe, mute windows, and retry state enabled.

Impact category: infrastructure or hosting hardening.

### Local Demo Or Local Dev Fixture Exposure

Risk: local demo data and local dev login helpers are meant for development only. If fixtures or dev auth behavior leak into production bundles, public deployments can mislead users or weaken auth expectations.

Fix:

- Keep local demo mode as a development convenience only.
- Do not rely on public config alone as a security boundary.
- Run production bundle checks before publishing:

```bash
pnpm check:production-bundle
```

- Test a production build, not only `pnpm dev`.

Impact category: build and development safety.

### Weak Invite Or Abuse Controls

Risk: public forks can face invite-code guessing, repeated auth attempts, upload abuse, moderation spam, and notification spam.

Fix:

- Use high-entropy invite codes.
- Review Supabase Auth rate limits and CAPTCHA options before public launch.
- Consider per-user or per-item throttling where traffic shows pressure.
- Keep user suggestions, flags, visibility requests, and account deletion requests in moderation queues.
- Do not allow broad direct browser writes that bypass review.

Impact category: app contract hardening and user-facing friction.

## Medium-Priority Security Work

### Static Host Security Header Limits

Risk: GitHub Pages provides HTTPS but does not give this repository a configurable security-header layer for CSP, Referrer-Policy, Permissions-Policy, or custom cache headers.

Fix:

- Use GitHub Pages only with the understanding that Supabase RLS, Storage policies, auth redirects, and secret-free static output are the primary controls.
- If custom headers are required, deploy on Cloudflare Pages, Netlify, or a reverse proxy/Worker that supports them.
- Add a measured Content Security Policy only after confirming required script, style, image, and Supabase connection sources.

Impact category: infrastructure or hosting hardening.

### Missing Branch Protection, Secret Scanning, Or Dependency Automation

Risk: a public fork without repository guardrails can merge unreviewed changes, commit secrets, or miss vulnerable dependency updates.

Fix:

- Enable branch protection for the deployment branch.
- Enable secret scanning and push protection where available.
- Enable Dependabot security updates.
- Keep CI checks required before merge when possible.
- Run the documented checks before release.

Impact category: operator setup hardening.

### Over-Broad Debugging Access To Live User Data

Risk: maintainers or agents may copy real user rows, Auth metadata, Storage objects, logs, screenshots, or exports into public discussions while debugging.

Fix:

- Prefer schema, policies, function definitions, counts, and redacted logs.
- Ask for explicit operator approval before inspecting real user contents.
- Do not paste personal data into GitHub, docs, chat, screenshots, or commits.
- Keep backups and exports outside Git.

Impact category: operator setup hardening.

### Outdated Generated Config Or Fork-Owned Content

Risk: a fork can accidentally publish upstream URLs, placeholder Supabase values, wrong legal text, or stale generated files.

Fix:

- Keep fork identity, repository links, legal text, branding, and public Supabase values in deployment config and deployment content.
- Regenerate config after profile changes:

```bash
BRINGA_DEPLOYMENT=<fork-slug> pnpm generate:config
BRINGA_DEPLOYMENT=<fork-slug> pnpm check:config
```

- Confirm generated public files before deployment.

Impact category: build and development safety.

## Impact Categories

### Operator Setup Hardening

These fixes should not change core app functionality:

- Secret handling and key rotation.
- Correct Supabase Auth redirect and OAuth setup.
- Guarded first-admin bootstrap.
- Branch protection, secret scanning, push protection, and Dependabot security updates.
- Backup, restore, retention, and deletion procedure documentation.
- Redacted advisor and log review.
- Fork-owned deployment config and generated config freshness.

### App Contract Hardening

These fixes can intentionally change behavior where current behavior is too permissive or incomplete:

- Tighten RLS policies.
- Remove anon or PUBLIC SECURITY DEFINER execution.
- Move browser mutations behind authorized RPCs.
- Add internal authorization checks inside signed-in RPCs.
- Enforce Storage MIME type and file-size limits.
- Add invite entropy, failed-attempt throttling, Auth CAPTCHA, or rate limits.
- Keep moderation, visibility, and deletion changes in queues instead of broad direct browser writes.
- Change account deletion behavior to consistently cover database rows, Auth users, Storage objects, and retention rules.

### Build And Development Safety

These fixes should preserve production behavior but may affect local development, tests, or deployment checks:

- Keep local demo mode development-only.
- Keep local dev login helpers out of production bundles.
- Run production bundle checks before publishing.
- Test production builds, not only `pnpm dev`.
- Keep Supabase schema, migrations, generated config, and app code aligned.
- Update tests when RLS, RPC, Storage, auth, or moderation behavior intentionally changes.

### User-Facing Friction Changes

These fixes can add intentional friction for security:

- CAPTCHA during signup, sign-in, or recovery.
- Rate limits on invite attempts, uploads, moderation submissions, or notification-triggering actions.
- Stricter upload rejection messages.
- More explicit admin approval steps for visibility, ownership, image, or content changes.
- More explicit account deletion confirmation and retention messaging.

### Infrastructure Or Hosting Changes

These fixes can require deployment changes without changing core app features:

- Move from GitHub Pages to Cloudflare Pages, Netlify, or a reverse proxy for custom security headers.
- Configure deployment provider secrets.
- Configure Supabase Edge Function secrets per fork.
- Configure Telegram bot and webhook settings per fork.
- Configure backup storage and encryption outside the static app.
- Configure Supabase Auth providers and redirect URLs per fork.
- Configure Supabase project rate limits, CAPTCHA, Storage limits, and advisors per fork.

## Minimum Fork Security Preflight

Run these before public hosting:

```bash
pnpm check:secrets
pnpm check:env-example
pnpm check:config
pnpm check:supabase-contract
pnpm check:edge-functions
pnpm check:production-bundle
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

For production-linked Supabase work, also collect live evidence:

- Supabase security and performance advisor output.
- RLS, RPC, Storage, Edge Function, Auth redirect, and OAuth provider review.
- Backup and restore-drill decision.
- Redacted Edge Function and Auth log review.
- Browser evidence for login, logout, invite flow, admin gates, uploads, settings, responsive layout, and PWA behavior.
