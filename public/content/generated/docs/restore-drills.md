# Restore Drills

This runbook is based on 2026-05-05 and 2026-05-06 Context7 reviews of current Supabase backup and restore documentation. It keeps restore practice separate from backup-file verification.

## Scope

- Restore drills prove recovery practice; `pnpm verify:backup <backup-directory>` only proves local backup file integrity.
- Do not restore into production unless the exact production rollback plan is approved.
- Use a non-production Supabase project, development branch, or local Supabase target.
- Do not inspect real row contents without explicit approval.
- Treat database, Storage, Auth metadata, Edge Function secrets, and provider settings as separate recovery surfaces.

## Current Documentation Signals

- Supabase database backups and Point-in-Time Recovery are database restore surfaces.
- Supabase Free Plan projects may not provide downloadable database backups.
- Supabase CLI `db dump` can export schema or data, and `db reset` reruns local migrations.
- Do not use `supabase db reset --linked` as a restore shortcut without an approved non-production target and rollback plan.
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
- [ ] Retention class is recorded: pre-change, restore-drill, account-deletion, incident hold, or archive.
- [ ] Encrypted-at-rest location or encrypted archive method is recorded.
- [ ] Retention period and deletion date are recorded.
- [ ] Deletion verification method is recorded.
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

## Starter Retention Policy

Use this as the default operator template until a deployment-specific policy replaces it.

- Retain pre-change backups for 30 days unless an incident or legal hold extends them.
- Delete restore-drill targets and drill backups within 7 days after the evidence is accepted.
- Treat account-deletion backups as pre-change backups unless a stricter legal or operator policy applies; keep user-data evidence redacted whenever possible.
- Keep incident-hold backups only with a recorded owner, reason, review date, and deletion condition.
- Keep archive backups only when the operator records why the archive is needed, where it is encrypted, who can decrypt it, and when it will be reviewed.
- Keep only redacted manifests, counts, hashes, and command output in durable evidence.
- Verify deletion by recording the removed archive path, deleted object prefix, provider deletion marker, or equivalent local evidence outside Git.

## Retention And Encryption

- Backup directories must stay out of git and public artifacts.
- Store backups on an encrypted volume or in an encrypted archive.
- Keep Supabase secret keys, service-role keys, Management API tokens, and provider secrets out of evidence files.
- Define who can access backups, when they expire, and how deletion is verified.
- Record the encryption method, key owner or recipient, retention class, deletion date, and deletion verification method before collecting real user data.
- Do not put raw backup archives, private decryption material, real user exports, or unredacted drill logs into `temp/`, generated docs, issues, pull requests, screenshots, or chat.
- Do not rely on local verification output as evidence that encrypted retention, restore access, or platform backup eligibility is configured.

## Known Gaps

- No live restore drill has been completed with approved Supabase access.
- No project-specific encrypted retention policy has been approved beyond the starter policy template.
- Auth restore remains reconciliation-only unless Supabase provides a deployment-specific restore path.
- Storage restore timing, bucket policy drift, and Edge Function secret reconciliation still need a live non-production drill.
