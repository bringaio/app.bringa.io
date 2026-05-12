# Session Start Workflow

1. Read `AGENTS.md`, this workflow, and any task-specific skill under `.agents/skills/`.
2. Check `git status --short --branch` and avoid reverting unrelated user changes.
3. For normal implementation work, create or switch to a short-lived branch before editing. Agent branches use `codex/<type>-<topic>`. Work on `main` only when the user explicitly asks for release, merge, or repository-maintenance work on `main`.
4. Ask whether GitHub/GitLab issues should be processed, unless the user already gave a narrower task.
5. If Supabase server-side maintenance access is configured through `SUPABASE_SECRET_KEY` or legacy `SUPABASE_SERVICE_ROLE_KEY`, ask whether to run `pnpm backup:supabase`; honor a documented "always" preference.
6. Review `docs/optimization-options.md` for relevant roadmap or anti-roadmap notes.
7. Read `docs/hyperoptimum.md` when the task touches architecture, refactoring, modularity, quality strategy, or agent behavior.
8. For `/goal` or other long-running autonomous work, read `.agents/workflows/goal-mode-preflight.md` before choosing the target.
9. Remember that commits should be pushed immediately unless the user explicitly asks for local-only work.
10. Keep the current task central. Add newly discovered optimization ideas to the register instead of broadening scope.
