# Privacy And Supabase Rules

- Never expose Supabase secret keys, service role keys, access tokens, private URLs, or user data in logs, screenshots, commits, docs, or chat.
- Do not inspect real user table contents through Supabase MCP, SQL, backups, or dashboard access unless the user explicitly approves that inspection for the current task.
- Prefer schema, policies, functions, counts, and anonymized/mock data over real personal data.
- Use the production database read-only unless the user explicitly approves a write operation. For development and tests, use mock data or a dedicated dev database.
- Supabase Auth users, Storage objects, and Postgres table rows are separate backup surfaces. Do not claim a full backup unless all required surfaces have been exported.
- Any dev-mode auth bypass, impersonation, or elevated Supabase maintenance flow must be isolated to local/dev environments and impossible to enable in production by public config alone.
