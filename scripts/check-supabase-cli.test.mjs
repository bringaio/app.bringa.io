import assert from "node:assert/strict";
import test from "node:test";

import { checkSupabaseCliContract } from "./check-supabase-cli.mjs";

const validPackageJson = JSON.stringify({
  devDependencies: {
    supabase: "^2.98.2",
  },
});

const validReadme = `
# bringa.io

The Supabase CLI is installed as a repo-local dev dependency. Use \`pnpm exec supabase ...\` for local and remote Supabase commands; a bare global \`supabase\` binary is optional.

\`\`\`bash
pnpm exec supabase start
pnpm exec supabase status
pnpm exec supabase status -o env
\`\`\`
`;

const validBranchingRunbook = `
# Supabase Branching

Use the repo-local Supabase CLI with \`pnpm exec supabase ...\` so forks and agents do not depend on a global CLI install.
Remote branch commands require \`supabase login\` or \`SUPABASE_ACCESS_TOKEN\`; keep access tokens outside Git and chat.

\`\`\`bash
pnpm exec supabase branches create dev --persistent --project-ref <production-ref>
pnpm exec supabase branches list --project-ref <production-ref>
pnpm exec supabase link --project-ref <development-branch-ref>
pnpm exec supabase db push --dry-run
\`\`\`
`;

const validMcpRunbook = `
# Supabase MCP Agent Setup

When MCP branch tooling fails, use the repo-local CLI after \`pnpm install\`:

\`\`\`bash
pnpm exec supabase branches list --project-ref <production-ref>
\`\`\`

The command requires \`supabase login\` or \`SUPABASE_ACCESS_TOKEN\`; do not commit or paste the token.
`;

test("accepts the repo-local Supabase CLI contract", () => {
  assert.doesNotThrow(() => checkSupabaseCliContract({
    packageJson: validPackageJson,
    readmeMarkdown: validReadme,
    branchingMarkdown: validBranchingRunbook,
    mcpMarkdown: validMcpRunbook,
    cliVersionResult: {
      status: 0,
      stdout: "2.98.2\n",
      stderr: "",
    },
  }));
});

test("requires the Supabase CLI as a dev dependency", () => {
  assert.throws(
    () => checkSupabaseCliContract({
      packageJson: JSON.stringify({ dependencies: { supabase: "^2.98.2" } }),
      readmeMarkdown: validReadme,
      branchingMarkdown: validBranchingRunbook,
      mcpMarkdown: validMcpRunbook,
    }),
    /devDependency: supabase/,
  );
});

test("rejects global-only Supabase CLI docs", () => {
  assert.throws(
    () => checkSupabaseCliContract({
      packageJson: validPackageJson,
      readmeMarkdown: validReadme.replace("pnpm exec supabase start", "supabase start"),
      branchingMarkdown: validBranchingRunbook,
      mcpMarkdown: validMcpRunbook,
    }),
    /README\.md.*pnpm exec supabase start/,
  );

  assert.throws(
    () => checkSupabaseCliContract({
      packageJson: validPackageJson,
      readmeMarkdown: validReadme,
      branchingMarkdown: validBranchingRunbook.replace(
        "pnpm exec supabase branches list --project-ref <production-ref>",
        "supabase branches list --project-ref <production-ref>",
      ),
      mcpMarkdown: validMcpRunbook,
    }),
    /docs\/supabase-branching\.md.*pnpm exec supabase branches list/,
  );
});

test("requires a working repo-local CLI version check when supplied", () => {
  assert.throws(
    () => checkSupabaseCliContract({
      packageJson: validPackageJson,
      readmeMarkdown: validReadme,
      branchingMarkdown: validBranchingRunbook,
      mcpMarkdown: validMcpRunbook,
      cliVersionResult: {
        status: 1,
        stdout: "",
        stderr: "command failed",
      },
    }),
    /Supabase CLI version check failed/,
  );
});
