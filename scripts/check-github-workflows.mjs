import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflowsDir = path.join(root, ".github", "workflows");
const allowedTriggers = new Set(["workflow_dispatch"]);

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
    throw new Error(`${filePath} must stay manual-only. Remove automatic trigger(s): ${disallowed.join(", ")}.`);
  }

  if (filePath === ".github/workflows/ci.yml") {
    if (!content.includes("denoland/setup-deno")) {
      throw new Error(`${filePath} must set up Deno before checking Supabase Edge Functions.`);
    }
    if (!content.includes("pnpm check:edge-functions")) {
      throw new Error(`${filePath} must run pnpm check:edge-functions so Edge Functions are checked in CI.`);
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
