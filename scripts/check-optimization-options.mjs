import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const optimizationOptionsPath = path.join(root, "docs", "optimization-options.md");

const requiredSections = [
  "How To Record Ideas",
  "Active Goal Candidates",
  "Product Model",
  "Media",
  "User And Admin Workflows",
  "App Experience",
  "Operations",
  "Developer Experience",
  "Deferred Until Explicit Decision",
  "Questions Waiting For User",
  "Hyperoptimum Reminder",
];

const roadmapSections = [
  "Active Goal Candidates",
  "Product Model",
  "Media",
  "User And Admin Workflows",
  "App Experience",
  "Operations",
  "Developer Experience",
];

function bulletLines(sectionBody) {
  return sectionBody
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "));
}

export function extractSections(content) {
  const sections = new Map();
  const headings = [...content.matchAll(/^##\s+(.+)$/gm)];

  for (const [index, heading] of headings.entries()) {
    const title = heading[1].trim();
    const bodyStart = heading.index + heading[0].length;
    const nextHeading = headings[index + 1];
    const bodyEnd = nextHeading ? nextHeading.index : content.length;
    sections.set(title, content.slice(bodyStart, bodyEnd).trim());
  }

  return sections;
}

export function checkOptimizationOptionsContent(content) {
  const sections = extractSections(content);

  for (const section of requiredSections) {
    if (!sections.has(section)) {
      throw new Error(`docs/optimization-options.md is missing required section: ${section}`);
    }
  }

  for (const section of roadmapSections) {
    const entries = bulletLines(sections.get(section) || "");
    if (entries.length === 0) {
      throw new Error(`${section} must contain at least one roadmap entry.`);
    }

    for (const entry of entries) {
      if (!entry.includes("Impact:")) {
        throw new Error(`${section} roadmap entry must include Impact:: ${entry}`);
      }
    }
  }

  const deferredEntries = bulletLines(sections.get("Deferred Until Explicit Decision") || "");
  if (deferredEntries.length === 0) {
    throw new Error("Deferred Until Explicit Decision must contain at least one anti-roadmap entry.");
  }

  const questions = bulletLines(sections.get("Questions Waiting For User") || "");
  if (questions.length === 0) {
    throw new Error("Questions Waiting For User must contain at least one question.");
  }

  for (const question of questions) {
    if (!question.endsWith("?")) {
      throw new Error(`Questions Waiting For User entries must end with a question mark: ${question}`);
    }
  }
}

export async function main() {
  const content = await readFile(optimizationOptionsPath, "utf8");
  checkOptimizationOptionsContent(content);
  console.log("Optimization options check passed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
