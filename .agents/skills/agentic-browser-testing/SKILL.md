---
name: agentic-browser-testing
description: Use when manually testing this web app through an agentic browser, especially auth, item, admin, responsive, PWA, image upload, and route flows.
---

# Agentic Browser Testing

Use existing browser-agent capabilities first. Do not add Playwright or another browser package unless the user asks or the current task requires repeatable CI automation.

## Baseline Scenarios

- Login page: terms checkbox gates OAuth buttons; terms route opens correctly.
- Invite flow: invalid code shows an error; valid code redirects to dashboard.
- Dashboard: users with borrowed items see borrowed items first; users without borrowed items see available items.
- Item create/edit/details: image preview, upload validation, description rendering, borrow/return, delete, and route reloads.
- Admin: users, invite codes, visibility moderation, proposed edits, and flags once those features exist.
- Responsive: narrow mobile, tablet, desktop, touch scrolling, fixed bottom search/actions, dark and light themes.
- PWA: manifest, icons, install behavior, persisted Supabase session, logout.

## Expected Reporting

Record viewport, role, route, action, expected result, actual result, screenshots if useful, and whether real or mock data was used.
