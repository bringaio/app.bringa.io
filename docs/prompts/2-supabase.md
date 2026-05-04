---
status: superseded
---

# Supabase RLS Prompt Notes

This historical manual-SQL prompt is not an implementation source.

Do not apply old SQL from this file's history. It predated the current RPC-first contract and allowed browser writes that are now intentionally blocked.

Current sources of truth:

- `supabase/schema.sql` for the consolidated fresh setup schema.
- `supabase/migrations/` for incremental project upgrades.
- `supabase/README.md` for repository-level Supabase contract notes.
- `docs/supabase-contract-audit.md` for the local app/schema/Storage/Edge Function audit checklist.
- `scripts/check-supabase-contract.mjs` for the static Supabase contract check.

Current contract summary:

- Invite validation uses `verify_and_apply_invite`.
- Item creation and updates use `create_item` and `update_item`.
- Borrow and return use `borrow_item` and `return_item`.
- Item deletion uses `delete_item`.
- Admin role and invite-code changes use RPCs.
- Direct `items` writes are blocked by RLS.
- Direct `borrow_history` inserts are blocked by RLS.
- Borrow-history reads are admin-only by default.
- Item image uploads are constrained by the public config and the Storage bucket contract.

Before live changes, use Supabase MCP or service-role access only after confirming the target project and privacy boundary with the user.
