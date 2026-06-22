/**
 * Verifies GitHub Actions workflows expose a manual dispatch fallback and only
 * use the trigger surface allowed by the repository CI contract.
 *
 * Source of truth: `.github/workflows/*.yml` and `docs/conventions.md`.
 * Side effects: None beyond CLI output and exit status.
 *
 * @module scripts/check-github-workflows
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflowsDir = path.join(root, ".github", "workflows");
const allowedTriggers = new Set(["workflow_dispatch", "push", "workflow_run"]);

function stripInlineComment(line) {
  const index = line.indexOf("#");
  return index === -1 ? line : line.slice(0, index);
}

function unquote(value) {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function parseInlineTriggers(value) {
  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map(unquote)
      .filter(Boolean);
  }

  return [unquote(trimmed)];
}

function leadingSpaces(line) {
  return line.match(/^ */)?.[0].length ?? 0;
}

export function extractWorkflowTriggers(content) {
  const lines = content.split(/\r?\n/);
  const triggers = new Set();

  const onIndex = lines.findIndex((line) => /^['"]?on['"]?\s*:/.test(stripInlineComment(line)));
  if (onIndex === -1) return triggers;

  const onLine = stripInlineComment(lines[onIndex]);
  const onMatch = onLine.match(/^['"]?on['"]?\s*:\s*(.*)$/);
  if (!onMatch) return triggers;

  const inlineValue = onMatch[1].trim();
  for (const trigger of parseInlineTriggers(inlineValue)) {
    triggers.add(trigger);
  }
  if (inlineValue) return triggers;

  const childLines = [];
  for (let index = onIndex + 1; index < lines.length; index += 1) {
    const rawLine = stripInlineComment(lines[index]).replace(/\s+$/, "");
    if (!rawLine.trim()) continue;
    if (leadingSpaces(rawLine) === 0) break;
    childLines.push(rawLine);
  }

  const childIndent = Math.min(...childLines.map(leadingSpaces));
  for (const rawLine of childLines) {
    if (leadingSpaces(rawLine) !== childIndent) continue;

    const trimmed = rawLine.trim();
    if (trimmed.startsWith("-")) {
      const trigger = unquote(trimmed.slice(1));
      if (trigger) triggers.add(trigger);
      continue;
    }

    const key = trimmed.match(/^([^:]+):/)?.[1];
    if (key) triggers.add(unquote(key));
  }

  return triggers;
}

export function checkWorkflowContent(filePath, content) {
  const triggers = extractWorkflowTriggers(content);

  if (!triggers.has("workflow_dispatch")) {
    throw new Error(`${filePath} must include workflow_dispatch so it can be run manually.`);
  }

  const disallowed = [...triggers].filter((trigger) => !allowedTriggers.has(trigger));
  if (disallowed.length > 0) {
    throw new Error(`${filePath} only allows ${[...allowedTriggers].join(", ")}. Remove trigger(s): ${disallowed.join(", ")}.`);
  }

  if (filePath === ".github/workflows/ci.yml") {
    if (!content.includes("fetch-depth: 0")) {
      throw new Error(`${filePath} must set actions/checkout fetch-depth: 0 so version bump comparisons can read origin/main.`);
    }
    if (!content.includes("denoland/setup-deno")) {
      throw new Error(`${filePath} must set up Deno before checking Supabase Edge Functions.`);
    }
    if (!content.includes("pnpm check:supabase-cli")) {
      throw new Error(`${filePath} must run pnpm check:supabase-cli so repo-local Supabase CLI usage is checked in CI.`);
    }
    if (!content.includes("pnpm check:local-supabase")) {
      throw new Error(`${filePath} must run pnpm check:local-supabase so local Supabase development remains the default free-account path.`);
    }
    if (!content.includes("pnpm check:security-maintenance")) {
      throw new Error(`${filePath} must run pnpm check:security-maintenance so security maintenance guardrails are checked in CI.`);
    }
    if (!content.includes("pnpm check:version-bump")) {
      throw new Error(`${filePath} must run pnpm check:version-bump so changed branches update package.json.version.`);
    }
    if (!content.includes("pnpm check:edge-functions")) {
      throw new Error(`${filePath} must run pnpm check:edge-functions so Edge Functions are checked in CI.`);
    }
    if (!content.includes("pnpm check:production-bundle")) {
      throw new Error(`${filePath} must run pnpm check:production-bundle after the static build so development fixtures stay out of production chunks.`);
    }
  }

  if (filePath === ".github/workflows/pages.yml") {
    if (triggers.has("push")) {
      throw new Error(`${filePath} must run after successful CI instead of directly on push. Remove the push trigger.`);
    }
    if (!triggers.has("workflow_run") || !content.includes('workflows: ["CI"]') || !content.includes("types: [completed]")) {
      throw new Error(`${filePath} must use workflow_run for the completed CI workflow.`);
    }
    if (!content.includes("github.event.workflow_run.conclusion == 'success'")) {
      throw new Error(`${filePath} must gate automatic Pages builds on successful CI completion.`);
    }
    if (!content.includes("pnpm check:production-bundle")) {
      throw new Error(`${filePath} must run pnpm check:production-bundle before uploading the Pages artifact.`);
    }
  }

  if (filePath === ".github/workflows/e2e.yml") {
    if (triggers.has("push")) {
      throw new Error(`${filePath} must stay manual-only. Remove the push trigger so e2e is dispatched intentionally.`);
    }
    if (!content.includes("pnpm exec playwright install --with-deps chromium")) {
      throw new Error(`${filePath} must run pnpm exec playwright install --with-deps chromium before running browser tests.`);
    }
    if (!content.includes("pnpm exec supabase start")) {
      throw new Error(`${filePath} must start the local Supabase stack before Playwright tests.`);
    }
    if (!content.includes("pnpm setup:local-supabase --force --seed")) {
      throw new Error(`${filePath} must configure and seed local Supabase before Playwright tests.`);
    }
    if (!content.includes("pnpm doctor:local-supabase")) {
      throw new Error(`${filePath} must run pnpm doctor:local-supabase before Playwright tests.`);
    }
    if (!content.includes("pnpm test:e2e:ci")) {
      throw new Error(`${filePath} must run pnpm test:e2e:ci.`);
    }
    if (!content.includes("actions/upload-artifact") || !content.includes("playwright-report/") || !content.includes("test-results/")) {
      throw new Error(`${filePath} must upload Playwright report and test-result artifacts.`);
    }
  }

  return triggers;
}

async function main() {
  const entries = await readdir(workflowsDir, { withFileTypes: true });
  const workflowFiles = entries
    .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name))
    .map((entry) => path.join(workflowsDir, entry.name))
    .sort();

  if (workflowFiles.length === 0) {
    throw new Error("No GitHub workflow files found.");
  }

  for (const workflowPath of workflowFiles) {
    const content = await readFile(workflowPath, "utf8");
    checkWorkflowContent(path.relative(root, workflowPath), content);
  }

  console.log(`GitHub workflow trigger check passed for ${workflowFiles.length} workflow files.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
