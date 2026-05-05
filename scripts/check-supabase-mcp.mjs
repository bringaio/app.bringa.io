import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runbookPath = path.join(root, "docs", "supabase-mcp.md");
const skillPath = path.join(root, ".agents", "skills", "supabase-mcp", "SKILL.md");

const requiredSections = [
  "Current Documentation Signals",
  "Target Project",
  "Agent Workflow",
  "Service Role And Secret Keys",
  "Local Handoff",
];

const requiredRunbookPhrases = [
  "2026-05-05 official Supabase MCP docs",
  "https://mcp.supabase.com/mcp",
  "Dynamic OAuth is the default",
  "personal access tokens are no longer required",
  "project_ref=<project-ref>",
  "read_only=true",
  "features=database,docs",
  "development or test projects",
  "storage",
  "Account management tools",
  "create_project",
  "get_project_url",
  "get_publishable_keys",
  "not a server-side key handoff",
  "Do not use MCP or chat to retrieve, reveal, or transmit secret or service-role keys.",
  "Storage tools are disabled by default",
  "publishable keys for public browser clients",
  "secret keys over legacy service_role keys",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "sb_secret_",
  "app.bringa.io",
  "bringa",
  "contekt-bringa-io",
  "Do not delete or pause any contekt project without a separate explicit confirmation",
  "List organizations and projects without reading real row contents.",
  "Use the existing `app.bringa.io` project when MCP lists it. If it is missing, create it only after checking project capacity and cost confirmation.",
  "Add feature groups narrowly for the task",
  "Ask before reading real user rows.",
  "separate non-read-only MCP configuration",
  "Settings > API Keys > Legacy API Keys",
  "GET /v1/projects/{ref}/api-keys",
  "Store local maintenance keys only in .env.local or an approved local secret store.",
  "public-browser-config helpers only",
  "supabase.url and supabase.publishableKey",
  "pnpm check:supabase-maintenance-key",
  "pnpm backup:supabase",
];

const requiredSkillPhrases = [
  "docs/supabase-mcp.md",
  "project_ref=<project-ref>",
  "read_only=true",
  "app.bringa.io",
  "Never read real user rows without explicit approval.",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "sb_secret_",
  "Do not delete or pause contekt projects without separate explicit confirmation.",
];

function extractMarkdownSections(content) {
  const sections = new Set();
  for (const match of content.matchAll(/^##\s+(.+)$/gm)) {
    sections.add(match[1].trim());
  }
  return sections;
}

function requireIncludes(content, phrase, label) {
  if (!content.includes(phrase)) {
    throw new Error(`${label} is missing required phrase: ${phrase}`);
  }
}

export function checkSupabaseMcpContent(content) {
  const sections = extractMarkdownSections(content);

  for (const section of requiredSections) {
    if (!sections.has(section)) {
      throw new Error(`docs/supabase-mcp.md is missing required section: ${section}`);
    }
  }

  for (const phrase of requiredRunbookPhrases) {
    requireIncludes(content, phrase, "docs/supabase-mcp.md");
  }
}

export function checkSupabaseMcpSkillContent(content) {
  for (const phrase of requiredSkillPhrases) {
    requireIncludes(content, phrase, ".agents/skills/supabase-mcp/SKILL.md");
  }
}

export async function main() {
  checkSupabaseMcpContent(await readFile(runbookPath, "utf8"));
  checkSupabaseMcpSkillContent(await readFile(skillPath, "utf8"));
  console.log("Supabase MCP runbook check passed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
