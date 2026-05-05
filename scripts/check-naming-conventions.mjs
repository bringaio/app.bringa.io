import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const conventionsPath = path.join(root, "docs", "conventions.md");

const requiredSections = [
  "Git And Pull Requests",
  "Source Of Truth",
  "Naming Conventions",
];

const requiredPhrases = [
  "React component exports use PascalCase.",
  "Component filenames under `src/components/` use kebab-case.",
  "Hooks use `useX` names and may keep camelCase filenames such as `src/hooks/useAuth.tsx`.",
  "App Router route folders use lowercase or kebab-case segments.",
  "Utility and domain modules under `src/lib/` use kebab-case filenames.",
  "Config keys use lower camelCase.",
  "Supabase tables, columns, enums, policies, and RPC function names use snake_case.",
  "Supabase migrations use `YYYYMMDDHHMMSS_snake_case.sql`.",
  "Edge Function directory names use kebab-case; preserve legacy deployed names until a migration plan exists.",
  "Scripts under `scripts/` use kebab-case and pair checkers with `.test.mjs` when behavior is not trivial.",
  "Branches and commits follow the Git And Pull Requests section.",
];

function requireIncludes(content, phrase, label) {
  if (!content.includes(phrase)) {
    throw new Error(`${label} is missing required phrase: ${phrase}`);
  }
}

function requireSection(sections, title) {
  if (!sections.has(title)) {
    throw new Error(`docs/conventions.md is missing section: ${title}`);
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

export function checkNamingConventionsContent(content) {
  const sections = extractMarkdownSections(content);

  for (const section of requiredSections) {
    requireSection(sections, section);
  }

  const namingSection = sections.get("Naming Conventions") || "";
  for (const phrase of requiredPhrases) {
    requireIncludes(namingSection, phrase, "docs/conventions.md");
  }
}

export async function main() {
  const content = await readFile(conventionsPath, "utf8");
  checkNamingConventionsContent(content);
  console.log("Naming conventions check passed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
