import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runbookPath = path.join(root, "docs", "supabase-branching.md");

const requiredSections = [
  "Current Documentation Signals",
  "Target State",
  "Preparation Tasks",
  "Recommended Workflow",
  "Known Gaps",
];

const requiredPhrases = [
  "2026-05-05 Context7 reviews",
  "development or preview branches",
  "persistent branches",
  "isolated project copies for database, Edge Function, and configuration changes",
  "Default development branch planning should assume no production row data is copied.",
  "POST /v1/projects/{ref}/branches",
  "supabase branches create [name]",
  "--project-ref <production-ref>",
  "--persistent",
  "--with-data",
  "copied branch rows remain production data",
  "supabase branches list --project-ref <production-ref>",
  "supabase link --project-ref <ref>",
  "supabase db push --dry-run",
  "supabase gen types --linked > types.ts",
  "Edge Function secrets",
  "Telegram settings",
  "Storage bucket policy and object behavior",
  "Auth provider redirect URLs",
  "branch merge endpoint",
  "prefer reviewed migrations in git",
  "repo-local Supabase CLI",
  "SUPABASE_ACCESS_TOKEN",
  "Production deployment secrets point at the production Supabase project.",
  "Local `.env.local` for app development points at a persistent Supabase development branch",
  "The Supabase CLI is linked to the development branch ref",
  "Production data is not cloned into the branch by default.",
  "no real row inspection without explicit approval",
  "Repository migrations remain the canonical change record.",
  "Keep production deploy secrets unchanged.",
  "Supabase Auth users and Storage objects are separate surfaces",
  "Treat copied rows as production data.",
  "Telegram, Edge Function, OAuth, and redirect settings need explicit branch verification.",
  "does not yet generate committed database types",
];

const requiredCheckboxes = [
  "Confirm the production Supabase project ref",
  "Confirm whether development branches are enabled for the project plan.",
  "Choose the branch name, defaulting to `dev`",
  "Confirm whether the development branch should clone production data, start schema-only, or use seed/fixture data.",
  "Confirm the privacy rule for any branch copied from production.",
  "Run or explicitly decline `pnpm backup:supabase`",
  "Record production and development branch refs",
  "Decide whether local `.env.local` points at the development branch",
  "Verify Auth provider redirect URLs",
  "Verify Storage bucket policy and object behavior",
  "Verify Edge Function secrets and Telegram settings",
  "Run `pnpm check:supabase-cli`",
  "Run `pnpm exec supabase db push --dry-run`",
  "Apply migrations to the development branch only after dry-run review",
  "Generate and review TypeScript types",
  "Run `pnpm check:supabase-contract`",
  "Decide whether production promotion will use reviewed migrations, Supabase branch merge, or GitHub integration.",
  "Update deployment docs when the development branch workflow is actually activated.",
];

const requiredCommands = [
  "pnpm exec supabase branches create dev --persistent --project-ref <production-ref>",
  "pnpm exec supabase branches list --project-ref <production-ref>",
  "pnpm exec supabase link --project-ref <development-branch-ref>",
  "pnpm exec supabase db push --dry-run",
];

function requireIncludes(content, phrase, label) {
  if (!content.includes(phrase)) {
    throw new Error(`${label} is missing required phrase: ${phrase}`);
  }
}

function requireSection(sections, title) {
  if (!sections.has(title)) {
    throw new Error(`docs/supabase-branching.md is missing section: ${title}`);
  }
}

function requireCheckbox(content, phrase) {
  const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^- \\[ \\] .*${escapedPhrase}`, "m");

  if (!pattern.test(content)) {
    throw new Error(`docs/supabase-branching.md is missing preparation task: ${phrase}`);
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

export function checkSupabaseBranchingContent(content) {
  const sections = extractMarkdownSections(content);

  for (const section of requiredSections) {
    requireSection(sections, section);
  }

  for (const phrase of requiredPhrases) {
    requireIncludes(content, phrase, "docs/supabase-branching.md");
  }

  for (const checkbox of requiredCheckboxes) {
    requireCheckbox(sections.get("Preparation Tasks"), checkbox);
  }

  for (const command of requiredCommands) {
    requireIncludes(sections.get("Recommended Workflow"), command, "docs/supabase-branching.md");
  }
}

export async function main() {
  const content = await readFile(runbookPath, "utf8");
  checkSupabaseBranchingContent(content);
  console.log("Supabase branching runbook check passed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
