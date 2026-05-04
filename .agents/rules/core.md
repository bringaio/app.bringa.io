# Core Agent Rules

- Treat `config/base.config.jsonc` plus `config/deployments/<slug>.jsonc` as the public deployment source of truth; regenerate with `pnpm generate:config`.
- Treat this repository as the generic `app.bringa.io` upstream. Keep CONTEKT or other operator-specific content in fork configuration or documented override content, not in shared app logic.
- Ask whether GitHub/GitLab issues should be processed at the start of a new session.
- Ask whether a Supabase backup should be run when a service role key is available; if the user has previously answered "always", run `pnpm backup:supabase` first.
- Keep `AGENTS.md` short. Put durable rules, skills, and workflows in `.agents/`.
- Keep texts compact, kind, and precise. Prefer one clear source of truth over repeated explanations.
- Record useful but out-of-scope modularization, refactoring, documentation, test, security, performance, accessibility, observability, and developer-experience ideas in `docs/optimization-options.md`; do not implement them without user intent unless they are necessary for the current task.
- If an optimization idea has uncertain impact, possible side effects, or needs current research, say that directly in the optimization entry.
- Use Conventional Commits for meaningful checkpoints.
- Push after every commit unless the user explicitly asks for local-only work or the remote is unavailable.
- Document conventions that affect other developers in `docs/`, then add matching `.agents/` rules or skills when agents should enforce or remember them.
- Before adding packages or tools, check current best practice from official docs or trusted current sources when network access is available.
- Before starting larger `/goal` work, use `.agents/workflows/goal-mode-preflight.md` to choose one coherent, verifiable target.
- The guiding ideal is the hyperoptimum: coherent, privacy-preserving, maintainable progress that improves the whole system without overbuilding the present step. Use `docs/hyperoptimum.md` as the durable interpretation.
