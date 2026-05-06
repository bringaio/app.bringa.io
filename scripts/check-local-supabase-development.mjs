import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredDocsPhrases = [
  "Use the local Supabase CLI stack as the default backend development path",
  "free-account-oriented forks",
  "database migrations and schema resets",
  "RLS, RPC, trigger, and Storage policy testing",
  "local Auth sign-up/sign-in behavior",
  "local Storage buckets and object uploads",
  "local Edge Function serving",
  "Supabase Branching remains useful for paid teams",
  "not the default path for forks that target free Supabase accounts",
  "Do not create a separate `app.bringa.io_dev` project by default",
  "pnpm exec supabase start",
  "pnpm exec supabase status -o env",
  "pnpm setup:local-supabase",
  "pnpm doctor:local-supabase",
  "BRINGA_CONFIG_INCLUDE_LOCAL=true pnpm dev",
  "pnpm seed:local-supabase",
  "The script only accepts localhost Supabase URLs.",
  "admin@bringa.local",
  "member@bringa.local",
  "pnpm exec supabase db reset",
  "What Local Supabase Does Not Prove",
];

const requiredReadmePhrases = [
  "Local Supabase Development",
  "pnpm setup:local-supabase",
  "pnpm doctor:local-supabase",
  "Use the local Supabase stack as the default backend path for schema, RLS, RPC, Auth, Storage, and Edge Function work.",
];

const requiredSupabasePhrases = [
  "Local Supabase Development",
  "Supabase Branching is optional for paid remote preview, staging, or QA workflows",
];

const requiredForkingPhrases = [
  "For free-account-oriented forks, prefer the local Supabase CLI stack over Supabase Branching or a second hosted dev project.",
  "pnpm setup:local-supabase",
  "pnpm doctor:local-supabase",
];

const requiredBranchingPhrases = [
  "not the default development path for free-account-oriented forks",
  "use [Local Supabase Development](local-supabase-development.md) first",
];

function requireIncludes(content, phrase, label) {
  if (!content.includes(phrase)) {
    throw new Error(`${label} is missing required phrase: ${phrase}`);
  }
}

export function checkLocalSupabaseDevelopmentContent({
  localSupabaseMarkdown,
  readmeMarkdown,
  supabaseMarkdown,
  forkingMarkdown,
  branchingMarkdown,
  packageJson,
}) {
  for (const phrase of requiredDocsPhrases) {
    requireIncludes(localSupabaseMarkdown, phrase, "docs/local-supabase-development.md");
  }

  for (const phrase of requiredReadmePhrases) {
    requireIncludes(readmeMarkdown, phrase, "README.md");
  }

  for (const phrase of requiredSupabasePhrases) {
    requireIncludes(supabaseMarkdown, phrase, "docs/supabase.md");
  }

  for (const phrase of requiredForkingPhrases) {
    requireIncludes(forkingMarkdown, phrase, "docs/forking.md");
  }

  for (const phrase of requiredBranchingPhrases) {
    requireIncludes(branchingMarkdown, phrase, "docs/supabase-branching.md");
  }

  const scripts = JSON.parse(packageJson).scripts || {};
  if (!scripts["seed:local-supabase"]) {
    throw new Error("package.json is missing script: seed:local-supabase");
  }
  if (!scripts["setup:local-supabase"]) {
    throw new Error("package.json is missing script: setup:local-supabase");
  }
  if (!scripts["doctor:local-supabase"]) {
    throw new Error("package.json is missing script: doctor:local-supabase");
  }
}

export async function main() {
  const [
    localSupabaseMarkdown,
    readmeMarkdown,
    supabaseMarkdown,
    forkingMarkdown,
    branchingMarkdown,
    packageJson,
  ] = await Promise.all([
    readFile(path.join(root, "docs", "local-supabase-development.md"), "utf8"),
    readFile(path.join(root, "README.md"), "utf8"),
    readFile(path.join(root, "docs", "supabase.md"), "utf8"),
    readFile(path.join(root, "docs", "forking.md"), "utf8"),
    readFile(path.join(root, "docs", "supabase-branching.md"), "utf8"),
    readFile(path.join(root, "package.json"), "utf8"),
  ]);

  checkLocalSupabaseDevelopmentContent({
    localSupabaseMarkdown,
    readmeMarkdown,
    supabaseMarkdown,
    forkingMarkdown,
    branchingMarkdown,
    packageJson,
  });
  console.log("Local Supabase development check passed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
