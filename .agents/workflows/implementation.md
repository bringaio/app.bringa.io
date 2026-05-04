# Implementation Workflow

1. Read the current plan or create a small plan when the work spans multiple files.
2. Prefer existing patterns and typed helpers over new abstractions.
3. Add or update the narrowest useful verification. Use `pnpm check:config`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build` as applicable.
4. If lint/build fail for unrelated legacy issues, document the exact failure and keep the commit scoped.
5. Commit coherent milestones with Conventional Commits.
6. Push immediately after each commit unless the user explicitly asks for local-only work or the remote is unavailable.
7. Update docs and `docs/optimization-options.md` when the work changes future maintainer behavior.
