import assert from "node:assert/strict";
import test from "node:test";

import { checkSecurityMaintenanceContract } from "./check-security-maintenance.mjs";

const validPackageJson = JSON.stringify({
  scripts: {
    "check:secrets": "node scripts/check-secrets.mjs",
    "check:env-example": "node scripts/check-env-example.mjs",
    "check:config": "node scripts/generate-config.mjs --check",
    "check:supabase-contract": "node scripts/check-supabase-contract.mjs",
    "check:supabase-cli": "node scripts/check-supabase-cli.mjs",
    "check:edge-functions": "deno check ...",
    "check:github-workflows": "node scripts/check-github-workflows.mjs",
    "check:security-maintenance": "node scripts/check-security-maintenance.mjs",
    lint: "eslint",
    build: "next build",
  },
});

const baselineCommands = `
pnpm check:secrets
pnpm check:env-example
pnpm check:config
pnpm check:supabase-contract
pnpm check:supabase-cli
pnpm check:edge-functions
pnpm lint
pnpm exec tsc --noEmit
pnpm build
`;

const validSkill = `
# Security Maintenance

Treat security maintenance as a repeatable evidence workflow, not a vibe check.

${baselineCommands}

Run \`pnpm check:security-maintenance\` after changing security docs, maintenance skills, release evidence, or workflow guardrails.

Passing local checks is not enough for production readiness.

- Run Supabase security and performance advisors after schema/policy/function changes when MCP or dashboard access is available.
- repo-local Supabase CLI contract result when branch or CLI workflow changed;
- restore-drill or backup evidence when data safety is part of the claim;
- browser evidence for auth, admin, settings, upload, responsive, and PWA flows when UI behavior changed.
`;

const validSecurityDoc = `
# Security

Use .agents/skills/security-maintenance/ after dependency upgrades, Supabase schema or policy changes, Edge Function changes, Auth changes, deployment workflow changes, or before release-readiness claims.

${baselineCommands}
pnpm check:security-maintenance

Passing local checks is not enough for a production-readiness claim unless those checks cover the changed security surface. Record uncovered gaps in Optimization Options.

- Supabase security and performance advisor output;
- repo-local Supabase CLI contract evidence when branch setup or remote migration workflow changes;
- Edge Function log review without copying personal data;
- Auth log review after provider and redirect configuration;
- browser evidence for auth, admin, upload, settings, responsive, and PWA flows when UI behavior changed.
`;

const validMaintenanceDoc = `
# Maintenance

Run \`pnpm check:config\`, \`pnpm check:supabase-cli\`, \`pnpm check:edge-functions\`, \`pnpm exec tsc --noEmit\`, \`pnpm lint\`, and \`pnpm build\` before releases.

Use [Security](security.md) as the public runbook for this workflow. Treat the command list as a floor, not a proof by itself.

- Supabase schema or RLS changes: backup decision, advisor output when available, \`pnpm check:supabase-contract\`, \`pnpm check:supabase-cli\` when branch or remote migration workflow changes, focused RPC/policy tests, and restore-drill impact review.
- GitHub Pages or workflow changes: \`pnpm test:github-workflows\`, \`pnpm check:github-workflows\`, \`pnpm check:static-export\`, static build, and repository settings review.
`;

const validOptimizationOptions = `
# Optimization Options

- Security evidence automation: consider a \`pnpm check:security-maintenance\` helper or release-evidence generator once repeated manual reviews reveal stable inputs. Impact: keeps security review repeatable for humans, agents, and forks. Uncertainty/research: avoid hiding live advisor, browser, backup, or restore-drill decisions behind a green local-only proxy.
- Static-host security headers: decide how far GitHub Pages deployments can go with CSP.
- Abuse controls: design rate limits and review loops for uploads, moderation actions, invite attempts, RPC mutations, and Telegram notification functions.
`;

test("accepts aligned security maintenance docs and scripts", () => {
  assert.doesNotThrow(() => checkSecurityMaintenanceContract({
    packageJson: validPackageJson,
    skillMarkdown: validSkill,
    securityMarkdown: validSecurityDoc,
    maintenanceMarkdown: validMaintenanceDoc,
    optimizationMarkdown: validOptimizationOptions,
  }));
});

test("requires the baseline command list and package scripts", () => {
  assert.throws(
    () => checkSecurityMaintenanceContract({
      packageJson: validPackageJson.replace('"check:supabase-cli"', '"missing:supabase-cli"'),
      skillMarkdown: validSkill,
      securityMarkdown: validSecurityDoc,
      maintenanceMarkdown: validMaintenanceDoc,
      optimizationMarkdown: validOptimizationOptions,
    }),
    /package.json is missing script: check:supabase-cli/,
  );

  assert.throws(
    () => checkSecurityMaintenanceContract({
      packageJson: validPackageJson,
      skillMarkdown: validSkill.replace("pnpm check:edge-functions\n", ""),
      securityMarkdown: validSecurityDoc,
      maintenanceMarkdown: validMaintenanceDoc,
      optimizationMarkdown: validOptimizationOptions,
    }),
    /security-maintenance.*pnpm check:edge-functions/,
  );
});

test("requires local-check caveats and live evidence surfaces", () => {
  assert.throws(
    () => checkSecurityMaintenanceContract({
      packageJson: validPackageJson,
      skillMarkdown: validSkill,
      securityMarkdown: validSecurityDoc.replace("Passing local checks is not enough", "Local checks are enough"),
      maintenanceMarkdown: validMaintenanceDoc,
      optimizationMarkdown: validOptimizationOptions,
    }),
    /Passing local checks is not enough/,
  );

  assert.throws(
    () => checkSecurityMaintenanceContract({
      packageJson: validPackageJson,
      skillMarkdown: validSkill,
      securityMarkdown: validSecurityDoc,
      maintenanceMarkdown: validMaintenanceDoc,
      optimizationMarkdown: validOptimizationOptions.replace("green local-only proxy", "green proxy"),
    }),
    /green local-only proxy/,
  );
});
