import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const baselineCommands = [
  "pnpm check:secrets",
  "pnpm check:env-example",
  "pnpm check:config",
  "pnpm check:supabase-contract",
  "pnpm check:supabase-cli",
  "pnpm check:edge-functions",
  "pnpm lint",
  "pnpm exec tsc --noEmit",
  "pnpm build",
];

const requiredPackageScripts = [
  "check:secrets",
  "check:env-example",
  "check:config",
  "check:supabase-contract",
  "check:supabase-cli",
  "check:edge-functions",
  "check:github-workflows",
  "check:security-maintenance",
  "lint",
  "build",
];

const requiredSkillPhrases = [
  "repeatable evidence workflow",
  "pnpm check:security-maintenance",
  "Supabase security and performance advisors",
  "repo-local Supabase CLI contract result",
  "restore-drill or backup evidence",
  "browser evidence",
  "Passing local checks is not enough",
];

const requiredSecurityPhrases = [
  ".agents/skills/security-maintenance/",
  "pnpm check:security-maintenance",
  "Passing local checks is not enough",
  "Supabase security and performance advisor output",
  "repo-local Supabase CLI contract evidence",
  "Edge Function log review without copying personal data",
  "Auth log review after provider and redirect configuration",
  "browser evidence",
];

const requiredMaintenancePhrases = [
  "Treat the command list as a floor, not a proof by itself",
  "pnpm check:supabase-cli",
  "pnpm check:supabase-contract",
  "pnpm check:github-workflows",
  "pnpm check:static-export",
];

const requiredOptimizationPhrases = [
  "Security evidence automation",
  "pnpm check:security-maintenance",
  "avoid hiding live advisor, browser, backup, or restore-drill decisions behind a green local-only proxy",
  "Static-host security headers",
  "Abuse controls",
];

function requireIncludes(content, phrase, label) {
  if (!content.includes(phrase)) {
    throw new Error(`${label} is missing required phrase: ${phrase}`);
  }
}

function requireCommands(content, label) {
  for (const command of baselineCommands) {
    requireIncludes(content, command, label);
  }
}

function requirePackageScripts(packageJson) {
  const scripts = JSON.parse(packageJson).scripts || {};

  for (const scriptName of requiredPackageScripts) {
    if (!scripts[scriptName]) {
      throw new Error(`package.json is missing script: ${scriptName}`);
    }
  }
}

export function checkSecurityMaintenanceContract({
  packageJson,
  skillMarkdown,
  securityMarkdown,
  maintenanceMarkdown,
  optimizationMarkdown,
}) {
  requirePackageScripts(packageJson);
  requireCommands(skillMarkdown, ".agents/skills/security-maintenance/SKILL.md");
  requireCommands(securityMarkdown, "docs/security.md");

  for (const phrase of requiredSkillPhrases) {
    requireIncludes(skillMarkdown, phrase, ".agents/skills/security-maintenance/SKILL.md");
  }

  for (const phrase of requiredSecurityPhrases) {
    requireIncludes(securityMarkdown, phrase, "docs/security.md");
  }

  for (const phrase of requiredMaintenancePhrases) {
    requireIncludes(maintenanceMarkdown, phrase, "docs/maintenance.md");
  }

  for (const phrase of requiredOptimizationPhrases) {
    requireIncludes(optimizationMarkdown, phrase, "docs/optimization-options.md");
  }
}

export async function main() {
  const [packageJson, skillMarkdown, securityMarkdown, maintenanceMarkdown, optimizationMarkdown] = await Promise.all([
    readFile(path.join(root, "package.json"), "utf8"),
    readFile(path.join(root, ".agents", "skills", "security-maintenance", "SKILL.md"), "utf8"),
    readFile(path.join(root, "docs", "security.md"), "utf8"),
    readFile(path.join(root, "docs", "maintenance.md"), "utf8"),
    readFile(path.join(root, "docs", "optimization-options.md"), "utf8"),
  ]);

  checkSecurityMaintenanceContract({
    packageJson,
    skillMarkdown,
    securityMarkdown,
    maintenanceMarkdown,
    optimizationMarkdown,
  });

  console.log("Security maintenance contract check passed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
