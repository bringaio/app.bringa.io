---
title: Supabase Branching
---

# Supabase Branching

This is the task list for moving app development onto a Supabase development branch that is created from the production project. It is based on 2026-05-04 and 2026-05-05 Context7 reviews of the current Supabase Branching, Supabase Management API, and Supabase CLI documentation.

Do not run these steps against production until the target project, backup policy, and row-access privacy boundary are explicitly confirmed.

## Current Documentation Signals

- Supabase supports development or preview branches for a project, with persistent branches available for long-lived development setups.
- Supabase describes branches as isolated project copies for database, Edge Function, and configuration changes. Default development branch planning should assume no production row data is copied.
- Branches can be created through the Management API with `POST /v1/projects/{ref}/branches` or through the CLI with `supabase branches create [name]`.
- The CLI branch creation command supports `--project-ref <production-ref>`, `--persistent`, `--region`, `--size`, `--notify-url`, and `--with-data`.
- If a workflow explicitly copies production data into a branch, use it only after a privacy decision because copied branch rows remain production data.
- Branches can be listed with `supabase branches list --project-ref <production-ref>`.
- Local repositories can link to a remote project ref with `supabase link --project-ref <ref>`.
- Migrations remain the durable source of schema changes and can be previewed with `supabase db push --dry-run`.
- Remote migrations can be applied with `supabase db push` or `supabase migration up --linked`, depending on the chosen workflow.
- TypeScript types can be generated from a linked project with `supabase gen types --linked > types.ts` or from a specific project with `supabase gen types --project-id <ref> > types.ts`.
- Edge Function secrets, if needed, are project-scoped and can be inspected or set with `supabase secrets list --project-ref <ref>` and `supabase secrets set --project-ref <ref> KEY=value`.
- Edge Functions can be deployed to a specific project with `supabase functions deploy --project-ref <ref>`.
- The Management API exposes a branch merge endpoint for moving database changes and deployed Edge Functions from a development branch to production. For this repository, prefer reviewed migrations in git and only use branch merge after the target workflow is explicitly approved.
- Supabase's GitHub integration can deploy migrations, Edge Functions, and Storage buckets declared in `config.toml` when a production branch is pushed or merged. Treat that as a later trusted-environment option, not a default secret-free CI behavior.
- This repository installs the Supabase CLI as a repo-local dev dependency. Use the repo-local Supabase CLI through `pnpm exec supabase ...` for operator commands so agents and forks do not rely on a global CLI install.
- Remote branch commands require `supabase login` or `SUPABASE_ACCESS_TOKEN`. Keep access tokens outside Git, generated docs, screenshots, and chat.

## Target State

- Production deployment secrets point at the production Supabase project.
- Local `.env.local` for app development points at a persistent Supabase development branch created from that production project.
- The Supabase CLI is linked to the development branch ref during ordinary local development, not to production.
- Production data is not cloned into the branch by default. If operators choose `--with-data`, the privacy boundary remains the same as production: no real row inspection without explicit approval.
- Repository migrations remain the canonical change record. Dashboard-only changes must be converted into migrations before release.

## Preparation Tasks

- [ ] Confirm the production Supabase project ref for `app.bringa.io`.
- [ ] Confirm whether development branches are enabled for the project plan.
- [ ] Choose the branch name, defaulting to `dev` for a persistent local-development branch.
- [ ] Confirm whether the development branch should clone production data, start schema-only, or use seed/fixture data.
- [ ] Confirm the privacy rule for any branch copied from production. Default: no real row inspection.
- [ ] Run or explicitly decline `pnpm backup:supabase` before any production-linked database operation.
- [ ] Record production and development branch refs in local operator notes, not in committed secrets.
- [ ] Decide whether local `.env.local` points at the development branch by default while production deploy secrets keep pointing at production.
- [ ] Verify Auth provider redirect URLs for both production and development branch app URLs.
- [ ] Verify Storage bucket policy and object behavior on the development branch.
- [ ] Verify Edge Function secrets and Telegram settings on the development branch before sending notifications.
- [ ] Run `pnpm check:supabase-cli` before relying on branch CLI instructions.
- [ ] Run `pnpm exec supabase db push --dry-run` against the development branch before applying migrations.
- [ ] Apply migrations to the development branch only after dry-run review and branch backup decision.
- [ ] Generate and review TypeScript types from the development branch if typed database types are introduced.
- [ ] Run `pnpm check:supabase-contract` after pulling or applying remote schema changes.
- [ ] Decide whether production promotion will use reviewed migrations, Supabase branch merge, or GitHub integration. Default: reviewed migrations.
- [ ] Update deployment docs when the development branch workflow is actually activated.

## Recommended Workflow

1. Create a persistent Supabase development branch from the production project:

   ```bash
   pnpm exec supabase branches create dev --persistent --project-ref <production-ref>
   ```

   Add `--with-data` only after confirming the production-data privacy policy.

2. List branches and record the development branch ref outside git:

   ```bash
   pnpm exec supabase branches list --project-ref <production-ref>
   ```

3. Link the local Supabase CLI to the development branch ref:

   ```bash
   pnpm exec supabase link --project-ref <development-branch-ref>
   ```

4. Point local app env values at the development branch API URL and publishable key. Keep production deploy secrets unchanged.
5. Preview pending repository migrations against the development branch:

   ```bash
   pnpm exec supabase db push --dry-run
   ```

6. Apply reviewed migrations to the development branch.
7. Compare the live branch schema, RLS policies, functions, triggers, Storage bucket settings, and Edge Function settings against `supabase/schema.sql`.
8. Fix drift through migrations, not dashboard-only edits.
9. Run manual and agentic app testing against the development branch.
10. Promote or replay verified migrations to production only after backup, dry-run, review, and rollback planning.

## Known Gaps

- Supabase Auth users and Storage objects are separate surfaces; a database branch does not by itself prove Auth/Storage backup or cleanup behavior.
- Branches copied from production may contain personal data. Treat copied rows as production data.
- The current MCP `list_branches` call still returns `Project reference is missing when validating permissions`; the repo-local CLI currently reports `Access token not provided` until `supabase login` or `SUPABASE_ACCESS_TOKEN` is configured.
- Telegram, Edge Function, OAuth, and redirect settings need explicit branch verification.
- The repository does not yet generate committed database types from Supabase.
