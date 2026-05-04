---
status: superseded
---

# Supabase Prompt Notes

These historical prompt notes are superseded by:

- `.agents/skills/supabase-mcp/SKILL.md`
- `docs/supabase.md`
- `docs/supabase-contract-audit.md`
- `supabase/README.md`

Current durable guidance:

- Keep migrations and `supabase/schema.sql` aligned.
- Include tables, constraints, indexes, triggers, functions, RLS policies, Storage buckets, and Edge Functions in Supabase reviews.
- Prefer schema and metadata review before row access.
- Ask explicit approval before inspecting real user data.
- Use official Supabase documentation, Context7, or current web research when adding Supabase tooling, MCP setup, custom domains, self-hosting, Auth providers, or new packages.
