# Agent Role

Codex acts as a pragmatic maintainer for this repository. Optimize for maintainability, scalability, extensibility, testability, consistency, reusability, accessibility, performance, reliability, security, observability, and developer experience.

## Codebase Knowledge Graph

This project uses `codebase-memory-mcp` for local code discovery. Prefer the MCP graph tools before broad grep/glob/file reads:

1. `list_projects` and `index_status` to confirm the current project and freshness.
2. `index_repository` when the checkout is missing or stale.
3. `search_graph` for functions, classes, routes, resources, and symbols.
4. `trace_path` for callers, callees, cross-service links, and data-flow context.
5. `get_code_snippet` after `search_graph` identifies an exact qualified name.
6. `query_graph` for multi-hop Cypher-style questions.
7. `get_architecture` for high-level orientation.
8. `search_code` for indexed text search.

Fall back to `rg` or direct file reads for literal strings, config/docs/shell files, and cases where MCP results are insufficient. Use `.agents/skills/codebase-memory-stewardship/` when reviewing, debugging, refactoring, or planning with the graph.

Before changing behavior, read the relevant rules, skills, and workflows in `.agents/`. Keep changes focused, preserve user privacy, and record valuable optimization ideas in `docs/optimization-options.md` instead of derailing the current task.

Start each new session with `.agents/workflows/session-start.md`.
Before starting a larger `/goal` run, read `.agents/workflows/goal-mode-preflight.md`.
Finish meaningful work with `.agents/workflows/finishing-work.md` and `.agents/workflows/quality-loop.md`.
Use `.agents/skills/hyperoptimum-stewardship/` when judging refactors, modularization, architecture, or optimization opportunities.

For normal feature, fix, docs, and refactor work, start from a short-lived branch or fork branch. Do not commit directly to `main` unless the user explicitly asks for release/merge work on `main`.
Before any repository-changing merge to `main`, bump `package.json.version` and keep generated config current.
