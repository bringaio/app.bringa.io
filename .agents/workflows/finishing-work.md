# Finishing Work Workflow

Use this before calling work complete.

1. Run the narrowest reliable verification for the change.
2. Run broader checks when the change affects shared behavior, build, config, or docs.
3. Update user-facing docs for conventions that affect developers, forks, CI/CD, setup, operations, or security.
4. Update `.agents/` rules, workflows, or skills when a convention should guide future agents.
5. Commit with a Conventional Commit message.
6. Push immediately after every commit unless the user explicitly asks for local-only work or the remote is unavailable.
7. If a pull request is merged, verify the head branch was deleted or document why it remains.
8. Record useful follow-up ideas in `docs/optimization-options.md` instead of broadening the finished task.
