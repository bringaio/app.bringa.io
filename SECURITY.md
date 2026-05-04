# Security Policy

## Reporting Vulnerabilities

Do not open a public issue for security vulnerabilities.

Use GitHub private vulnerability reporting when available, or contact the deployment operator through the private security channel documented by that deployment. If no private channel is configured yet, contact the repository maintainers privately before publishing details.

Include:

- Vulnerability type
- Affected route, file, policy, function, or table
- Reproduction steps
- Potential impact
- Suggested mitigation, if known

## Maintainer Rules

- Never commit `.env`, `.env.local`, service role keys, OAuth secrets, Telegram bot tokens, database passwords, or real user exports.
- Keep Supabase RLS enabled and review policy changes before deployment.
- Back up production data before migrations or destructive admin work.
- Treat Supabase Auth users, Postgres rows, and Storage objects as separate backup surfaces.
- Do not inspect real user data unless the user or operator explicitly approves that inspection for the task.
- Keep public config in `config/bringa.config.jsonc`; keep secrets in environment variables.

## Current Security Surfaces

- Supabase Auth with OAuth providers
- Client-side protected routes
- Postgres RLS policies
- Admin role checks
- Supabase Storage for item images
- Supabase Edge Functions for Telegram notifications
- Invite-code based admission

## Self-Hosting Checklist

- Configure HTTPS and canonical Auth redirect URLs.
- Rotate secrets before moving from development to production.
- Review RLS policies and Storage bucket rules.
- Configure private vulnerability reporting.
- Run `pnpm backup:supabase` before database changes when service role access is available.
- Run dependency, type, lint, and build checks before releases.

Last updated: May 2026.
