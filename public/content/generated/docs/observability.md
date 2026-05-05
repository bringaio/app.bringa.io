# Observability

This runbook is the source of truth for privacy-preserving observability in the upstream repository.

## Scope

- Observability should help maintainers diagnose failures without exposing personal data.
- Use local checks, Admin dashboard system health, Supabase metadata, Edge Function logs, and notification status before inspecting row contents.
- No third-party error reporting service is configured by default.
- Choose a privacy-preserving error reporting tool only after explicit decision.
- Record retention, access, region, consent, and sampling behavior outside committed secrets before enabling it.

## Privacy Boundaries

- Do not log Supabase secret keys, service-role keys, access tokens, provider secrets, private URLs, personal data, or real row contents.
- Do not paste screenshots, logs, or row contents containing personal data into chat, issues, docs, or AI prompts.
- Prefer counts, ids only when necessary, status fields, timestamps, and anonymized metadata.
- Ask for explicit approval before inspecting real Supabase row contents.
- Redact request headers, cookies, bearer tokens, email addresses, free-text notes, item descriptions, private URLs, image paths, and backup contents before sharing evidence.

## Current Signals

- `pnpm check:config` verifies generated public config.
- `pnpm check:supabase-contract` verifies committed schema, RPC, RLS, and Storage contracts.
- `pnpm check:github-workflows` verifies manual-only workflows.
- Admin dashboard system health links config, Supabase, Storage, development branch setup, backups, docs, and Telegram health back to source-of-truth docs.
- `backup_runs` records compact backup freshness metadata for admins without exposing backup files.
- `notification_events` records Telegram status, attempts, next retry planning, and seen-state.
- `notification_mutes` records mute windows without exposing row bodies.
- `record_notification_delivery` records delivery state without putting personal data in Telegram payloads.

## Failure Triage

1. Reproduce locally with safe public Supabase dummy values when possible.
2. Run the relevant checker before opening a production data investigation: `pnpm check:config`, `pnpm check:supabase-contract`, `pnpm check:github-workflows`, or `pnpm verify:backup <backup-directory>`.
3. Use Supabase schema, policy, function, trigger, bucket, Edge Function, and Auth provider metadata before row inspection.
4. Supabase dashboard or CLI logs require approved access.
5. Supabase dashboard Invocations can show request and response data, including headers and body.
6. Supabase Logs Explorer can query auth_logs, edge_logs, function_edge_logs, function_logs, postgres_logs, realtime_logs, and storage_logs.
7. For Telegram failures, inspect `notification_events.status`, `attempts`, `last_error`, and Edge Function deployment/secrets metadata before retrying delivery.
8. For backup failures, inspect `backup_runs`, local manifest verification, and Storage object counts before restore claims.
9. Browser evidence belongs in `docs/browser-testing.md`.
10. Record shared evidence as command output, counts, status fields, timestamps, or redacted screenshots.
11. Record follow-up work in `docs/optimization-options.md` when diagnosis reveals a durable gap.

## Live Setup Tasks

- [ ] Choose whether any external error-reporting service is necessary.
- [ ] Define retention and access rules for logs and screenshots.
- [x] Verify Supabase Edge Function logs with approved access.
- [x] Verify live Supabase schema/key/API health checks with approved project access.
- [ ] Verify live restore drill evidence.
- [ ] Verify notification retry handling with operator-approved Telegram settings.
- [ ] Document any deployment-specific observability tools outside committed secrets.

## Known Gaps

- Supabase Edge Function logs were checked on 2026-05-05 and had no invocations in the last 24 hours. Live notification delivery still needs another review after Edge Function secrets, Telegram webhook URLs, and Telegram settings are configured.
- Auth logs were checked on 2026-05-05 without app auth failures, but Supabase-managed GoTrue default/admin group deprecation warnings appeared and should be rechecked after Auth provider setup.
- Live schema/key/API health checks passed on 2026-05-05; full connected-auth behavior still needs browser evidence.
- No external error reporting is configured.
- Browser/PWA failure evidence is still pending.
