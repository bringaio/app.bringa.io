# Conventions

These conventions keep the upstream repository easy to review, fork, sync, and maintain.

## Git And Pull Requests

- Use Conventional Commits.
- Prefer small, coherent commits.
- Push after every commit unless the user explicitly asks for local-only work.
- Use rebase merging for pull requests.
- Keep `main` linear and protected once CI is in place.
- Enable GitHub's automatic deletion of head branches after pull requests are merged.
- Merged branches are not an archive. Git history and pull requests are the archive.

Recommended branch names:

- `codex/<topic>` for Codex-created branches.
- `feat/<topic>` for human feature work.
- `fix/<topic>` for bug fixes.
- `docs/<topic>` for docs-only work.
- `chore/<topic>` for maintenance.

## Source Of Truth

Every durable fact should have one home.

- Public deployment config: `config/bringa.config.jsonc`
- Generated public config: `public/bringa.config.json`
- Typed app config: `src/config/bringa.config.generated.json`
- Secrets: `.env.local`, deployment secrets, or Supabase function secrets
- Agent rules and workflows: `.agents/`
- User-facing docs: `docs/`
- Roadmap and anti-roadmap: `docs/optimization-options.md`

When adding new text, decide whether it is a source of truth, a short summary, or a pointer. Prefer pointers over repeated prose.

## CI/CD

CI should be useful for upstream and forks.

Secret-free checks should run for ordinary pull requests:

- `pnpm install --frozen-lockfile`
- `pnpm check:config`
- `pnpm exec tsc --noEmit`
- `pnpm build` with safe public dummy Supabase values when needed
- docs build once GitHub Pages docs are added

Secret-required work belongs only on trusted branches and environments:

- production deployment
- Supabase backups
- remote Supabase migrations
- Edge Function deployment
- any workflow that needs service role keys or provider secrets

## Documentation

Documentation should be compact, practical, and link to the source of truth.

- Keep setup docs friendly for non-expert maintainers.
- Put conventions that affect contributors in `docs/`.
- Put agent-only operating details in `.agents/`.
- Keep `AGENTS.md` short and navigational.
- Develop docs in this repository so they can later publish cleanly to GitHub Pages.

## Hyperoptimum Practice

The best change is the most coherent next improvement, not the largest possible change. Prefer work that reduces hidden complexity, improves forkability, protects privacy, and makes the next contributor more confident.
