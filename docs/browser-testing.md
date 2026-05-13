---
title: Browser Testing
---

# Browser Testing

Use this runbook for manual or agentic browser checks before release work, large UI changes, PWA changes, local Supabase backend testing, or optional Supabase branch testing. The detailed agent scenario source is `.agents/skills/agentic-browser-testing/SKILL.md`; this page is the maintainer-facing checklist and evidence format.

## Scope

Test against local, mock, staging, or explicitly approved development data. Do not use production user data unless the exact scenario and data category have been approved.

Record:

- date, commit, deployment target, and browser;
- viewport and input mode;
- role: anonymous, uninvited authenticated user, validated user, item creator, or admin;
- route, action, expected result, actual result, and evidence;
- whether data was mock, local development, staging, or production metadata.

## Dev Server Startup

Before starting `pnpm dev`, `pnpm dev:docker`, `pnpm exec next dev`, or a static preview server, check whether a suitable server is already listening. Check the intended port first, for example:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

If the app is already running, reuse it and verify the URL before testing. If the port is occupied by another process, choose a different port and record the actual URL in the evidence. Stop only the server process started for the current task; leave user-owned or pre-existing servers running.

## Baseline Routes

- `/login`: terms checkbox gates sign-in actions, setup-required view appears for unfinished public fork config, terms link works, logout returns to logged-out state.
- `/invite`: invalid invite errors are visible and accessible; valid or approved users reach the dashboard.
- `/dashboard`: borrowed-first behavior, search, filters, empty states, long names, fixed bottom actions, and mobile layout.
- `/items/create` and `/items/edit`: image MIME/size errors, immediate preview, replacement behavior, no-image behavior, and form error states.
- `/items/details`: status, owner, visibility actions, borrow/return, moderation links, and reload behavior.
- `/settings`: issue prompt, JSON export, deletion request, repository links, and logout.
- `/admin/dashboard`, `/admin/users`, `/admin/user-items`, `/admin/moderation`, `/admin/item-versions`, `/admin/deletion-requests`, and `/admin/notifications`: dense scanning, keyboard flow, reason fields, self-protection, and privacy-preserving summaries.

## Responsive And Accessibility Pass

Use at least:

- mobile narrow: `375x812`;
- tablet: `768x1024`;
- desktop: `1440x900`;
- keyboard-only navigation;
- light and dark themes;
- long item names, long owner labels, long unbroken words, missing images, and image-heavy lists.

Check that text wraps or truncates intentionally, touch targets remain usable, focus is visible, controls do not overlap content, and empty/error/loading states keep the next action clear.

## PWA Pass

Verify `/manifest.webmanifest` contains configured app name, short name, colors, start URL, SVG icon, `192x192` PNG icon, `512x512` PNG icon, and `512x512` maskable PNG icon. Installability also depends on browser support and a secure context; do not claim offline support unless a service worker or equivalent offline strategy exists and has been tested.

When the browser supports installation, install or simulate installed mode and test:

- app launches at the configured start URL;
- Supabase session persistence after relaunch;
- logout clears the expected local session state;
- app icon and theme colors look correct on the target platform;
- slow-network behavior is understandable.

## Latest Local Evidence

2026-05-05 local in-app browser pass against `pnpm dev` and local demo mode:

- `/login`: terms gate, disabled OAuth buttons, local demo entry, and Docs link rendered.
- `/dashboard`: borrowed-first default rendered, Available view showed long item cards without overlap, and bottom controls stayed usable.
- `/items/details?id=demo-long-label`: long title wrapped, no-image state had stable aspect ratio, and user/admin actions remained visible.
- `/docs`: generated docs loaded, Open Source Release appeared in the manifest, and mobile navigation was constrained so article content reached the first viewport.
- `/admin/dashboard`: local demo admin route rendered counts, source-of-truth links, recent activity, and item list.
- `/items/create`: form labels, image drop zone, and primary action rendered in local demo mode.

2026-05-05 static export preview after `pnpm build` with `out/` served locally:

- `/login`: anonymous production login rendered without a live Supabase server; OAuth buttons stayed gated until terms acceptance.
- `/docs` and `/docs?doc=configuration`: generated in-app docs rendered from the static export, including the operator setup and public Supabase config guidance.
- `/manifest.webmanifest`: generated app name, icons, colors, and start URL were readable from the static export.
- `/dashboard`: direct anonymous access redirected back to `/login`; local demo data intentionally stayed unavailable in the production export.

2026-05-06 local quick-start contract check against `pnpm dev --hostname 127.0.0.1 --port 4324`:

- `pnpm dev` regenerated the default `app.bringa.io` public config with `development.localDemoMode=true`.
- `http://127.0.0.1:4324/bringa.config.json` returned the public config with `localDemoMode=true`.
- `http://127.0.0.1:4324/login` returned a successful response containing the **Open local demo** entry without a running local Supabase server.
- `/manifest.webmanifest` returned the configured app name, start URL, and install icons.
- `pnpm test:local-demo-mode` now checks that the committed generated config enables local demo mode in development and remains disabled in production through the `NODE_ENV` guard.
- Browser Use could not attach to a Codex in-app browser in this session because no `iab` backend was discoverable, so this is not a replacement for visual browser evidence.

2026-05-06 Next 16 local dev-server regression check:

- `pnpm dev --hostname 127.0.0.1 --port 4324` initially failed because Next 16 starts with Turbopack by default and the custom `webpack` config had no explicit development `turbopack` config.
- `next.config.ts` now keeps Turbopack explicit in development and applies the local-demo production alias only for production builds.
- `pnpm dev --hostname 127.0.0.1 --port 4324` started successfully with Turbopack after the fix.
- `http://127.0.0.1:4324/bringa.config.json` returned `localDemoMode=true`, `http://127.0.0.1:4324/login` contained **Open local demo**, and `/manifest.webmanifest` returned the configured `bringa.io` PWA name, start URL, and icon set.

2026-05-12 Browser Use static export setup-readiness check against `out/` served on `127.0.0.1:4328`:

- `http://127.0.0.1:4328/login` stayed in normal static-preview login mode, confirming local origins are not blocked by the public-fork setup guard.
- `http://fork.localhost:4328/login` showed **Setup required**, exposed the **Fork launch guide** and **Docs** links, and did not show GitHub or Google OAuth buttons.
- Opening **Fork launch guide** navigated to `/docs?doc=fork-launch-runbook`; the generated runbook loaded and included the GitHub Pages HTTPS and first-admin bootstrap guidance.

Remaining release evidence still needs connected Supabase auth persistence, logout, PWA install behavior, slow-network review, target-browser coverage, and approved live/staging data boundaries.

## Reporting

Use short, factual notes. If a tool is unavailable, record that as a gap rather than marking the scenario complete. Keep screenshots only when they clarify layout, overflow, or state that text evidence cannot capture.
