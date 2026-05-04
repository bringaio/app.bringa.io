---
name: agentic-browser-testing
description: Use when manually testing this web app through an agentic browser, especially auth, item, admin, responsive, PWA, image upload, and route flows.
---

# Agentic Browser Testing

Use existing browser-agent capabilities first. Do not add Playwright or another browser package unless the user asks or the current task requires repeatable CI automation.

## Baseline Scenarios

- Login page: terms checkbox gates OAuth buttons; terms route opens correctly; logout returns to logged-out state.
- Invite flow: invalid code shows an error; valid code redirects to dashboard; users without invite remain blocked when signup-without-invite is disabled.
- Dashboard default: users with borrowed items see borrowed items first; users without borrowed items see available items; empty states do not hide navigation.
- Dashboard controls: search, available/all/borrowed filters, create action, fixed bottom controls, keyboard focus, and long labels stay usable on mobile and desktop.
- Item create: configured MIME types and max size are enforced; selected image preview appears immediately; replacing a file revokes the old preview; create without image still works.
- Item edit: existing image is visible; replacement follows the same media rules as create; permission errors are understandable for non-owners until admin edit support exists.
- Item details: description, status, borrow, return, history for admins, edit/delete permissions, and route reloads behave consistently.
- Admin: users, invite codes, item visibility, proposed edits, flags, user item lists, and Telegram mute controls once those features exist.
- Responsive: narrow mobile, tablet, desktop, touch scrolling, keyboard navigation, long item names, long words, image-heavy lists, dark and light themes.
- PWA: manifest, icons, install behavior, persisted Supabase session after home-screen install, offline behavior if supported, and logout.

## Role Matrix

- Anonymous visitor: landing/login/terms only; protected routes redirect safely.
- Authenticated but uninvited user: invite or pending approval flow only.
- Validated user without borrowed items: dashboard starts on available items.
- Validated user with borrowed items: dashboard starts on borrowed items.
- Item creator: can edit and hide/delete according to current policy.
- Admin: can access admin routes and moderation surfaces without seeing unnecessary personal data.

## Data Guidance

- Prefer local, mock, or explicitly approved development data.
- Do not use production user data unless the user approves the exact scenario.
- Mark reports clearly as mock, development, staging, or production metadata.

## Expected Reporting

Record viewport, role, route, action, expected result, actual result, screenshots if useful, and whether real or mock data was used.
