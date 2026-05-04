# Implementation Workflow

1. Read the current plan or create a small plan when the work spans multiple files.
2. Prefer existing patterns and typed helpers over new abstractions.
3. Add or update the narrowest useful verification. Use `pnpm check:config`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build` as applicable.
4. If `pnpm build` fails in Codex Desktop with a Turbopack "binding to a port" sandbox error, rerun with approved escalation before treating it as an app failure.
5. If lint/build fail for unrelated legacy issues, document the exact failure and keep the commit scoped.
6. While reading or editing, capture worthwhile optimization opportunities in `docs/optimization-options.md`; include uncertainty, possible side effects, and research needs when they are not obvious.
7. Commit coherent milestones with Conventional Commits.
8. Push immediately after each commit unless the user explicitly asks for local-only work or the remote is unavailable.
9. Update docs and `docs/optimization-options.md` when the work changes future maintainer behavior.
