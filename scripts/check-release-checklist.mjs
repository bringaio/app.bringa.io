import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const allowedNonScriptCommands = new Set([
  "pnpm install --frozen-lockfile",
  "pnpm build",
  "pnpm exec tsc --noEmit",
  "pnpm lint",
  "pnpm outdated",
]);

const manualOnlyReadinessCommands = new Set([
  "pnpm outdated",
  "Manual GitHub Pages app deploy",
  "Agentic browser testing for user, admin, uninvited, mobile, desktop, and PWA flows",
]);

function normalizeBuildCommand(command) {
  return command.includes(" pnpm build") ? "pnpm build" : command;
}

function sortValues(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function extractScriptName(command) {
  const normalized = normalizeBuildCommand(command);
  const match = normalized.match(/^pnpm\s+([^\s]+)/);
  return match?.[1] ?? null;
}

function assertEmpty(values, message) {
  if (values.length > 0) {
    throw new Error(`${message}: ${values.join(", ")}`);
  }
}

function isReleaseCommand(command) {
  return command.startsWith("pnpm ") || command.includes(" pnpm build");
}

export function extractCiPnpmCommands(content) {
  const commands = new Set();
  const pattern = /^\s*run:\s*(pnpm .+)$/gm;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    commands.add(match[1].trim());
  }

  return commands;
}

export function extractMarkdownPnpmCommands(content) {
  const commands = new Set();
  const pattern = /`([^`]*pnpm [^`]+)`/g;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    commands.add(match[1].trim());
  }

  return commands;
}

function extractReadinessCommands(content) {
  const section = content.match(/## Verification Before Release\n(?<body>[\s\S]*?)(?:\n## |\nKeep unresolved items|$)/)?.groups?.body ?? "";
  const commands = extractMarkdownPnpmCommands(section);

  for (const line of section.split(/\r?\n/)) {
    const match = line.match(/^-\s+\[\s*\]\s+(.+)$/);
    if (!match) continue;

    const value = match[1].trim();
    if (!value.startsWith("`")) {
      commands.add(value);
    }
  }

  return commands;
}

export function checkReleaseChecklist({
  packageJson,
  ciYaml,
  conventionsMarkdown,
  readinessMarkdown,
}) {
  const packageScripts = new Set(Object.keys(JSON.parse(packageJson).scripts || {}));
  const ciCommands = extractCiPnpmCommands(ciYaml);
  const conventionCommands = extractMarkdownPnpmCommands(conventionsMarkdown);
  const readinessCommands = extractReadinessCommands(readinessMarkdown);

  const ciMissingFromConventions = sortValues([...ciCommands].filter((command) => !conventionCommands.has(command)));
  assertEmpty(ciMissingFromConventions, "docs/conventions.md is missing manual CI command(s)");

  const releaseCommands = [...readinessCommands].filter(isReleaseCommand);
  const readinessMissingFromCi = sortValues(releaseCommands
    .map(normalizeBuildCommand)
    .filter((command) => !manualOnlyReadinessCommands.has(command))
    .filter((command) => !ciCommands.has(command)));
  assertEmpty(readinessMissingFromCi, "Manual CI is missing readiness command(s)");

  const packageReferencedCommands = new Set([
    ...ciCommands,
    ...conventionCommands,
    ...releaseCommands.map(normalizeBuildCommand),
  ]);

  const missingScripts = sortValues([...packageReferencedCommands]
    .filter((command) => !allowedNonScriptCommands.has(command))
    .map(extractScriptName)
    .filter(Boolean)
    .filter((scriptName) => !packageScripts.has(scriptName)));
  assertEmpty(missingScripts, "package.json is missing script(s) referenced by release checks");

  return {
    ciCommands,
    conventionCommands,
    readinessCommands,
  };
}

export async function main() {
  const [packageJson, ciYaml, conventionsMarkdown, readinessMarkdown] = await Promise.all([
    readFile(path.join(root, "package.json"), "utf8"),
    readFile(path.join(root, ".github", "workflows", "ci.yml"), "utf8"),
    readFile(path.join(root, "docs", "conventions.md"), "utf8"),
    readFile(path.join(root, "docs", "readiness-checklist.md"), "utf8"),
  ]);

  checkReleaseChecklist({
    packageJson,
    ciYaml,
    conventionsMarkdown,
    readinessMarkdown,
  });
  console.log("Release checklist check passed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
