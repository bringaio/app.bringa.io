import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runbookPath = path.join(root, "docs", "restore-drills.md");

const requiredSections = [
  "Scope",
  "Current Documentation Signals",
  "Required Evidence",
  "Drill Workflow",
  "Retention And Encryption",
  "Known Gaps",
];

const requiredPhrases = [
  "2026-05-05 Context7 review",
  "pnpm verify:backup <backup-directory>` only proves local backup file integrity",
  "Do not restore into production unless the exact production rollback plan is approved.",
  "non-production Supabase project, development branch, or local Supabase target",
  "Do not inspect real row contents without explicit approval.",
  "database backups and Point-in-Time Recovery are database restore surfaces",
  "Free Plan projects may not provide downloadable database backups",
  "Storage object backup and restore are separate from database backups",
  "Auth metadata exports are not complete Auth restore packages",
  "Storage objects must be restored through the Storage API",
  "pnpm backup:supabase",
  "pnpm verify:backup <backup-directory>",
  "without treating it as account restore",
  "Backup directories must stay out of git and public artifacts.",
  "encrypted volume or in an encrypted archive",
  "Keep service-role keys, Management API tokens, and provider secrets out of evidence files.",
  "No live restore drill has been completed with approved Supabase access.",
  "No project-specific encrypted retention policy has been approved.",
  "Auth restore remains reconciliation-only",
];

const requiredEvidence = [
  "Target project or branch and source project are recorded outside git.",
  "Backup directory path and `pnpm verify:backup <backup-directory>` output are recorded.",
  "Table counts, Storage object counts, byte totals, and optional Auth metadata counts are recorded.",
  "Data access boundary is recorded; default is no real row inspection.",
  "Restore method is recorded for database, Storage, and Auth metadata reconciliation.",
  "Encrypted-at-rest location or encrypted archive method is recorded.",
  "Retention period and deletion date are recorded.",
  "Drill target cleanup or rollback is recorded.",
  "Exceptions and follow-up tasks are recorded.",
];

function requireIncludes(content, phrase, label) {
  if (!content.includes(phrase)) {
    throw new Error(`${label} is missing required phrase: ${phrase}`);
  }
}

function requireSection(sections, title) {
  if (!sections.has(title)) {
    throw new Error(`docs/restore-drills.md is missing section: ${title}`);
  }
}

function requireCheckbox(content, phrase) {
  const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^- \\[ \\] .*${escapedPhrase}`, "m");

  if (!pattern.test(content)) {
    throw new Error(`docs/restore-drills.md is missing evidence item: ${phrase}`);
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

export function checkRestoreDrillsContent(content) {
  const sections = extractMarkdownSections(content);

  for (const section of requiredSections) {
    requireSection(sections, section);
  }

  for (const phrase of requiredPhrases) {
    requireIncludes(content, phrase, "docs/restore-drills.md");
  }

  for (const evidence of requiredEvidence) {
    requireCheckbox(sections.get("Required Evidence"), evidence);
  }
}

export async function main() {
  const content = await readFile(runbookPath, "utf8");
  checkRestoreDrillsContent(content);
  console.log("Restore drill runbook check passed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
