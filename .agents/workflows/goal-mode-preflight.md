# Goal Mode Preflight

Use this before starting `/goal` or any larger autonomous work target.

1. Confirm the repository context: this is the generic `app.bringa.io` upstream unless the user explicitly names a fork.
2. Read `docs/hyperoptimum.md` and treat hyperoptimum as disciplined coherence, not scope expansion.
3. Review `docs/optimization-options.md` and identify which entries support the goal and which must remain deferred.
4. Check `temp/` for the latest local goal plan when available. Temp files are context aids, not public docs.
5. Choose one measurable target with a clear stopping point, verification commands, and commit boundaries.
6. Prefer work that improves maintainability, scalability, extensibility, testability, consistency, reusability, accessibility, performance, reliability, security, observability, and developer experience together.
7. Before touching Supabase production data, ask for explicit approval. Prefer schema, policy, function, trigger, bucket, and anonymized metadata.
8. Before adding packages, tools, or external services, check current official documentation or trusted current sources when network access is available.
9. Keep fork-specific content configurable or overrideable. Do not put local operator assumptions into shared upstream logic.
10. Record newly discovered but out-of-scope ideas in `docs/optimization-options.md` with impact and uncertainty notes.
11. Make small commits with Conventional Commits and push each commit unless the user asks otherwise.
