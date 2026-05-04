# Source Of Truth Rules

- Before adding durable text, config, or conventions, identify the source of truth.
- Prefer links and short summaries over duplicated prose.
- Public deployment settings belong in config, not scattered through components.
- Secrets belong only in local environment files, deployment secrets, or Supabase function secrets.
- Developer-facing conventions belong in `docs/conventions.md`.
- Fork customization guidance belongs in `docs/forking.md`.
- Agent operating rules belong in `.agents/`; keep `AGENTS.md` short.
- If duplication is unavoidable, name the source of truth in a nearby comment or doc note.
