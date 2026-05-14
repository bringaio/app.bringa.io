---
title: Telegram Notifications
---

# Telegram Notifications

Telegram is implemented through Supabase Edge Functions, database webhooks, and a small notification state contract in Supabase.

## Environment Variables

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_BOT_TOKEN_USER`
- `TELEGRAM_CHAT_ID_USER`
- `TELEGRAM_WEBHOOK_SECRET`
- `APP_URL`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_SECRET_KEYS`
- `SUPABASE_SERVICE_ROLE_KEY`

Set these as Supabase function secrets, not in public config.
Use `SUPABASE_SECRET_KEY` for new hosted Supabase deployments. `SUPABASE_SECRET_KEYS` is also supported for Supabase's JSON secret-map style with a `default` entry. `SUPABASE_SERVICE_ROLE_KEY` remains a legacy fallback only. The Edge Functions use this server-only admin key to call `record_notification_delivery` after Telegram accepts or rejects a send attempt.
`TELEGRAM_WEBHOOK_SECRET` must be a high-entropy shared secret. Store the same value in the database setting `app.settings.telegram_webhook_secret`; the trigger sends it in `x-bringa-webhook-secret`, and the Edge Function rejects calls without an exact match.

Database trigger functions also read deployment-specific webhook URLs from database settings:

- `app.settings.telegram_item_webhook_url`
- `app.settings.telegram_user_webhook_url`
- `app.settings.telegram_webhook_secret`

If a webhook URL setting is missing, the trigger returns without calling an Edge Function. This keeps the upstream schema forkable and avoids shipping project-specific URLs. The webhook secret setting is required for successful delivery when a URL is configured.

## Notification State

`notification_events` records admin Telegram notification attempts with a privacy-minimal payload: a short title and an app-relative URL. Item names, profile names, emails, notes, and row bodies are not sent to Telegram by default. Admins use the app for details.

The database contract suppresses duplicate Telegram sends while an existing event with the same dedupe key remains unseen. Admins can mark events seen with `mark_notification_seen`, which allows a later event for the same subject to notify again.

`notification_mutes` records per-profile mute windows. `set_telegram_mute` supports one day, one week, forever, and unmute. Muted events are recorded as `skipped_muted` without Telegram delivery.

Edge Functions call `record_notification_delivery` with the configured Supabase admin key after a send attempt. Failed sends record `last_error`, increment `attempts`, and set `next_attempt_at` for operator retry planning.

## Current Function Names

The current functions are named:

- `notifiy-telegram`
- `notifiy-telegram-user`

The typo is part of the current deployed surface and should only be renamed with a migration plan for triggers/webhooks.

## Temporary Upstream Handoff

This subsection is only for maintainers of the upstream `app.bringa.io` deployment. Fork operators should ignore it and use the generic setup steps below with their own project ref, Edge Function URLs, bot tokens, chat ids, and webhook secret.

Delete this subsection after upstream Telegram is fully configured and one live notification has been verified.

As of 2026-05-14, the upstream Supabase project is `bqotcfejqljfcfjhavwh`.

Already done:

- The 2026-05-14 Telegram hardening migrations are applied in live migration history.
- `notifiy-telegram` and `notifiy-telegram-user` are deployed with `verify_jwt=false` so database webhooks can call them.
- `APP_URL` and `TELEGRAM_WEBHOOK_SECRET` exist as Supabase Function secrets.

Still required before Telegram can be considered set up:

- Set real Telegram bot token and chat id Function secrets. The local `.env` entries were blank during the 2026-05-14 handoff.
- Rotate `TELEGRAM_WEBHOOK_SECRET` and set the matching database setting in the same session. The existing Function secret value cannot be read back from Supabase, and the matching `app.settings.telegram_webhook_secret` database setting was not created.
- Set `app.settings.telegram_item_webhook_url` and `app.settings.telegram_user_webhook_url`. The Supabase CLI Management API query role returned `permission denied to set parameter "app.settings.telegram_item_webhook_url"`, so use the Supabase dashboard SQL editor or a direct database owner connection rather than `supabase db query --linked`.
- Exercise one live notification and review `notification_events` plus Edge Function logs without copying private row contents into docs or chat.

## Setup

1. Create a bot with BotFather.
2. Add the bot to the target admin group.
3. Send a test message in the group.
4. Read updates from `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates` and copy the chat id.
5. Store secrets with the Supabase CLI or dashboard.
6. Store `TELEGRAM_WEBHOOK_SECRET` as a function secret.
7. Deploy the Edge Functions with the repository `supabase/config.toml` so `verify_jwt=false` is applied for database webhook calls.
8. Configure the database settings for the matching webhook URL and the same `app.settings.telegram_webhook_secret` value.
9. Enable the database trigger.

For any deployment, the database settings SQL template is:

```sql
ALTER DATABASE postgres SET app.settings.telegram_item_webhook_url = 'https://<project-ref>.supabase.co/functions/v1/notifiy-telegram';
ALTER DATABASE postgres SET app.settings.telegram_user_webhook_url = 'https://<project-ref>.supabase.co/functions/v1/notifiy-telegram-user';
ALTER DATABASE postgres SET app.settings.telegram_webhook_secret = '<same high-entropy value set as TELEGRAM_WEBHOOK_SECRET>';
```

Fork operators must replace `<project-ref>` and should not copy upstream `app.bringa.io` project values.

After applying those settings, reconnect and verify without printing secret values:

```sql
select
  nullif(current_setting('app.settings.telegram_item_webhook_url', true), '') is not null as item_webhook_configured,
  nullif(current_setting('app.settings.telegram_user_webhook_url', true), '') is not null as user_webhook_configured,
  nullif(current_setting('app.settings.telegram_webhook_secret', true), '') is not null as webhook_secret_configured;
```

## Remaining Improvements

- Define the final operator workflow for rotating webhook URLs and shared secrets.
- Rename functions only when triggers and docs can be migrated safely.
- Add an operator retry job if manual retry planning is not enough for a deployment.
