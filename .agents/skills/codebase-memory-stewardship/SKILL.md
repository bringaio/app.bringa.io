---
name: codebase-memory-stewardship
description: Use when reviewing, debugging, refactoring, exploring architecture, checking blast radius, planning code quality work, or answering structural code questions in this repository with codebase-memory-mcp MCP graph tools.
---

# Codebase Memory Stewardship

Use `codebase-memory-mcp` as the first routing layer for code discovery. Treat it as a structural map, not as the source of truth: verify important claims against exact source files and repository checks.

## Read First

- `docs/agentic-development.md`
- `.agents/workflows/quality-loop.md`
- `.agents/skills/hyperoptimum-stewardship/SKILL.md` when graph findings become refactor, modularity, or architecture decisions

## Setup Check

1. Prefer MCP tools when they are available.
2. Run `list_projects`.
3. If this checkout is missing or stale, run:

```text
index_repository(repo_path="/Users/totoiusbobinius/code/app.bringa.io", mode="fast")
```

Use `mode="moderate"` or `mode="full"` only when semantic search, `SIMILAR_TO`, or `SEMANTICALLY_RELATED` edges are useful enough to justify extra indexing work. Use `persistence=true` only after deciding to keep `.codebase-memory/graph.db.zst` as a shared repository artifact.

Keep local databases and graph artifacts out of ordinary commits unless the user explicitly asks for a shared graph artifact. The default for this repo is local-only graph state.

## Core Loop

1. Confirm the project name with `list_projects`.
2. Check freshness with `index_status` when available.
3. Use `get_graph_schema` before complex `query_graph` work.
4. Use `search_graph` for symbol, route, class, method, resource, and file-node discovery.
5. Use `trace_path` for inbound callers, outbound callees, cross-service links, or data-flow tracing.
6. Use `get_code_snippet` only after `search_graph` has provided the exact qualified name.
7. Use `detect_changes` before reviewing or changing shared code.
8. Read the exact source files and run targeted checks before reporting completion.

Fallback to `rg` or direct file reads for string literals, user-facing copy, config files, docs, shell scripts, migration text, or when MCP results are incomplete.

## Common Queries

Find a symbol:

```text
search_graph(project="<project>", name_pattern=".*Item.*", label="Function")
```

Trace callers and callees:

```text
trace_path(project="<project>", function_name="createItem", direction="both", depth=3)
```

Read source:

```text
get_code_snippet(project="<project>", qualified_name="<qualified_name>", include_neighbors=true)
```

Inspect change impact:

```text
detect_changes(project="<project>", since="origin/main", depth=3)
```

Run a read-only graph query:

```text
query_graph(project="<project>", query="MATCH (f:Function)-[:CALLS]->(g) RETURN f.name, g.name LIMIT 20")
```

Use `search_code` for indexed text search before falling back to `rg`:

```text
search_code(project="<project>", query="TODO|FIXME")
```

## UI And Local Operation

The 3D browser UI at `http://localhost:9749` requires the upstream UI binary variant. A standard binary can expose MCP tools without serving the UI. If the port is closed, check that the UI variant was installed and started with:

```bash
codebase-memory-mcp --ui=true --port=9749
```

CLI fallback is available when MCP tools are unavailable:

```bash
codebase-memory-mcp cli list_projects
codebase-memory-mcp cli search_graph '{"name_pattern": ".*Handler.*", "label": "Function"}'
codebase-memory-mcp cli trace_path '{"function_name": "Search", "direction": "both"}'
```

Do not reset or delete `~/.cache/codebase-memory-mcp/` unless the user approves. It may contain local indexes for other repositories.

## Repository-Specific Focus

Prioritize graph context around large admin pages, item detail/create/edit flows, Supabase SQL functions, backup and secret-handling scripts, auth/login helpers, local Supabase tooling, and generated deployment config.

For security-sensitive paths, pair graph findings with `.agents/skills/security-maintenance/SKILL.md`. For UI routes, pair graph findings with `.agents/skills/interface-stewardship/SKILL.md` and browser evidence when behavior changes.

## Reporting

Report graph evidence compactly:

- project name, freshness/index status, node and edge counts when relevant;
- tools used and why they changed the decision;
- affected symbols, flows, or risk only when useful;
- exact source files and verification commands used.

Record durable improvement ideas in `docs/optimization-options.md`; do not leave them only in chat.
