import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const observabilityPath = path.join(root, "docs", "observability.md");

const requiredSections = [
  "Scope",
  "Privacy Boundaries",
  "Current Signals",
  "Failure Triage",
  "Live Setup Tasks",
  "Known Gaps",
];

const requiredPhrases = [
  "privacy-preserving observability",
  "Do not log Supabase secret keys, service-role keys, access tokens, provider secrets, private URLs, personal data, or real row contents.",
  "Do not paste screenshots, logs, or row contents containing personal data into chat, issues, docs, or AI prompts.",
  "Prefer counts, ids only when necessary, status fields, timestamps, and anonymized metadata.",
  "Ask for explicit approval before inspecting real Supabase row contents.",
  "Admin dashboard system health",
  "`backup_runs`",
  "`notification_events`",
  "`notification_mutes`",
  "`record_notification_delivery`",
  "Edge Function logs",
  "Supabase dashboard or CLI logs require approved access.",
  "Supabase dashboard Invocations can show request and response data, including headers and body.",
  "Supabase Logs Explorer can query auth_logs, edge_logs, function_edge_logs, function_logs, postgres_logs, realtime_logs, and storage_logs.",
  "No third-party error reporting service is configured by default.",
  "Choose a privacy-preserving error reporting tool only after explicit decision.",
  "Live Supabase health checks require approved project access.",
  "Browser evidence belongs in `docs/browser-testing.md`.",
];

const requiredTasks = [
  "- [ ] Choose whether any external error-reporting service is necessary.",
  "- [ ] Define retention and access rules for logs and screenshots.",
  "- [ ] Verify Supabase Edge Function logs with approved access.",
  "- [ ] Verify live Supabase health checks with approved project access.",
  "- [ ] Verify live backup freshness and restore drill evidence.",
  "- [ ] Verify notification retry handling with operator-approved Telegram settings.",
  "- [ ] Document any deployment-specific observability tools outside committed secrets.",
];

function requireIncludes(content, phrase, label) {
  if (!content.includes(phrase)) {
    throw new Error(`${label} is missing required phrase: ${phrase}`);
  }
}

function requireSection(sections, title) {
  if (!sections.has(title)) {
    throw new Error(`docs/observability.md is missing section: ${title}`);
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

export function checkObservabilityContent(content) {
  const sections = extractMarkdownSections(content);

  for (const section of requiredSections) {
    requireSection(sections, section);
  }

  for (const phrase of requiredPhrases) {
    requireIncludes(content, phrase, "docs/observability.md");
  }

  const liveTasks = sections.get("Live Setup Tasks") || "";
  for (const task of requiredTasks) {
    requireIncludes(liveTasks, task, "docs/observability.md");
  }
}

export async function main() {
  const content = await readFile(observabilityPath, "utf8");
  checkObservabilityContent(content);
  console.log("Observability runbook check passed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
