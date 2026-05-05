import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const auditPath = path.join(root, "docs", "production-readiness-audit.md");

const requiredSections = [
  "Objective And Scope",
  "Prompt-To-Artifact Checklist",
  "Evidence Sources",
  "Remaining Blockers",
  "Completion Rule",
];

const requiredPhrases = [
  "Generic upstream `app.bringa.io`, not a deployment fork.",
  "first large production-ready open-source foundation",
  "No real Supabase row contents or real user data may be inspected without explicit approval.",
  "maintainability, scalability, extensibility, testability, consistency, reusability, accessibility, performance, reliability, security, observability, and developer experience",
  "`temp/20260504-prompt.md`",
  "`temp/goal-mode-hyperoptimum-production-readiness-plan.md`",
  "`docs/hyperoptimum.md`",
  "`docs/optimization-options.md`",
  "`.agents/rules/source-of-truth.md`",
  "`pnpm test:naming-conventions`",
  "`pnpm check:naming-conventions`",
  "`config/base.config.jsonc`",
  "`config/deployments/app.bringa.io.jsonc`",
  "`docs/configuration.md`",
  "`docs/forking.md`",
  "`.github/workflows/ci.yml`",
  "`pnpm check:github-workflows`",
  "`supabase/schema.sql`",
  "`supabase/migrations/`",
  "`docs/supabase-contract-audit.md`",
  "`pnpm test:supabase-contract`",
  "`pnpm check:supabase-contract`",
  "`docs/admin-operations.md`",
  "`pnpm test:auth-redirect`",
  "`pnpm test:protected-route`",
  "`pnpm test:admin-route-gate`",
  "`docs/browser-testing.md`",
  "`.agents/skills/agentic-browser-testing/SKILL.md`",
  "`docs/restore-drills.md`",
  "`pnpm test:account-deletion-cleanup`",
  "`pnpm check:restore-drills`",
  "`docs/observability.md`",
  "`pnpm test:observability`",
  "`pnpm check:observability`",
  "`pnpm check:copy`",
  "GitHub branch protection and manual Pages deployment settings require repository UI or plan access.",
  "Live Supabase schema, RLS, functions, triggers, Storage, Edge Functions, advisor remediation, and an empty-baseline backup have approved evidence.",
  "Live Supabase health checks beyond schema/key/API smoke tests, Edge Function log review, and any external error-reporting decision require final operator policy.",
  "Local app development cannot be linked to a Supabase development branch until Supabase MCP branch access stops returning the current permission-validation error or an alternate branch workflow is selected.",
  "Auth persistence, logout, PWA install, slow network, and long-content states still need browser evidence.",
  "Trusted account deletion cleanup still needs approved rehearsal or production run with backup/export evidence and operator retention policy.",
  "Live restore drills and encrypted backup handling still need approved access and policy.",
  "Do not mark the active goal complete until every blocker is either resolved with evidence or explicitly descoped by the user.",
];

const requiredRows = [
  "Source of truth and hyperoptimum",
  "Naming conventions and developer experience",
  "Forkability and configuration",
  "Secret-free manual CI/CD",
  "Supabase contract and privacy",
  "Product model and admin operations",
  "Auth and onboarding decision boundaries",
  "Browser, accessibility, and PWA QA",
  "Backups, restore, and deletion cleanup",
  "Privacy-preserving observability",
  "German organization wording removed from English docs",
];

function requireIncludes(content, phrase, label) {
  if (!content.includes(phrase)) {
    throw new Error(`${label} is missing required phrase: ${phrase}`);
  }
}

function requireSection(sections, title) {
  if (!sections.has(title)) {
    throw new Error(`docs/production-readiness-audit.md is missing section: ${title}`);
  }
}

export function extractMarkdownSections(content) {
  const sections = new Map();
  const lines = content.split(/\r?\n/);
  let currentTitle = null;
  let currentBody = [];

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      if (currentTitle) {
        sections.set(currentTitle, currentBody.join("\n").trim());
      }
      currentTitle = heading[1].trim();
      currentBody = [];
      continue;
    }

    if (currentTitle) {
      currentBody.push(line);
    }
  }

  if (currentTitle) {
    sections.set(currentTitle, currentBody.join("\n").trim());
  }

  return sections;
}

export function checkProductionReadinessAuditContent(content) {
  const sections = extractMarkdownSections(content);

  for (const section of requiredSections) {
    requireSection(sections, section);
  }

  for (const phrase of requiredPhrases) {
    requireIncludes(content, phrase, "docs/production-readiness-audit.md");
  }

  for (const row of requiredRows) {
    requireIncludes(sections.get("Prompt-To-Artifact Checklist"), row, "docs/production-readiness-audit.md");
  }
}

export async function main() {
  const content = await readFile(auditPath, "utf8");
  checkProductionReadinessAuditContent(content);
  console.log("Production readiness audit check passed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
