---
name: agentic-browser-testing
description: Use when manually testing this web app through an agentic browser, especially auth, item, admin, responsive, PWA, image upload, and route flows.
---

# Agentic Browser Testing

Use existing browser-agent capabilities first. Do not add Playwright or another browser package unless the user asks or the current task requires repeatable CI automation. Use `docs/browser-testing.md` as the maintainer-facing evidence format.

## Dev Server Startup

- Before starting `pnpm dev`, `pnpm dev:docker`, `pnpm exec next dev`, or a static preview server, check whether a suitable server is already listening.
- Check the intended port first, for example `lsof -nP -iTCP:3000 -sTCP:LISTEN`, then inspect obvious alternate local ports when prior evidence mentions one.
- If an appropriate app server is already running, reuse it and verify the URL before launching another process.
- If the port is occupied by an unrelated process, choose a different port, record the URL in the browser evidence, and keep the old process untouched.
- Stop only the server process started for the current task. Do not kill a user-owned or pre-existing dev server just to clean up.

## Tool Choice

- Use the Codex in-app browser or other available agentic browser for normal route, responsive, and workflow checks.
- Use Chrome DevTools MCP only when it is available and the task needs low-level console, network, accessibility-tree, performance, or throttling inspection.
- If Chrome DevTools MCP requires a local debugging port, verify the connection before relying on it.

## Baseline Scenarios

- Login page: terms checkbox gates OAuth buttons; setup-required view appears for unfinished public fork config without loading Supabase auth controls; terms route opens correctly; logout returns to logged-out state.
- Local Supabase login: when `pnpm dev:docker` points at localhost, accept terms and use the seeded Admin or Member email/password panel before testing real Auth, RLS, RPC, or Storage flows.
- Invite flow: invalid code shows an error; valid code redirects to dashboard; users without invite remain blocked when signup-without-invite is disabled.
- Dashboard default: users with borrowed items see borrowed items first; users without borrowed items see available items; empty states do not hide navigation.
- Dashboard controls: search, available/all/borrowed filters, create action, fixed bottom controls, keyboard focus, and long labels stay usable on mobile and desktop.
- Item create: configured MIME types and max size are enforced; selected image preview appears immediately; replacing a file revokes the old preview; create without image still works.
- Item edit: existing image is visible; replacement follows the same media rules as create; permission errors are understandable for non-owners until admin edit support exists.
- Item details: description, status, borrow, return, history for admins, edit/delete permissions, and route reloads behave consistently.
- Admin: dashboard health, users, invite codes, item visibility, proposed edits, flags, deletion requests, notification settings, user item lists, item versions, and Telegram mute controls once those features exist.
- Responsive: narrow mobile, tablet, desktop, touch scrolling, keyboard navigation, long item names, long words, image-heavy lists, dark and light themes.
- PWA: manifest, icons, install behavior, persisted Supabase session after home-screen install, offline behavior if supported, and logout.

## Scenario Sets

Use these as concrete routes through the app. Adapt only the account names and fixture records.

### Mobile Item Browsing

1. Open `/dashboard` as a validated user with no borrowed items at 375x812.
2. Confirm available items are shown first, search is reachable without horizontal scroll, and bottom actions do not cover list content.
3. Search for a long word and a missing item; confirm result and empty states keep navigation visible.
4. Rotate or resize to tablet width and confirm cards, filters, and create action do not jump or overlap.

### Borrowed-First Dashboard

1. Open `/dashboard` as a validated user with at least one borrowed item.
2. Confirm borrowed items are the initial view and available/all controls remain discoverable.
3. Return one item from details, go back to dashboard, and confirm the default view updates only when no borrowed items remain.

### User Item Visibility

1. Open `/items/details?id=<own-item-id>` as the creator or profile owner.
2. Hide the item with a reason and confirm public lists no longer show it.
3. Request visibility again with a reason and confirm the item becomes pending for admin review instead of directly visible.
4. Open `/admin/moderation` as an admin and confirm the pending-visible item appears with the submitted reason.

### Create And Edit Image Preview

1. Open `/items/create`.
2. Try a disallowed MIME type and an oversized image; confirm the error is specific and does not clear entered text.
3. Select a valid image; confirm preview appears immediately before upload and remains stable on mobile.
4. Replace the image; confirm only the new preview remains.
5. Save, open `/items/edit` for the item, and repeat replacement plus no-image behavior.

### Admin Dashboard And User Item Views

1. Open `/admin/dashboard` as an admin on desktop and mobile.
2. Confirm stats are scannable, headings fit, and placeholders for Telegram, backup, Supabase, Storage, and moderation health are clear when present.
3. Open `/admin/users`, promote/demote only with the intended admin role, and confirm self-demotion is blocked.
4. From a user row or detail route, inspect that user's items; confirm owner, visibility, and status are visible without exposing unnecessary personal data, then change visibility with a reason through the admin controls.
5. Open item versions from an admin item row, add a restore reason, and confirm restore is routed through the RPC flow and records a new version.
6. Open `/admin/deletion-requests` and `/admin/notifications`; confirm non-destructive review actions, queues, and settings do not expose more personal data than needed.

### Moderation Queue

1. Open `/admin/moderation` or the admin dashboard section when flags, suggestions, image proposals, or pending-visible requests exist.
2. Confirm each queue item shows type, target item/image/user, current status, submitted time, and a reason field for admin action.
3. Mark suggestions as reviewing/accepted/rejected and flags as reviewing/resolved/dismissed; apply a content/image or owner suggestion with explicit item fields when available. Confirm updates happen through RPCs and broad table writes remain blocked.

### Invite And Unvalidated User

1. Sign in as a user without a valid invite.
2. Confirm protected app routes redirect to `/invite` or the configured pending approval flow.
3. Enter an invalid invite code and verify the error is reachable by keyboard and screen reader.
4. Enter a valid code and verify the profile/dashboard transition.

### Fork Setup-Required Login

1. Serve a production/static build whose public config still has placeholder Supabase values, a local Supabase URL, or upstream config on a different public origin.
2. Open `/login` as an anonymous visitor.
3. Confirm the page shows setup-required copy, links to `/docs?doc=fork-launch-runbook`, and does not show OAuth buttons.
4. Open `/docs?doc=fork-launch-runbook` from the view and confirm the runbook loads from the static export.

### PWA Installed Flow

1. Verify `/manifest.webmanifest` uses configured app name, icons, theme color, and background color.
2. Install the app or simulate installed mode where the browser supports it.
3. Confirm Supabase session persistence, logout, and relaunch behavior.
4. Test offline or slow-network behavior only as a capability check; do not claim offline support unless the app provides it.

### Long Content And Empty States

1. Use fixture items with long names, long unbroken words, long owner labels, missing images, and image-heavy lists.
2. Check `/dashboard`, `/items/details`, `/items/create`, `/items/edit`, and admin routes at mobile and desktop widths.
3. Confirm text wraps or truncates intentionally, buttons keep stable dimensions, and empty/error/loading states keep the next action clear.

## Role Matrix

- Anonymous visitor: landing/login/terms only; protected routes redirect safely.
- Authenticated but uninvited user: invite or pending approval flow only.
- Validated user without borrowed items: dashboard starts on available items.
- Validated user with borrowed items: dashboard starts on borrowed items.
- Item creator: can edit and hide/delete according to current policy.
- Admin: can access admin routes and moderation surfaces without seeing unnecessary personal data.

## Data Guidance

- Prefer local, mock, or explicitly approved development data.
- For real upload behavior, prefer the local Supabase stack over local demo mode because local demo Storage is a mock and does not prove bucket/object behavior.
- Do not use production user data unless the user approves the exact scenario.
- Mark reports clearly as mock, development, staging, or production metadata.

## Expected Reporting

Record viewport, role, route, action, expected result, actual result, screenshots if useful, and whether real or mock data was used.
