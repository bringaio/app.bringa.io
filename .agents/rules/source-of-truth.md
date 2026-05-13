# Source Of Truth Rules

- Before adding durable text, config, or conventions, identify the source of truth.
- Prefer links and short summaries over duplicated prose.
- Public deployment settings belong in layered config, not scattered through components.
- The app version belongs in `package.json.version` as a Semantic Versioning 2.0.0 `MAJOR.MINOR.PATCH` value; generated runtime config may expose it as `release.version`.
- Secrets belong only in local environment files, deployment secrets, or Supabase function secrets.
- Developer-facing conventions belong in `docs/conventions.md`.
- Hyperoptimum and ultraoptimum interpretation belongs in `docs/hyperoptimum.md`.
- Fork customization guidance belongs in `docs/forking.md`.
- Operator-specific legal text, branding, icons, and local copy should be configurable or overrideable. Do not hardcode fork-specific content in shared upstream components.
- Agent operating rules belong in `.agents/`; keep `AGENTS.md` short.
- `.agents/` is the only active repository-local agent directory. Do not reintroduce `.agent/`.
- Historical notes in `docs/prompts/` are not implementation sources. Use current `.agents/`, `docs/`, code, config, and Supabase files instead.
- If duplication is unavoidable, name the source of truth in a nearby comment or doc note.
