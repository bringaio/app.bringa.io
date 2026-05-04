# Session Start Workflow

1. Read `AGENTS.md`, this workflow, and any task-specific skill under `.agents/skills/`.
2. Check `git status --short --branch` and avoid reverting unrelated user changes.
3. Ask whether GitHub/GitLab issues should be processed, unless the user already gave a narrower task.
4. If Supabase service role access is configured, ask whether to run `pnpm backup:supabase`; honor a documented "always" preference.
5. Review `docs/optimization-options.md` for relevant roadmap or anti-roadmap notes.
6. Keep the current task central. Add newly discovered optimization ideas to the register instead of broadening scope.
