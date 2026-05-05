import assert from "node:assert/strict";
import test from "node:test";

import { checkSupabaseBranchingContent, extractMarkdownSections } from "./check-supabase-branching.mjs";

test("extracts markdown sections by second-level heading", () => {
  const sections = extractMarkdownSections(`# Supabase Branching
Intro text.

## Current Documentation Signals
Signals text.

## Target State
Target text.
`);

  assert.deepEqual(sections, new Map([
    ["Current Documentation Signals", "Signals text."],
    ["Target State", "Target text."],
  ]));
});

test("accepts the required Supabase branching runbook contract", () => {
  assert.doesNotThrow(() => checkSupabaseBranchingContent(`
# Supabase Branching

This is based on 2026-05-05 Context7 reviews of current Supabase Branching, Management API, and CLI documentation.

## Current Documentation Signals

- Supabase supports development or preview branches for a project, with persistent branches available.
- Supabase describes branches as isolated project copies for database, Edge Function, and configuration changes.
- Default development branch planning should assume no production row data is copied.
- Branches can be created through the Management API with \`POST /v1/projects/{ref}/branches\` or through the CLI with \`supabase branches create [name]\`.
- The CLI branch creation command supports \`--project-ref <production-ref>\`, \`--persistent\`, and \`--with-data\`.
- If a workflow explicitly copies production data into a branch, use it only after a privacy decision because copied branch rows remain production data.
- Branches can be listed with \`supabase branches list --project-ref <production-ref>\`.
- Local repositories can link to a remote project ref with \`supabase link --project-ref <ref>\`.
- Migrations remain the durable source of schema changes and can be previewed with \`supabase db push --dry-run\`.
- TypeScript types can be generated from a linked project with \`supabase gen types --linked > types.ts\`.
- Edge Function secrets and Telegram settings are project-scoped and must be verified.
- Storage policy and object behavior require branch verification.
- Auth provider redirect URLs require branch verification.
- The Management API exposes a branch merge endpoint for moving database changes and deployed Edge Functions from a development branch to production.
- For this repository, prefer reviewed migrations in git.
- Use the repo-local Supabase CLI through \`pnpm exec supabase ...\` for operator commands.
- Remote branch commands require \`supabase login\` or \`SUPABASE_ACCESS_TOKEN\`.

## Target State

- Production deployment secrets point at the production Supabase project.
- Local \`.env.local\` for app development points at a persistent Supabase development branch.
- The Supabase CLI is linked to the development branch ref.
- Production data is not cloned into the branch by default.
- If operators choose \`--with-data\`, no real row inspection without explicit approval.
- Repository migrations remain the canonical change record.

## Preparation Tasks

- [ ] Confirm the production Supabase project ref.
- [ ] Confirm whether development branches are enabled for the project plan.
- [ ] Choose the branch name, defaulting to \`dev\`.
- [ ] Confirm whether the development branch should clone production data, start schema-only, or use seed/fixture data.
- [ ] Confirm the privacy rule for any branch copied from production.
- [ ] Run or explicitly decline \`pnpm backup:supabase\`.
- [ ] Record production and development branch refs outside git.
- [ ] Decide whether local \`.env.local\` points at the development branch.
- [ ] Verify Auth provider redirect URLs.
- [ ] Verify Storage bucket policy and object behavior.
- [ ] Verify Edge Function secrets and Telegram settings.
- [ ] Run \`pnpm check:supabase-cli\`.
- [ ] Run \`pnpm exec supabase db push --dry-run\`.
- [ ] Apply migrations to the development branch only after dry-run review.
- [ ] Generate and review TypeScript types.
- [ ] Run \`pnpm check:supabase-contract\`.
- [ ] Decide whether production promotion will use reviewed migrations, Supabase branch merge, or GitHub integration.
- [ ] Update deployment docs when the development branch workflow is actually activated.

## Recommended Workflow

\`\`\`bash
pnpm exec supabase branches create dev --persistent --project-ref <production-ref>
\`\`\`

Add \`--with-data\` only after confirming the production-data privacy policy.

\`\`\`bash
pnpm exec supabase branches list --project-ref <production-ref>
\`\`\`

\`\`\`bash
pnpm exec supabase link --project-ref <development-branch-ref>
\`\`\`

Keep production deploy secrets unchanged.

\`\`\`bash
pnpm exec supabase db push --dry-run
\`\`\`

Apply reviewed migrations to the development branch.
Promote or replay verified migrations to production only after backup, dry-run, review, and rollback planning.

## Known Gaps

- Supabase Auth users and Storage objects are separate surfaces.
- Branches copied from production may contain personal data. Treat copied rows as production data.
- The current MCP list_branches call still returns Project reference is missing when validating permissions.
- Telegram, Edge Function, OAuth, and redirect settings need explicit branch verification.
- The repository does not yet generate committed database types from Supabase.
`));
});

test("rejects missing production data privacy coverage", () => {
  assert.throws(
    () => checkSupabaseBranchingContent(`
# Supabase Branching
This is based on 2026-05-05 Context7 reviews.
## Current Documentation Signals
- Supabase supports development or preview branches for a project, with persistent branches available.
- Supabase describes branches as isolated project copies for database, Edge Function, and configuration changes.
- Branches can be created through the Management API with \`POST /v1/projects/{ref}/branches\`.
- The CLI supports \`supabase branches create [name]\`.
- Branches can be listed with \`supabase branches list --project-ref <production-ref>\`.
- Local repositories can link with \`supabase link --project-ref <ref>\`.
- Migrations can be previewed with \`supabase db push --dry-run\`.
- Edge Function secrets and Telegram settings are project-scoped.
- Storage policy and object behavior require branch verification.
- Auth provider redirect URLs require branch verification.
- prefer reviewed migrations in git.
## Target State
- Production deployment secrets point at production.
- Local \`.env.local\` points at a persistent Supabase development branch.
- The Supabase CLI is linked to the development branch ref.
- Repository migrations remain the canonical change record.
## Preparation Tasks
- [ ] Confirm the production Supabase project ref.
## Recommended Workflow
\`supabase branches create dev --persistent --project-ref <production-ref>\`
\`supabase branches list --project-ref <production-ref>\`
\`supabase link --project-ref <development-branch-ref>\`
Keep production deploy secrets unchanged.
\`supabase db push --dry-run\`
## Known Gaps
- Supabase Auth users and Storage objects are separate surfaces.
`),
    /production row data/,
  );
});

test("rejects global-only recommended Supabase CLI branch commands", () => {
  assert.throws(
    () => checkSupabaseBranchingContent(`
# Supabase Branching
This is based on 2026-05-05 Context7 reviews.
## Current Documentation Signals
- Supabase supports development or preview branches for a project, with persistent branches available.
- Supabase describes branches as isolated project copies for database, Edge Function, and configuration changes.
- Default development branch planning should assume no production row data is copied.
- Branches can be created through the Management API with \`POST /v1/projects/{ref}/branches\`.
- The CLI supports \`supabase branches create [name]\`.
- The CLI branch creation command supports \`--project-ref <production-ref>\`, \`--persistent\`, and \`--with-data\`.
- If a workflow explicitly copies production data into a branch, use it only after a privacy decision because copied branch rows remain production data.
- Branches can be listed with \`supabase branches list --project-ref <production-ref>\`.
- Local repositories can link with \`supabase link --project-ref <ref>\`.
- Migrations can be previewed with \`supabase db push --dry-run\`.
- TypeScript types can be generated from a linked project with \`supabase gen types --linked > types.ts\`.
- Edge Function secrets and Telegram settings are project-scoped.
- Storage policy and object behavior require branch verification.
- Auth provider redirect URLs require branch verification.
- The Management API exposes a branch merge endpoint for moving database changes and deployed Edge Functions from a development branch to production.
- prefer reviewed migrations in git.
- Use the repo-local Supabase CLI through \`pnpm exec supabase ...\` for operator commands.
- Remote branch commands require \`supabase login\` or \`SUPABASE_ACCESS_TOKEN\`.
## Target State
- Production deployment secrets point at the production Supabase project.
- Local \`.env.local\` for app development points at a persistent Supabase development branch.
- The Supabase CLI is linked to the development branch ref.
- Production data is not cloned into the branch by default.
- If operators choose \`--with-data\`, no real row inspection without explicit approval.
- Repository migrations remain the canonical change record.
## Preparation Tasks
- [ ] Confirm the production Supabase project ref.
- [ ] Confirm whether development branches are enabled for the project plan.
- [ ] Choose the branch name, defaulting to \`dev\`.
- [ ] Confirm whether the development branch should clone production data, start schema-only, or use seed/fixture data.
- [ ] Confirm the privacy rule for any branch copied from production.
- [ ] Run or explicitly decline \`pnpm backup:supabase\`.
- [ ] Record production and development branch refs outside git.
- [ ] Decide whether local \`.env.local\` points at the development branch.
- [ ] Verify Auth provider redirect URLs.
- [ ] Verify Storage bucket policy and object behavior.
- [ ] Verify Edge Function secrets and Telegram settings.
- [ ] Run \`pnpm check:supabase-cli\`.
- [ ] Run \`pnpm exec supabase db push --dry-run\`.
- [ ] Apply migrations to the development branch only after dry-run review.
- [ ] Generate and review TypeScript types.
- [ ] Run \`pnpm check:supabase-contract\`.
- [ ] Decide whether production promotion will use reviewed migrations, Supabase branch merge, or GitHub integration.
- [ ] Update deployment docs when the development branch workflow is actually activated.
## Recommended Workflow
\`supabase branches create dev --persistent --project-ref <production-ref>\`
\`supabase branches list --project-ref <production-ref>\`
\`supabase link --project-ref <development-branch-ref>\`
Keep production deploy secrets unchanged.
\`supabase db push --dry-run\`
## Known Gaps
- Supabase Auth users and Storage objects are separate surfaces.
- Branches copied from production may contain personal data. Treat copied rows as production data.
- Telegram, Edge Function, OAuth, and redirect settings need explicit branch verification.
- The repository does not yet generate committed database types from Supabase.
`),
    /pnpm exec supabase branches create/,
  );
});
