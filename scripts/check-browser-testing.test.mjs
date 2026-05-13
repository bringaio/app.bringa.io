import assert from "node:assert/strict";
import test from "node:test";

import { checkBrowserTestingContent, extractMarkdownHeadings } from "./check-browser-testing.mjs";

test("extracts markdown headings by level", () => {
  const headings = extractMarkdownHeadings(`# Title
## Scope
### Mobile Item Browsing
### PWA Installed Flow
`);

  assert.deepEqual(headings, [
    { level: 1, title: "Title" },
    { level: 2, title: "Scope" },
    { level: 3, title: "Mobile Item Browsing" },
    { level: 3, title: "PWA Installed Flow" },
  ]);
});

test("accepts browser runbook and skill content with required scenario coverage", () => {
  assert.doesNotThrow(() => checkBrowserTestingContent({
    runbook: `
# Browser Testing
Use .agents/skills/agentic-browser-testing/SKILL.md.
## Scope
Do not use production user data unless the exact scenario and data category have been approved.
## Dev Server Startup
Before starting \`pnpm dev\`, \`pnpm dev:docker\`, \`pnpm exec next dev\`, or a static preview server, check whether a suitable server is already listening.
lsof -nP -iTCP:3000 -sTCP:LISTEN
Stop only the server process started for the current task.
## Baseline Routes
- /login
- /invite
- /dashboard
- /items/create and /items/edit
- /items/details
- /settings
- /admin/dashboard, /admin/users, /admin/user-items, /admin/moderation, /admin/item-versions, /admin/deletion-requests, and /admin/notifications
## Responsive And Accessibility Pass
- mobile narrow: 375x812
- tablet: 768x1024
- desktop: 1440x900
- keyboard-only navigation
- light and dark themes
## PWA Pass
Verify /manifest.webmanifest and install behavior.
## Reporting
Record expected result, actual result, and evidence.
`,
    skill: `
# Agentic Browser Testing
Do not add Playwright. Use docs/browser-testing.md.
## Dev Server Startup
Before starting \`pnpm dev\`, \`pnpm dev:docker\`, \`pnpm exec next dev\`, or a static preview server, check whether a suitable server is already listening.
lsof -nP -iTCP:3000 -sTCP:LISTEN
Stop only the server process started for the current task.
## Tool Choice
## Baseline Scenarios
- PWA: manifest and install behavior.
## Scenario Sets
### Mobile Item Browsing
### Borrowed-First Dashboard
### User Item Visibility
### Create And Edit Image Preview
### Admin Dashboard And User Item Views
### Moderation Queue
### Invite And Unvalidated User
### PWA Installed Flow
### Long Content And Empty States
## Role Matrix
- Anonymous visitor
- Authenticated but uninvited user
- Validated user without borrowed items
- Validated user with borrowed items
- Item creator
- Admin
## Data Guidance
Do not use production user data unless the user approves the exact scenario.
## Expected Reporting
Record viewport, role, route, action, expected result, actual result, evidence, and data source.
`,
  }));
});

test("rejects missing browser scenario headings", () => {
  assert.throws(
    () => checkBrowserTestingContent({
      runbook: `
# Browser Testing
Use .agents/skills/agentic-browser-testing/SKILL.md.
## Scope
Do not use production user data unless the exact scenario and data category have been approved.
## Dev Server Startup
Before starting \`pnpm dev\`, \`pnpm dev:docker\`, \`pnpm exec next dev\`, or a static preview server, check whether a suitable server is already listening.
lsof -nP -iTCP:3000 -sTCP:LISTEN
Stop only the server process started for the current task.
## Baseline Routes
- /login
- /invite
- /dashboard
- /items/create and /items/edit
- /items/details
- /settings
- /admin/dashboard, /admin/users, /admin/user-items, /admin/moderation, /admin/item-versions, /admin/deletion-requests, and /admin/notifications
## Responsive And Accessibility Pass
- mobile narrow: 375x812
- tablet: 768x1024
- desktop: 1440x900
- keyboard-only navigation
- light and dark themes
## PWA Pass
Verify /manifest.webmanifest.
## Reporting
Record expected result, actual result, and evidence.
`,
      skill: `
# Agentic Browser Testing
Do not add Playwright. Use docs/browser-testing.md.
## Dev Server Startup
Before starting \`pnpm dev\`, \`pnpm dev:docker\`, \`pnpm exec next dev\`, or a static preview server, check whether a suitable server is already listening.
lsof -nP -iTCP:3000 -sTCP:LISTEN
Stop only the server process started for the current task.
## Tool Choice
## Baseline Scenarios
## Scenario Sets
### Mobile Item Browsing
## Role Matrix
- Anonymous visitor
## Data Guidance
Do not use production user data unless the user approves the exact scenario.
## Expected Reporting
Record viewport, role, route, action, expected result, actual result, evidence, and data source.
`,
    }),
    /missing scenario heading.*Borrowed-First Dashboard/s,
  );
});
