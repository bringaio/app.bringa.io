---
title: Restore Drills
---

# Restore Drills

This runbook is based on a 2026-05-05 Context7 review of current Supabase backup and restore documentation. It keeps restore practice separate from backup-file verification.

## Scope

- Restore drills prove recovery practice; `pnpm verify:backup <backup-directory>` only proves local backup file integrity.
- Do not restore into production unless the exact production rollback plan is approved.
- Use a non-production Supabase project, development branch, or local Supabase target.
- Do not inspect real row contents without explicit approval.
- Treat database, Storage, Auth metadata, Edge Function secrets, and provider settings as separate recovery surfaces.

## Current Documentation Signals

- Supabase database backups and Point-in-Time Recovery are database restore surfaces.
- Supabase Free Plan projects may not provide downloadable database backups.
- Supabase Management API restore and restore-point endpoints require trusted access and may depend on plan or customer eligibility.
- Storage object backup and restore are separate from database backups.
- Supabase Auth metadata exports are not complete Auth restore packages and do not include passwords or provider secrets.
- Storage objects must be restored through the Storage API, not direct SQL writes to storage.objects.

## Required Evidence

- [ ] Target project or branch and source project are recorded outside git.
- [ ] Backup directory path and `pnpm verify:backup <backup-directory>` output are recorded.
- [ ] Table counts, Storage object counts, byte totals, and optional Auth metadata counts are recorded.
- [ ] Data access boundary is recorded; default is no real row inspection.
- [ ] Restore method is recorded for database, Storage, and Auth metadata reconciliation.
- [ ] Encrypted-at-rest location or encrypted archive method is recorded.
- [ ] Retention period and deletion date are recorded.
- [ ] Drill target cleanup or rollback is recorded.
- [ ] Exceptions and follow-up tasks are recorded.

## Drill Workflow

1. Confirm the drill target is not production.
2. Run `pnpm backup:supabase` or choose an existing backup.
3. Run `pnpm verify:backup <backup-directory>`.
4. Restore database state through the approved Supabase backup, PITR, dump, or local restore workflow.
5. Restore Storage objects through the Storage API.
6. Reconcile optional Auth metadata without treating it as account restore.
7. Reconfigure Edge Function secrets, OAuth providers, redirect URLs, Telegram settings, and public app env values for the drill target.
8. Run smoke checks without inspecting real rows unless approved.
9. Remove or archive the drill target according to the retention decision.

## Retention And Encryption

- Backup directories must stay out of git and public artifacts.
- Store backups on an encrypted volume or in an encrypted archive.
- Keep service-role keys, Management API tokens, and provider secrets out of evidence files.
- Define who can access backups, when they expire, and how deletion is verified.
- Do not rely on local verification output as evidence that encrypted retention, restore access, or platform backup eligibility is configured.

## Known Gaps

- No live restore drill has been completed with approved Supabase access.
- No project-specific encrypted retention policy has been approved.
- Auth restore remains reconciliation-only unless Supabase provides a deployment-specific restore path.
- Storage restore timing, bucket policy drift, and Edge Function secret reconciliation still need a live non-production drill.
