# Source Of Truth Rules

- Before adding durable text, config, or conventions, identify the source of truth.
- Prefer links and short summaries over duplicated prose.
- Public deployment settings belong in layered config, not scattered through components.
- The app version belongs in `package.json.version` as a Semantic Versioning 2.0.0 `MAJOR.MINOR.PATCH` value; generated runtime config may expose it as `release.version`.
- Secrets belong only in local environment files, deployment secrets, or Supabase function secrets.
- Environment templates use `.env.example`; developer-local secrets and maintenance keys stay in ignored `.env.local`.
- Developer-facing conventions belong in `docs/conventions.md`.
- Hyperoptimum and ultraoptimum interpretation belongs in `docs/hyperoptimum.md`.
- Fork customization guidance belongs in `docs/forking.md`.
- Operator-specific legal text, branding, icons, and local copy should be configurable or overrideable. Do not hardcode fork-specific content in shared upstream components.
- Agent operating rules belong in `.agents/`; keep `AGENTS.md` short.
- `.agents/` is the only active repository-local agent directory. Do not reintroduce `.agent/`.
- Historical notes in `docs/prompts/` are not implementation sources. Use current `.agents/`, `docs/`, code, config, and Supabase files instead.
- If duplication is unavoidable, name the source of truth in a nearby comment or doc note.
- For docs cleanup, keep `docs/fork-launch-runbook.md` as the fork launch source, `docs/fork-upgrade-runbook.md` as the fork upgrade source, `docs/configuration.md` as the config/generated-artifact source, `docs/repository-settings.md` as the GitHub settings source, `docs/supabase.md` as the backend source, `docs/readiness-checklist.md` as the current evidence source, and `docs/roadmap.md` plus `docs/optimization-options.md` as the roadmap sources.
