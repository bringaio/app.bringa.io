import assert from "node:assert/strict";
import test from "node:test";

import { checkLocalSupabaseDevelopmentContent } from "./check-local-supabase-development.mjs";

const validLocalSupabaseMarkdown = `
# Local Supabase Development

Use the local Supabase CLI stack as the default backend development path for free-account-oriented forks.

- database migrations and schema resets
- RLS, RPC, trigger, and Storage policy testing
- local Auth sign-up/sign-in behavior
- local Storage buckets and object uploads
- local Edge Function serving

Supabase Branching remains useful for paid teams and is not the default path for forks that target free Supabase accounts.
Do not create a separate \`app.bringa.io_dev\` project by default.

\`pnpm exec supabase start\`
\`pnpm exec supabase status -o env\`
\`pnpm setup:local-supabase\`
\`pnpm doctor:local-supabase\`
\`BRINGA_CONFIG_INCLUDE_LOCAL=true pnpm dev\`
\`pnpm seed:local-supabase\`
The script only accepts localhost Supabase URLs.
admin@bringa.local
member@bringa.local
\`pnpm exec supabase db reset\`
What Local Supabase Does Not Prove
`;

const validReadme = `
[Local Supabase Development](docs/local-supabase-development.md)
Use the local Supabase stack as the default backend path for schema, RLS, RPC, Auth, Storage, and Edge Function work.
\`pnpm setup:local-supabase\`
\`pnpm doctor:local-supabase\`
`;

const validSupabase = `
[Local Supabase Development](local-supabase-development.md)
Supabase Branching is optional for paid remote preview, staging, or QA workflows
`;

const validForking = `
For free-account-oriented forks, prefer the local Supabase CLI stack over Supabase Branching or a second hosted dev project.
\`pnpm setup:local-supabase\`
\`pnpm doctor:local-supabase\`
`;

const validBranching = `
Supabase Branching is not the default development path for free-account-oriented forks; use [Local Supabase Development](local-supabase-development.md) first.
`;

const validPackageJson = JSON.stringify({
  scripts: {
    "setup:local-supabase": "node scripts/setup-local-supabase.mjs",
    "seed:local-supabase": "node scripts/seed-local-supabase.mjs",
    "doctor:local-supabase": "node scripts/doctor-local-supabase.mjs",
  },
});

test("accepts local Supabase development docs and seed script contract", () => {
  assert.doesNotThrow(() => checkLocalSupabaseDevelopmentContent({
    localSupabaseMarkdown: validLocalSupabaseMarkdown,
    readmeMarkdown: validReadme,
    supabaseMarkdown: validSupabase,
    forkingMarkdown: validForking,
    branchingMarkdown: validBranching,
    packageJson: validPackageJson,
  }));
});

test("requires the localhost-only seed script warning", () => {
  assert.throws(
    () => checkLocalSupabaseDevelopmentContent({
      localSupabaseMarkdown: validLocalSupabaseMarkdown.replace("The script only accepts localhost Supabase URLs.", ""),
      readmeMarkdown: validReadme,
      supabaseMarkdown: validSupabase,
      forkingMarkdown: validForking,
      branchingMarkdown: validBranching,
      packageJson: validPackageJson,
    }),
    /localhost Supabase URLs/,
  );
});

test("requires the seed script package command", () => {
  assert.throws(
    () => checkLocalSupabaseDevelopmentContent({
      localSupabaseMarkdown: validLocalSupabaseMarkdown,
      readmeMarkdown: validReadme,
      supabaseMarkdown: validSupabase,
      forkingMarkdown: validForking,
      branchingMarkdown: validBranching,
      packageJson: JSON.stringify({ scripts: {} }),
    }),
    /seed:local-supabase/,
  );
});

test("requires the local setup package command", () => {
  assert.throws(
    () => checkLocalSupabaseDevelopmentContent({
      localSupabaseMarkdown: validLocalSupabaseMarkdown,
      readmeMarkdown: validReadme,
      supabaseMarkdown: validSupabase,
      forkingMarkdown: validForking,
      branchingMarkdown: validBranching,
      packageJson: JSON.stringify({
        scripts: {
          "seed:local-supabase": "node scripts/seed-local-supabase.mjs",
        },
      }),
    }),
    /setup:local-supabase/,
  );
});

test("requires the local doctor package command", () => {
  assert.throws(
    () => checkLocalSupabaseDevelopmentContent({
      localSupabaseMarkdown: validLocalSupabaseMarkdown,
      readmeMarkdown: validReadme,
      supabaseMarkdown: validSupabase,
      forkingMarkdown: validForking,
      branchingMarkdown: validBranching,
      packageJson: JSON.stringify({
        scripts: {
          "setup:local-supabase": "node scripts/setup-local-supabase.mjs",
          "seed:local-supabase": "node scripts/seed-local-supabase.mjs",
        },
      }),
    }),
    /doctor:local-supabase/,
  );
});
