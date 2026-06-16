---
title: Agentic Development
---

# Agentic Development

This repository is intended to be pleasant for humans and coding agents. Agents should read `AGENTS.md`, then the relevant workflows and skills under `.agents/`, before changing behavior.

## Codebase Memory MCP

`codebase-memory-mcp` is the current local code graph tool for this repository. It builds a persistent knowledge graph of functions, classes, methods, routes, resources, call chains, data-flow edges, and cross-service links, then exposes that graph to supported AI coding tools through MCP.

Keep `.codebase-memory/` ignored by default. The graph artifact can be shared as `.codebase-memory/graph.db.zst`, but this repository treats it as local generated state unless a maintainer explicitly decides to commit a shared snapshot. Local SQLite indexes live outside the repo under the tool cache.

Developers and agents on the same machine can use the same local graph for one checkout after their AI tool is configured. Developers on different machines should build or import their own graph from the repository.

## Setup

Install the standard binary:

```bash
curl -fsSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh | bash
```

Install with the optional 3D graph UI:

```bash
curl -fsSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh | bash -s -- --ui
```

The installer auto-detects supported agents, including Codex CLI, and configures MCP entries, instruction files, and non-blocking hooks where supported. Restart the AI coding tool after install so MCP configuration is loaded.

If MCP tools are visible in Codex, index this checkout:

```text
index_repository(repo_path="/Users/totoiusbobinius/code/app.bringa.io", mode="fast")
```

Use `mode="moderate"` or `mode="full"` when semantic search, `SIMILAR_TO`, or `SEMANTICALLY_RELATED` edges matter for the task. Use `persistence=true` only when intentionally refreshing a team-shared `.codebase-memory/graph.db.zst` artifact.

CLI fallback is available for setup checks or sessions without MCP tools:

```bash
codebase-memory-mcp cli list_projects
codebase-memory-mcp cli index_repository '{"repo_path": "/Users/totoiusbobinius/code/app.bringa.io", "mode": "fast"}'
```

## Graph UI

The browser UI is optional and requires the UI binary variant. A working MCP server can still have no HTTP listener on `localhost:9749` if the standard binary was installed.

Start the UI-capable binary with:

```bash
codebase-memory-mcp --ui=true --port=9749
```

Then open `http://localhost:9749`. If the port is closed, reinstall or update with the upstream `--ui` option and restart the agent runtime.

## Keeping The Graph Fresh

Enable automatic indexing on MCP session start when desired:

```bash
codebase-memory-mcp config set auto_index true
codebase-memory-mcp config set auto_index_limit 50000
```

For explicit refreshes, use MCP first:

```text
index_status(project="<project>")
index_repository(repo_path="/Users/totoiusbobinius/code/app.bringa.io", mode="fast")
```

Run a stronger reindex after large file moves, major pulls, tool upgrades, or confusing graph results. Do not delete `~/.cache/codebase-memory-mcp/` without approval because it may contain indexes for other repositories.

## Maximum-Benefit Workflows

Use the graph to decide what to read, not to avoid reading. The graph is most useful for:

- branch and pull request review with `detect_changes`;
- pre-merge checks that combine graph impact with repository checks;
- refactor planning around large functions, hub nodes, bridge nodes, routes, resources, data-flow edges, and duplicated or semantically related code;
- debugging by tracing callers, callees, and execution flows before opening files;
- architecture orientation through `get_architecture`, schema inspection, and targeted graph queries;
- onboarding a new human or agent to the main app, Supabase, scripts, and docs surfaces.

For this repository, graph-guided quality work should pay special attention to large admin pages, item detail/edit/create flows, Supabase SQL functions, backup and secret-handling scripts, auth/login helpers, local Supabase tooling, and generated deployment config.

## Tool Order

Prefer MCP graph tools before broad local search:

1. `list_projects` and `index_status` to identify the current project and freshness.
2. `get_graph_schema` before complex graph queries.
3. `search_graph` for symbols, routes, resources, files, classes, and methods.
4. `trace_path` for callers, callees, data flow, and cross-service links.
5. `get_code_snippet` after `search_graph` returns the exact qualified name.
6. `query_graph` for read-only multi-hop Cypher-style questions.
7. `get_architecture` for a high-level map.
8. `search_code` for indexed text search.

Fall back to `rg` and direct reads for exact string literals, user-facing copy, docs, shell scripts, config files, migrations, or when MCP results are incomplete.

## Prompting Agents

Humans can ask a coding agent to use the graph with a short prompt:

```text
Use the repository instructions and `.agents/skills/codebase-memory-stewardship/SKILL.md`, then use codebase-memory-mcp before broad file reads. Build or update the graph if needed, inspect impact before changing shared code, and keep generated graph state out of Git unless explicitly requested.
```

For code reviews:

```text
Use codebase-memory-mcp to inspect changed files, affected symbols, callers, routes, data-flow context, and risk before reviewing the diff. Report findings with file and line references, and do not rely on the graph as the only evidence when source reads or tests are needed.
```

For refactors:

```text
Use codebase-memory-mcp for blast-radius and dependency context first, then read the exact source files, make the smallest coherent change, and run the repository checks that prove the behavior.
```

## Boundaries

The graph is an assistant, not a source of truth. Git, committed docs, tests, scripts, migrations, runtime config, and source reads remain authoritative. Agents should verify claims with exact files and commands before making changes or reporting completion.

Generated graph reports, visualizations, GraphML, Cypher output, SVGs, and `.codebase-memory/` artifacts are local working artifacts by default. Keep durable conclusions as focused code changes, tests, docs, or compact entries in `docs/optimization-options.md`.
