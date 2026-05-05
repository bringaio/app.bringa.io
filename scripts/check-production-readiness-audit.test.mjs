import assert from "node:assert/strict";
import test from "node:test";

import { checkProductionReadinessAuditContent, extractMarkdownSections } from "./check-production-readiness-audit.mjs";

function validAuditContent() {
  return `
# Production Readiness Audit

## Objective And Scope

- Generic upstream \`app.bringa.io\`, not a deployment fork.
- Bring the repository toward a first large production-ready open-source foundation.
- No real Supabase row contents or real user data may be inspected without explicit approval.
- Hyperoptimum covers maintainability, scalability, extensibility, testability, consistency, reusability, accessibility, performance, reliability, security, observability, and developer experience.

## Prompt-To-Artifact Checklist

| Prompt requirement | Evidence | Status |
| --- | --- | --- |
| Read \`temp/20260504-prompt.md\` and \`temp/goal-mode-hyperoptimum-production-readiness-plan.md\` | Audit links temp prompts and docs | Covered |
| Source of truth and hyperoptimum | \`docs/hyperoptimum.md\`, \`docs/optimization-options.md\`, \`.agents/rules/source-of-truth.md\` | Covered |
| Naming conventions and developer experience | \`docs/conventions.md\`, \`pnpm test:naming-conventions\`, \`pnpm check:naming-conventions\` | Covered |
| Forkability and configuration | \`config/base.config.jsonc\`, \`config/deployments/app.bringa.io.jsonc\`, \`docs/configuration.md\`, \`docs/forking.md\` | Covered |
| Security maintenance and fork safety | \`SECURITY.md\`, \`docs/security.md\`, \`docs/maintenance.md\`, \`.agents/skills/security-maintenance/SKILL.md\`, \`.agents/skills/fork-operator-onboarding/SKILL.md\`, \`pnpm test:security-maintenance\`, \`pnpm check:security-maintenance\`, \`pnpm check:secrets\`, \`pnpm check:release-checklist\` | Covered locally |
| Secret-free manual CI/CD | \`.github/workflows/ci.yml\`, \`docs/conventions.md\`, \`pnpm check:github-workflows\`, \`pnpm check:edge-functions\` | Covered |
| Supabase contract and privacy | \`supabase/schema.sql\`, \`supabase/migrations/\`, \`docs/supabase-contract-audit.md\`, \`pnpm test:supabase-contract\`, \`pnpm check:supabase-contract\`, \`pnpm check:supabase-mcp\`, \`pnpm check:edge-functions\` | Partial |
| Supabase development branch setup | \`docs/supabase-branching.md\`, \`pnpm test:supabase-cli\`, \`pnpm check:supabase-cli\`, \`pnpm check:supabase-branching\` | Blocked |
| Product model and admin operations | \`docs/admin-operations.md\`, \`docs/readiness-checklist.md\`, \`pnpm test:admin-route-gate\`, \`scripts/admin-system-health.test.mjs\` | Partial |
| Auth and onboarding decision boundaries | \`pnpm test:auth-redirect\`, \`pnpm test:protected-route\`, \`docs/supabase-branching.md\` Auth redirect URL tasks | Partial |
| Browser, accessibility, and PWA QA | \`docs/browser-testing.md\`, \`.agents/skills/agentic-browser-testing/SKILL.md\`, \`pnpm test:pwa-manifest\` | Blocked |
| Backups, restore, and deletion cleanup | \`docs/maintenance.md\`, \`docs/restore-drills.md\`, \`pnpm test:account-deletion-cleanup\`, \`pnpm check:restore-drills\` | Partial |
| Privacy-preserving observability | \`docs/observability.md\`, \`pnpm test:observability\`, \`pnpm check:observability\` | Partial |
| German organization wording removed from English docs | \`pnpm check:copy\` and direct \`rg\` check | Covered |

## Evidence Sources

- \`docs/readiness-checklist.md\`
- \`docs/definition-of-done.md\`
- \`docs/security.md\`
- \`docs/optimization-options.md\`
- \`docs/conventions.md\`
- \`docs/browser-testing.md\`
- \`docs/supabase-branching.md\`
- \`docs/restore-drills.md\`
- \`docs/observability.md\`
- \`supabase/README.md\`
- \`.agents/\`

## Remaining Blockers

- GitHub branch protection, forkability, and manual Pages deployment settings require repository UI, organization policy, visibility, or plan access. GitHub Pages site creation and private-repository fork enabling currently return plan or organization-policy limitations.
- Live Supabase schema, RLS, functions, triggers, Storage, Edge Functions, advisor remediation, Storage bucket metadata, and an empty-baseline backup have approved evidence.
- Live Supabase health checks beyond schema/key/API smoke tests and any external error-reporting decision require final operator policy. Supabase Edge Function logs were checked on 2026-05-05 and had no invocations in the last 24 hours; recheck them after Telegram delivery is configured.
- Local app development cannot be linked to a Supabase development branch until Supabase MCP branch access stops returning the current permission-validation error or an alternate branch workflow is selected.
- Auth persistence, logout, PWA install, slow network, and long-content states still need browser evidence.
- Trusted account deletion cleanup still needs approved rehearsal or production run with backup/export evidence and operator retention policy.
- Live restore drills and encrypted backup handling still need approved access and policy.

## Completion Rule

Do not mark the active goal complete until every blocker is either resolved with evidence or explicitly descoped by the user.
`;
}

test("extracts production readiness audit sections", () => {
  const sections = extractMarkdownSections(`# Production Readiness Audit

## Objective And Scope
Scope text.

## Completion Rule
Rule text.
`);

  assert.deepEqual(sections, new Map([
    ["Objective And Scope", "Scope text."],
    ["Completion Rule", "Rule text."],
  ]));
});

test("accepts an audit with prompt mappings, evidence, and blockers", () => {
  assert.doesNotThrow(() => checkProductionReadinessAuditContent(validAuditContent()));
});

test("rejects audits that omit live Supabase blockers", () => {
  assert.throws(
    () => checkProductionReadinessAuditContent(
      validAuditContent().replace(
        "- Live Supabase schema, RLS, functions, triggers, Storage, Edge Functions, advisor remediation, Storage bucket metadata, and an empty-baseline backup have approved evidence.",
        "- Supabase live review remains pending.",
      ),
    ),
    /Live Supabase schema/,
  );
});

test("requires repo-local Supabase CLI evidence", () => {
  assert.throws(
    () => checkProductionReadinessAuditContent(
      validAuditContent()
        .replace("`pnpm test:supabase-cli`, ", "")
        .replace("`pnpm check:supabase-cli`, ", ""),
    ),
    /supabase-cli/,
  );
});

test("requires security maintenance checker evidence", () => {
  assert.throws(
    () => checkProductionReadinessAuditContent(
      validAuditContent()
        .replace("`pnpm test:security-maintenance`, ", "")
        .replace("`pnpm check:security-maintenance`, ", ""),
    ),
    /security-maintenance/,
  );
});
