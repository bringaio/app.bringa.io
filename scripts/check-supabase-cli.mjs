import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredReadmePhrases = [
  "repo-local dev dependency",
  "pnpm exec supabase start",
  "pnpm exec supabase status",
  "pnpm exec supabase status -o env",
];

const requiredBranchingPhrases = [
  "repo-local Supabase CLI",
  "pnpm exec supabase branches create dev --persistent --project-ref <production-ref>",
  "pnpm exec supabase branches list --project-ref <production-ref>",
  "pnpm exec supabase link --project-ref <development-branch-ref>",
  "pnpm exec supabase db push --dry-run",
  "SUPABASE_ACCESS_TOKEN",
];

const requiredMcpPhrases = [
  "repo-local CLI",
  "pnpm exec supabase branches list --project-ref <production-ref>",
  "SUPABASE_ACCESS_TOKEN",
];

function requireIncludes(content, phrase, label) {
  if (!content.includes(phrase)) {
    throw new Error(`${label} is missing required phrase: ${phrase}`);
  }
}

function checkCliVersionResult(result) {
  const stdout = String(result?.stdout || "").trim();
  const stderr = String(result?.stderr || "").trim();

  if (result?.status !== 0 || !/\d+\.\d+\.\d+/.test(stdout)) {
    const detail = stderr ? ` ${stderr}` : "";
    throw new Error(`Supabase CLI version check failed.${detail}`);
  }
}

export function checkSupabaseCliContract({
  packageJson,
  readmeMarkdown,
  branchingMarkdown,
  mcpMarkdown,
  cliVersionResult,
}) {
  const parsedPackage = JSON.parse(packageJson);

  if (!parsedPackage.devDependencies?.supabase) {
    throw new Error("package.json is missing devDependency: supabase");
  }

  for (const phrase of requiredReadmePhrases) {
    requireIncludes(readmeMarkdown, phrase, "README.md");
  }

  for (const phrase of requiredBranchingPhrases) {
    requireIncludes(branchingMarkdown, phrase, "docs/supabase-branching.md");
  }

  for (const phrase of requiredMcpPhrases) {
    requireIncludes(mcpMarkdown, phrase, "docs/supabase-mcp.md");
  }

  if (cliVersionResult) {
    checkCliVersionResult(cliVersionResult);
  }
}

export async function main() {
  const [packageJson, readmeMarkdown, branchingMarkdown, mcpMarkdown] = await Promise.all([
    readFile(path.join(root, "package.json"), "utf8"),
    readFile(path.join(root, "README.md"), "utf8"),
    readFile(path.join(root, "docs", "supabase-branching.md"), "utf8"),
    readFile(path.join(root, "docs", "supabase-mcp.md"), "utf8"),
  ]);

  checkSupabaseCliContract({
    packageJson,
    readmeMarkdown,
    branchingMarkdown,
    mcpMarkdown,
    cliVersionResult: spawnSync("pnpm", ["exec", "supabase", "--version"], {
      cwd: root,
      encoding: "utf8",
    }),
  });

  console.log("Supabase CLI contract check passed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
