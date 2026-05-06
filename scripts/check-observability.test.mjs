import assert from "node:assert/strict";
import test from "node:test";

import { checkObservabilityContent, extractMarkdownSections } from "./check-observability.mjs";

test("extracts observability sections", () => {
  const sections = extractMarkdownSections(`# Observability

## Scope
Scope text.

## Known Gaps
Gap text.
`);

  assert.deepEqual(sections, new Map([
    ["Scope", "Scope text."],
    ["Known Gaps", "Gap text."],
  ]));
});

test("accepts privacy-preserving observability runbook content", () => {
  assert.doesNotThrow(() => checkObservabilityContent(`
# Observability

## Scope

- This is the source of truth for privacy-preserving observability in the upstream repository.
- Observability should help maintainers diagnose failures without exposing personal data.
- Use local checks, Admin dashboard system health, Supabase metadata, Edge Function logs, and notification status before inspecting row contents.
- No third-party error reporting service is configured by default.

## Default Error Reporting Decision

- For the first open-source release, no external error-reporting service is necessary in the upstream default.
- Deployment-specific error reporting remains opt-in.
- Operators that enable one must document provider, region, retention, sampling, PII scrubbing, source-map policy, access owners, and consent or notice requirements before production use.

## Privacy Boundaries

- Do not log Supabase secret keys, service-role keys, access tokens, provider secrets, private URLs, personal data, or real row contents.
- Do not paste screenshots, logs, or row contents containing personal data into chat, issues, docs, or AI prompts.
- Prefer counts, ids only when necessary, status fields, timestamps, and anonymized metadata.
- Ask for explicit approval before inspecting real Supabase row contents.

## Current Signals

- \`pnpm check:config\` verifies generated public config.
- \`pnpm check:supabase-contract\` verifies committed schema/RPC/RLS/Storage contracts.
- \`pnpm check:github-workflows\` verifies manual-only workflows.
- Admin dashboard system health links config, Supabase, Storage, local backend setup, backups, docs, and Telegram health.
- \`backup_runs\` records compact backup freshness metadata.
- \`notification_events\` records Telegram status, attempts, next retry planning, and seen-state.
- \`notification_mutes\` records mute windows without exposing row bodies.
- \`record_notification_delivery\` records delivery state without putting personal data in Telegram payloads.

## Failure Triage

- Reproduce locally with safe public Supabase dummy values when possible.
- Run the relevant checker before opening a production data investigation.
- Use Supabase schema, policy, function, trigger, bucket, Edge Function, and Auth provider metadata before row inspection.
- Supabase dashboard or CLI logs require approved access.
- Supabase dashboard Invocations can show request and response data, including headers and body.
- Supabase Logs Explorer can query auth_logs, edge_logs, function_edge_logs, function_logs, postgres_logs, realtime_logs, and storage_logs.
- For Telegram failures, inspect \`notification_events.status\`, \`attempts\`, \`last_error\`, and Edge Function deployment/secrets metadata.
- For backup failures, inspect \`backup_runs\`, local manifest verification, and Storage object counts before restore claims.
- Record evidence as command output, counts, status fields, timestamps, or redacted screenshots.
- Browser evidence belongs in \`docs/browser-testing.md\`.

## Live Setup Tasks

- [x] Decide the upstream default for external error reporting: none for the first open-source release.
- [ ] Define retention and access rules for logs and screenshots.
- [x] Verify Supabase Edge Function logs with approved access.
- [x] Verify live Supabase schema/key/API health checks with approved project access.
- [ ] Verify live restore drill evidence.
- [ ] Verify notification retry handling with operator-approved Telegram settings.
- [ ] Document any deployment-specific observability tools outside committed secrets.

## Known Gaps

- Supabase Edge Function logs were checked on 2026-05-05 and rechecked through Supabase MCP on 2026-05-06; no Edge Function invocations were present in the latest 24-hour window.
- Auth logs were checked on 2026-05-05 and rechecked through Supabase MCP on 2026-05-06 without app auth failures in the redacted review.
- API and Storage logs on 2026-05-06 showed successful management health and bucket metadata requests.
- No external error reporting is configured by design in the upstream default.
- Live schema/key/API health checks passed on 2026-05-05; full connected-auth behavior still needs browser evidence.
- Browser/PWA failure evidence is still pending.
`));
});

test("rejects observability runbooks that omit the privacy boundary", () => {
  assert.throws(
    () => checkObservabilityContent(`
# Observability

## Scope
- This is the source of truth for privacy-preserving observability in the upstream repository.
- Observability should help maintainers diagnose failures without exposing personal data.

## Privacy Boundaries
- Prefer counts.

## Default Error Reporting Decision
- For the first open-source release, no external error-reporting service is necessary in the upstream default.

## Current Signals
- \`pnpm check:config\`

## Failure Triage
- Run checks.

## Live Setup Tasks
- [x] Decide the upstream default for external error reporting: none for the first open-source release.

## Known Gaps
- No external error reporting is configured.
`),
    /Do not log Supabase secret keys/,
  );
});
