---
title: Browser Testing
---

# Browser Testing

Use this runbook for manual or agentic browser checks before release work, large UI changes, PWA changes, or Supabase branch testing. The detailed agent scenario source is `.agents/skills/agentic-browser-testing/SKILL.md`; this page is the maintainer-facing checklist and evidence format.

## Scope

Test against local, mock, staging, or explicitly approved development data. Do not use production user data unless the exact scenario and data category have been approved.

Record:

- date, commit, deployment target, and browser;
- viewport and input mode;
- role: anonymous, uninvited authenticated user, validated user, item creator, or admin;
- route, action, expected result, actual result, and evidence;
- whether data was mock, local development, staging, or production metadata.

## Baseline Routes

- `/login`: terms checkbox gates sign-in actions, terms link works, logout returns to logged-out state.
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

Remaining release evidence still needs connected Supabase auth persistence, logout, PWA install behavior, slow-network review, target-browser coverage, and approved live/staging data boundaries.

## Reporting

Use short, factual notes. If a tool is unavailable, record that as a gap rather than marking the scenario complete. Keep screenshots only when they clarify layout, overflow, or state that text evidence cannot capture.
