---
title: Supabase Branching
---

# Supabase Branching

This is the task list for moving app development onto a Supabase development branch that is created from the production project. It is based on a 2026-05-04 Context7 review of the current Supabase Branching and Supabase CLI documentation.

Do not run these steps against production until the target project, backup policy, and row-access privacy boundary are explicitly confirmed.

## Current Documentation Signals

- Supabase supports development or preview branches for a project.
- Branches can be created through the Management API with `POST /v1/projects/{ref}/branches` or through the CLI with `supabase branches create [name]`.
- Local repositories can link to a remote project ref with `supabase link --project-ref <ref>`.
- Migrations remain the durable source of schema changes and can be previewed with `supabase db push --dry-run`.
- Remote migrations can be applied with `supabase db push` or `supabase migration up --linked`, depending on the chosen workflow.
- TypeScript types can be generated from a linked project with `supabase gen types --linked > types.ts` or from a specific project with `supabase gen types --project-id <ref> > types.ts`.
- Edge Function secrets, if needed, are project-scoped and can be inspected or set with `supabase secrets list --project-ref <ref>` and `supabase secrets set --project-ref <ref> KEY=value`.
- Edge Functions can be deployed to a specific project with `supabase functions deploy --project-ref <ref>`.

## Preparation Tasks

- [ ] Confirm the production Supabase project ref for `app.bringa.io`.
- [ ] Confirm whether development branches are enabled for the project plan.
- [ ] Confirm whether the development branch should clone production data, start schema-only, or use seed/fixture data.
- [ ] Confirm the privacy rule for any branch copied from production. Default: no real row inspection.
- [ ] Run or explicitly decline `pnpm backup:supabase` before any production-linked database operation.
- [ ] Record production and development branch refs in local operator notes, not in committed secrets.
- [ ] Decide whether local `.env.local` points at the development branch by default while production deploy secrets keep pointing at production.
- [ ] Verify Auth provider redirect URLs for both production and development branch app URLs.
- [ ] Verify Storage bucket policy and object behavior on the development branch.
- [ ] Verify Edge Function secrets and Telegram settings on the development branch before sending notifications.
- [ ] Run `supabase db push --dry-run` against the development branch before applying migrations.
- [ ] Generate and review TypeScript types from the development branch if typed database types are introduced.
- [ ] Run `pnpm check:supabase-contract` after pulling or applying remote schema changes.
- [ ] Update deployment docs when the development branch workflow is actually activated.

## Recommended Workflow

1. Create a Supabase development branch from the production project.
2. Link the local Supabase CLI to the development branch ref.
3. Apply pending repository migrations to the development branch.
4. Compare the live branch schema, RLS policies, functions, triggers, Storage bucket settings, and Edge Function settings against `supabase/schema.sql`.
5. Fix drift through migrations, not dashboard-only edits.
6. Point local app env/config at the development branch for manual and agentic testing.
7. Keep production deployment secrets untouched until release.
8. Promote or replay verified migrations to production only after backup, dry-run, review, and rollback planning.

## Known Gaps

- Supabase Auth users and Storage objects are separate surfaces; a database branch does not by itself prove Auth/Storage backup or cleanup behavior.
- Branches copied from production may contain personal data. Treat copied rows as production data.
- Telegram, Edge Function, OAuth, and redirect settings need explicit branch verification.
- The repository does not yet generate committed database types from Supabase.
