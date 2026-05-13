/**
 * Checks that browser testing runbooks and agentic browser skill guidance stay aligned.
 *
 * Source of truth: Browser testing docs and `.agents/skills/agentic-browser-testing/`.
 * Side effects: None beyond CLI output and exit status.
 *
 * @module scripts/check-browser-testing
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runbookPath = path.join(root, "docs", "browser-testing.md");
const skillPath = path.join(root, ".agents", "skills", "agentic-browser-testing", "SKILL.md");

const requiredRunbookSections = [
  "Scope",
  "Dev Server Startup",
  "Baseline Routes",
  "Responsive And Accessibility Pass",
  "PWA Pass",
  "Reporting",
];

const requiredRunbookPhrases = [
  ".agents/skills/agentic-browser-testing/SKILL.md",
  "Do not use production user data unless the exact scenario and data category have been approved.",
  "Before starting `pnpm dev`, `pnpm dev:docker`, `pnpm exec next dev`, or a static preview server, check whether a suitable server is already listening.",
  "lsof -nP -iTCP:3000 -sTCP:LISTEN",
  "Stop only the server process started for the current task",
  "/login",
  "/invite",
  "/dashboard",
  "/items/create",
  "/items/edit",
  "/items/details",
  "/settings",
  "/admin/dashboard",
  "/admin/users",
  "/admin/user-items",
  "/admin/moderation",
  "/admin/item-versions",
  "/admin/deletion-requests",
  "/admin/notifications",
  "375x812",
  "768x1024",
  "1440x900",
  "keyboard-only navigation",
  "light and dark themes",
  "/manifest.webmanifest",
  "expected result, actual result, and evidence",
];

const requiredSkillSections = [
  "Dev Server Startup",
  "Tool Choice",
  "Baseline Scenarios",
  "Scenario Sets",
  "Role Matrix",
  "Data Guidance",
  "Expected Reporting",
];

const requiredScenarioHeadings = [
  "Mobile Item Browsing",
  "Borrowed-First Dashboard",
  "User Item Visibility",
  "Create And Edit Image Preview",
  "Admin Dashboard And User Item Views",
  "Moderation Queue",
  "Invite And Unvalidated User",
  "PWA Installed Flow",
  "Long Content And Empty States",
];

const requiredSkillPhrases = [
  "Do not add Playwright",
  "docs/browser-testing.md",
  "Before starting `pnpm dev`, `pnpm dev:docker`, `pnpm exec next dev`, or a static preview server, check whether a suitable server is already listening.",
  "lsof -nP -iTCP:3000 -sTCP:LISTEN",
  "Stop only the server process started for the current task.",
  "Do not use production user data unless the user approves the exact scenario.",
  "viewport, role, route, action, expected result, actual result",
];

function requireIncludes(content, phrase, label) {
  if (!content.includes(phrase)) {
    throw new Error(`${label} is missing required phrase: ${phrase}`);
  }
}

function requireHeading(headings, level, title, label) {
  if (!headings.some((heading) => heading.level === level && heading.title === title)) {
    throw new Error(`${label} is missing heading: ${title}`);
  }
}

export function extractMarkdownHeadings(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.match(/^(#{1,6})\s+(.+)$/))
    .filter(Boolean)
    .map((match) => ({
      level: match[1].length,
      title: match[2].trim(),
    }));
}

export function checkBrowserTestingContent({ runbook, skill }) {
  const runbookHeadings = extractMarkdownHeadings(runbook);
  const skillHeadings = extractMarkdownHeadings(skill);

  for (const section of requiredRunbookSections) {
    requireHeading(runbookHeadings, 2, section, "docs/browser-testing.md");
  }

  for (const phrase of requiredRunbookPhrases) {
    requireIncludes(runbook, phrase, "docs/browser-testing.md");
  }

  for (const section of requiredSkillSections) {
    requireHeading(skillHeadings, 2, section, ".agents/skills/agentic-browser-testing/SKILL.md");
  }

  for (const scenario of requiredScenarioHeadings) {
    if (!skillHeadings.some((heading) => heading.level === 3 && heading.title === scenario)) {
      throw new Error(`.agents/skills/agentic-browser-testing/SKILL.md is missing scenario heading: ${scenario}`);
    }
  }

  for (const phrase of requiredSkillPhrases) {
    requireIncludes(skill, phrase, ".agents/skills/agentic-browser-testing/SKILL.md");
  }
}

export async function main() {
  const [runbook, skill] = await Promise.all([
    readFile(runbookPath, "utf8"),
    readFile(skillPath, "utf8"),
  ]);

  checkBrowserTestingContent({ runbook, skill });
  console.log("Browser testing scenario check passed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
