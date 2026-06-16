# Roadmap

Bringa is a focused sharing and borrowing app for communities, built to be forked and self-hosted. The first large open-source release is defined by **verified live safety**, not feature count: a fork is ready when its real backend, auth, deletion, recovery, and notification paths have been proven, not when more features exist. Federation and decentralization are a longer direction, addressed only after the single-deployment model is reliably safe (see [Longer Direction](#longer-direction)).

The durable evidence for every gate below lives in [Readiness Checklist](readiness-checklist.md); this file is the priority and sequencing source, and [Optimization Options](optimization-options.md) holds the broader idea register.

## v1 Release-Gating Blockers

Do not tag the first large open-source release until each blocker has dated, redacted evidence in [Readiness Checklist](readiness-checklist.md). These are live-evidence, repository-settings, and a few app-contract tasks; code passing locally is not proof. They are ordered by dependency — earlier blockers unblock later ones.

1. **Repository release guardrails.** Enable branch protection on the deployment branch and require CI checks before merge. Secret scanning, push protection, Dependabot security updates, public visibility, and forkability are already confirmed; branch protection is the one open setting. This protects the release channel before live secrets and evidence start moving.
2. **Live Supabase contract review.** The baseline is applied (RLS on app tables, browser mutations behind RPCs, Storage MIME/size limits, anon/PUBLIC SECURITY DEFINER execution removed). Re-run the Supabase security advisor and confirm no new RLS/RPC/Storage/SECURITY DEFINER findings before launch.
3. **Auth / OAuth redirect verification.** Set the Supabase Site URL and intended redirect URLs, configure Google/GitHub provider callbacks against the fork's own project, and confirm login, logout, invite validation, profile completion, and persistence in the deployed environment. Most later evidence depends on this.
4. **First-admin bootstrap on the live project.** The `pnpm bootstrap:first-admin` helper is dry-run-tested; verify it against the live project ref with the intended admin (dry run, then `--execute`) before relying on admin gates.
5. **Enforce high-entropy invite codes.** Invite codes are admin-set: the admin UI offers a `Math.random` generator (~40 bits, not cryptographically strong) and `set_my_invite_code` also accepts arbitrary free text, so entropy is not enforced. Generate or validate high-entropy codes — and document failed-attempt handling — before exposing invite signup to real users. (Broader throttling is deferred to v1.1.)
6. **Telegram live delivery + webhook secret verification.** Confirm the Edge Function secret presence, the matching database-webhook shared secret, one real delivery, and redacted log review — so notifications neither fail silently nor accept unauthorized calls.
7. **Live restore drill + retention approval.** Restore to a non-production target; verify table counts and Storage object hashes; document Auth-metadata reconciliation limits; delete the drill target afterward; record project-specific encrypted-retention approval. Prove recovery before rehearsing destructive deletion.
8. **Account deletion cleanup rehearsal — DB + Auth + Storage.** The `cleanup-account-deletion` helper already covers database anonymization, Storage object deletion via the Storage API, and `auth.admin.deleteUser`, and is dry-run-tested. The blocker is the **live rehearsal with approved access and evidence**: until the full three-surface path is proven end to end, deletion is not release-complete, and any fork running only the database stage would leave Auth and Storage orphans.
9. **Live browser evidence.** The final acceptance pass, because it depends on auth, invite, upload, admin, deletion, notification, and PWA paths being stable. Time-boxed to one recorded run per flow: auth persistence, logout, invite, admin gates, uploads, account settings/deletion, long content, mobile, desktop, PWA install, slow network. Cover Chromium plus one WebKit and one Firefox pass — not a full matrix.

### Evidence Standard For v1 Gates

Each blocker is closed only with: date, environment URL or project ref, the check command or dashboard source, redacted log or screenshot, the result, and operator approval where the surface requires it. No production-ready claim may rely only on local checks; every external surface must have dated live evidence or be explicitly marked unavailable and not claimed.

### Sequencing Rule

While any release-gating blocker is open, defer new product roadmap work unless it directly closes a blocker. Otherwise the roadmap keeps finding useful work while never proving the release is safe.

### Zero-Ops Operator Criterion

A non-maintainer operator must be able to complete [Fork Launch Runbook](fork-launch-runbook.md) from a clean machine without secrets entering Git or chat. Any dashboard-only step must state exact expected values and the verification output that confirms it.

## Foundation In Place

These keep the upstream forkable and are maintained, not gating:

- Keep `pnpm dev` useful without Supabase or OAuth through local demo mode.
- Keep fork deployment changes isolated in `config/deployments/<slug>.jsonc`, deployment content, and brand assets.
- Keep public Supabase browser values in deployment config and private credentials outside Git.
- Keep CI and Pages workflows secret-free by default and forkable; CI and Pages run on push to `main` plus manual dispatch, while the e2e workflow stays manual-only.
- Publish docs through the app and keep every top-level doc indexed and generated.
- Make contribution, conduct, security, issue, pull request, and release-readiness expectations visible from the repository root.

## Data And Trust

Ongoing principles (live review before any production-readiness claim is gated in blocker 2 above):

- Keep sensitive Supabase mutations behind RPCs and enforce RLS as the primary data boundary.
- Keep contribution terms deployment-specific, with public-domain intent where possible and a reviewed fallback operator license where required.

## Security

[Security Roadmap](security-roadmap.md) is the source for fork-hosting flaws and remediation; the v1 blockers above gate the critical ones. Two standing principles that are not duplicated there:

- Separate low-risk operator setup hardening from app contract hardening before implementation, to avoid accidental product behavior changes.
- Keep the security advisor, redacted logs, and browser evidence as the verification trail, never local checks alone.

## Deferred To v1.1 — Product Work

Valuable, but not gating. Pull forward only when it closes a release blocker.

- Add multi-image item handling with previews, cover image selection, newest-first ordering, moderation, and export/download policy.
- Wire the prepared ownership model through UI and RPCs for operator-owned, profile-owned, and free-text owner cases.
- Continue moderation follow-through for suggestions, flags, visibility requests, image metadata, and user-facing notification history.
- Improve search actions, breadcrumbs, responsive polish, empty states, and keyboard flow after browser evidence points to concrete issues.
- Multilingual UI: centralize user-facing copy, use `app.defaultLocale` and `app.locales` as config inputs, keep English primary while adding German, and allow fork/operator terminology overrides before considering a larger i18n framework.

## Deferred To v1.1 — Abuse And Hardening

These matter at scale, not at a trusted-community launch (enforcing high-entropy invite codes is pulled forward into the v1 gate above).

- Auth CAPTCHA and rate limits on invite attempts, uploads, moderation submissions, and notification-triggering actions, added where live traffic shows pressure.
- Failed-attempt throttling and per-user or per-item limits.
- Static-host security headers (CSP, Referrer-Policy, Permissions-Policy) via Cloudflare Pages, Netlify, or a proxy when an operator needs them.

## Longer Direction

- Explore federation, decentralized sharing, and cross-community discovery only after the single-deployment model is reliable.
- Grow agent workflows around repeatable maintenance, fork sync, schema review, browser evidence, and release checks.
