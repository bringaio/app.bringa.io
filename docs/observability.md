---
title: Observability
---

# Observability

This runbook is the source of truth for privacy-preserving observability in the upstream repository.

## Scope

- Observability should help maintainers diagnose failures without exposing personal data.
- Use local checks, Admin dashboard system health, Supabase metadata, Edge Function logs, and notification status before inspecting row contents.
- No third-party error reporting service is configured by default.
- Choose a privacy-preserving error reporting tool only after explicit decision.
- Record retention, access, region, consent, and sampling behavior outside committed secrets before enabling it.

## Default Error Reporting Decision

For the first open-source release, no external error-reporting service is necessary in the upstream default. This keeps fork setup simple, avoids surprise tracking, and preserves the current static-host plus Supabase quick-start path.

Deployment-specific error reporting remains opt-in. Before production use, operators that enable a provider must document provider, region, retention, sampling, PII scrubbing, source-map policy, access owners, and consent or notice requirements outside committed secrets. They must also verify browser payloads and server logs with redacted evidence before claiming the deployment is production-ready.

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
- Admin dashboard system health links config, Supabase, Storage, local backend setup, backups, docs, and Telegram health back to source-of-truth docs.
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

- [x] Decide the upstream default for external error reporting: none for the first open-source release.
- [ ] Define retention and access rules for logs and screenshots.
- [x] Verify Supabase Edge Function logs with approved access.
- [x] Verify live Supabase schema/key/API health checks with approved project access.
- [ ] Verify live restore drill evidence.
- [ ] Verify notification retry handling with operator-approved Telegram settings.
- [ ] Document any deployment-specific observability tools outside committed secrets.

## Known Gaps

- Supabase Edge Function logs were checked on 2026-05-05 and rechecked through Supabase MCP on 2026-05-06; no Edge Function invocations were present in the latest 24-hour window. Live notification delivery still needs another review after Edge Function secrets, Telegram webhook URLs, and Telegram settings are configured.
- Auth logs were checked on 2026-05-05 and rechecked through Supabase MCP on 2026-05-06 without app auth failures in the redacted review. The known Supabase-managed GoTrue default/admin group deprecation warnings remain and should be rechecked after Auth provider setup.
- API and Storage logs on 2026-05-06 showed successful management health and bucket metadata requests. Postgres logs showed routine connection and checkpoint messages in the redacted review. This is service-health evidence, not connected browser-auth or Telegram-delivery evidence.
- Live schema/key/API health checks passed on 2026-05-05; full connected-auth behavior still needs browser evidence.
- No external error reporting is configured by design in the upstream default. Deployment-specific tools remain opt-in and must follow the default decision checklist before production use.
- Browser/PWA failure evidence is still pending.
