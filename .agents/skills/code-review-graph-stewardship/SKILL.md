---
name: code-review-graph-stewardship
description: Use when reviewing, debugging, refactoring, exploring architecture, checking blast radius, or planning code quality improvements with code-review-graph in this repository.
---

# Code Review Graph Stewardship

Use `code-review-graph` as a local structural map before broad code exploration. It is a routing aid, not a source of truth.

## Read First

- `docs/agentic-development.md`
- `.agents/workflows/quality-loop.md`
- `.agents/skills/hyperoptimum-stewardship/SKILL.md` when turning graph findings into roadmap items

## Setup Check

Prefer `uv` for new installs and portable MCP setup:

```bash
uv tool install code-review-graph
code-review-graph install --platform codex --repo .
```

Fallback:

```bash
pipx install code-review-graph
code-review-graph install --platform codex --repo .
```

If `code-review-graph` is unavailable but `uv` exists, use:

```bash
uvx --from code-review-graph code-review-graph status --repo .
```

Keep `.code-review-graph/` ignored and uncommitted. Generated visualizations and wiki pages also stay local unless the user explicitly asks to preserve a sanitized artifact.

## Core Loop

1. Run `code-review-graph status --repo .`.
2. If the graph is missing, stale, on the wrong branch, or after large moves, run `code-review-graph build --repo .`.
3. Otherwise run `code-review-graph update --repo . --base <base-ref>`.
4. Use the graph to choose exact files, functions, flows, and tests to inspect.
5. Read source and run repository checks before making claims.

Useful base refs:

```bash
git merge-base origin/main HEAD
code-review-graph detect-changes --repo . --base origin/main --brief
code-review-graph detect-changes --repo . --base HEAD~1 --brief
```

## Workflows

- **Review branch or PR**: update with the merge base, run `detect-changes`, inspect affected flows and high-risk changed files, then review source and tests.
- **Pre-merge check**: combine `detect-changes --brief` with the relevant `pnpm check:*`, `pnpm test:*`, `pnpm lint`, `pnpm build`, or Supabase checks.
- **Refactor planning**: ask MCP tools for `find_large_functions_tool`, `get_hub_nodes_tool`, `get_bridge_nodes_tool`, `get_knowledge_gaps_tool`, `get_surprising_connections_tool`, `list_flows_tool`, and `list_communities_tool` when available. CLI-only fallback may query `.code-review-graph/graph.db` with `sqlite3`.
- **Debugging**: search for relevant symbols, trace callers/callees and flows, then verify the suspected path by reading source.
- **Architecture orientation**: use communities, critical flows, hubs, and bridges to decide what to read first. Do not paste generated architecture wiki content into docs without review.

## Repository-Specific Heuristics

- Treat large admin pages, item detail/edit/create flows, Supabase SQL functions, backup/secret scripts, auth/login helpers, and local Supabase tooling as high-leverage graph targets.
- `code-review-graph` may report test coverage conservatively for this repo. Confirm with the existing `pnpm test:*` scripts before calling a symbol untested.
- For security-sensitive code, pair graph findings with `.agents/skills/security-maintenance/SKILL.md` and Supabase contract checks.
- For UI routes, pair graph findings with `.agents/skills/interface-stewardship/SKILL.md` and browser evidence when behavior changes.

## Reporting

Report graph evidence compactly:

- graph freshness: branch, commit, nodes, edges, files;
- changed files and risk score from `detect-changes`;
- affected flows or hubs only when they change the decision;
- exact source files and checks used to verify the conclusion.

Record durable improvement ideas in `docs/optimization-options.md`; do not leave them only in chat.
