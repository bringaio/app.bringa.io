# Telegram Notifications

Telegram is implemented through Supabase Edge Functions, database webhooks, and a small notification state contract in Supabase.

## Environment Variables

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_BOT_TOKEN_USER`
- `TELEGRAM_CHAT_ID_USER`
- `APP_URL`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_SECRET_KEYS`
- `SUPABASE_SERVICE_ROLE_KEY`

Set these as Supabase function secrets, not in public config.
Use `SUPABASE_SECRET_KEY` for new hosted Supabase deployments. `SUPABASE_SECRET_KEYS` is also supported for Supabase's JSON secret-map style with a `default` entry. `SUPABASE_SERVICE_ROLE_KEY` remains a legacy fallback only. The Edge Functions use this server-only admin key to call `record_notification_delivery` after Telegram accepts or rejects a send attempt.

Database trigger functions also read deployment-specific webhook URLs from database settings:

- `app.settings.telegram_item_webhook_url`
- `app.settings.telegram_user_webhook_url`

If a setting is missing, the trigger returns without calling an Edge Function. This keeps the upstream schema forkable and avoids shipping project-specific URLs.

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

## Setup

1. Create a bot with BotFather.
2. Add the bot to the target admin group.
3. Send a test message in the group.
4. Read updates from `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates` and copy the chat id.
5. Store secrets with the Supabase CLI or dashboard.
6. Deploy the Edge Function.
7. Configure the database setting for the matching webhook URL.
8. Enable the database trigger.

## Remaining Improvements

- Define the final database-setting workflow for webhook URLs and bearer tokens.
- Rename functions only when triggers and docs can be migrated safely.
- Add an operator retry job if manual retry planning is not enough for a deployment.
