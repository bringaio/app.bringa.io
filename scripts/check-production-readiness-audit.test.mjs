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
| Secret-free manual CI/CD | \`.github/workflows/ci.yml\`, \`docs/conventions.md\`, \`pnpm check:github-workflows\` | Covered |
| Supabase contract and privacy | \`supabase/schema.sql\`, \`supabase/migrations/\`, \`docs/supabase-contract-audit.md\`, \`pnpm test:supabase-contract\`, \`pnpm check:supabase-contract\` | Partial |
| Product model and admin operations | \`docs/admin-operations.md\`, \`docs/readiness-checklist.md\`, \`scripts/admin-system-health.test.mjs\` | Partial |
| Auth and onboarding decision boundaries | \`pnpm test:auth-redirect\`, \`pnpm test:protected-route\`, \`docs/supabase-branching.md\` Auth redirect URL tasks | Partial |
| Browser, accessibility, and PWA QA | \`docs/browser-testing.md\`, \`.agents/skills/agentic-browser-testing/SKILL.md\`, \`pnpm test:pwa-manifest\` | Blocked |
| Backups, restore, and deletion cleanup | \`docs/maintenance.md\`, \`docs/restore-drills.md\`, \`pnpm test:account-deletion-cleanup\`, \`pnpm check:restore-drills\` | Partial |
| Privacy-preserving observability | \`docs/observability.md\`, \`pnpm test:observability\`, \`pnpm check:observability\` | Partial |
| German organization wording removed from English docs | \`pnpm check:copy\` and direct \`rg\` check | Covered |

## Evidence Sources

- \`docs/readiness-checklist.md\`
- \`docs/definition-of-done.md\`
- \`docs/optimization-options.md\`
- \`docs/conventions.md\`
- \`docs/browser-testing.md\`
- \`docs/supabase-branching.md\`
- \`docs/restore-drills.md\`
- \`docs/observability.md\`
- \`supabase/README.md\`
- \`.agents/\`

## Remaining Blockers

- GitHub branch protection and manual Pages deployment settings require repository UI or plan access.
- Live Supabase schema, RLS, functions, triggers, Storage, and Edge Functions review requires approved access.
- Live Supabase health checks, Edge Function log review, and any external error-reporting decision require approved access and policy.
- Local app development cannot be linked to a Supabase development branch without approved project refs and branch access.
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
        "- Live Supabase schema, RLS, functions, triggers, Storage, and Edge Functions review requires approved access.",
        "- Supabase live review remains pending.",
      ),
    ),
    /Live Supabase schema/,
  );
});
