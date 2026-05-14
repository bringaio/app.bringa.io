---
title: Agentic Development
---

# Agentic Development

This repository is intended to be pleasant for humans and coding agents. Agents should read `AGENTS.md`, then the relevant workflows and skills under `.agents/`, before changing behavior.

## Code Review Graph

`code-review-graph` is the current local code graph tool for this repository. It builds a persistent structural graph from the checkout and exposes it to supported AI coding tools through MCP.

Keep `.code-review-graph/` ignored. The graph is a generated local SQLite database that records local paths, branch state, commit state, and index metadata. It can be rebuilt from Git and should not be shared through commits, pull requests, issues, docs, screenshots, or generated public content.

Developers and agents on the same machine can use the same local `.code-review-graph/` for one checkout after their AI tool is configured. Developers on different machines should build their own graph from the repository.

## Setup

Install the CLI in an isolated Python app environment:

```bash
uv tool install code-review-graph
```

If `uv` is unavailable, use `pipx`:

```bash
pipx install code-review-graph
```

For one-off use without installing a persistent executable:

```bash
uvx --from code-review-graph code-review-graph status --repo .
```

Configure the AI coding tool you use:

```bash
code-review-graph install --platform codex --repo .
```

Other supported platform names can be listed with:

```bash
code-review-graph install --help
```

The installer can target tools such as Codex, Claude Code, Cursor, Gemini CLI, OpenCode, Continue, Kiro, and GitHub Copilot. Use one platform name at a time when you want predictable setup.

Build the graph:

```bash
code-review-graph build --repo .
code-review-graph status --repo .
```

Restart the AI coding tool after install so MCP configuration is loaded.

## Keeping The Graph Fresh

Run an incremental update after pulling, switching branches, or changing files outside an agent workflow:

```bash
code-review-graph update --repo .
```

Run a full rebuild after upgrading `code-review-graph`, after large file moves, or when `status` looks stale:

```bash
code-review-graph build --repo .
```

For long sessions, use watch mode or the daemon:

```bash
code-review-graph watch --repo .
crg-daemon add "$(pwd)" --alias bringa
crg-daemon start
crg-daemon status
```

The installer may add local hooks for supported tools and Git. Treat those hooks as machine-local helper state, not as source-controlled project state.

## Maximum-Benefit Workflows

Use the graph to decide what to read, not to avoid reading. The graph is most useful for:

- branch and pull request review with `detect-changes`;
- pre-merge checks that combine graph risk with repository checks;
- refactor planning around large functions, hub nodes, bridge nodes, affected flows, and surprising cross-community coupling;
- debugging by tracing callers, callees, and execution flows before opening files;
- architecture orientation through communities and critical flows;
- onboarding a new human or agent to the main app, Supabase, scripts, and docs surfaces.

For branch work, prefer a merge-base ref:

```bash
BASE="$(git merge-base origin/main HEAD)"
code-review-graph update --repo . --base "$BASE"
code-review-graph detect-changes --repo . --base "$BASE" --brief
```

When MCP tools are available, ask the agent to use `get_minimal_context_tool` first, then choose from `detect_changes_tool`, `get_review_context_tool`, `get_affected_flows_tool`, `find_large_functions_tool`, `get_hub_nodes_tool`, `get_bridge_nodes_tool`, `get_knowledge_gaps_tool`, `get_surprising_connections_tool`, `list_flows_tool`, and `list_communities_tool` as needed.

For this repository, graph-guided quality work should pay special attention to large admin pages, item detail/edit/create flows, Supabase SQL functions, backup and secret-handling scripts, auth/login helpers, and local Supabase tooling.

## Prompting Agents

Humans can ask a coding agent to use the graph with a short prompt:

```text
Use the repository instructions and `.agents/skills/code-review-graph-stewardship/SKILL.md`, then use code-review-graph before broad file reads. Build or update the graph if needed, inspect impact before changing shared code, and keep `.code-review-graph/` out of Git.
```

For code reviews:

```text
Use code-review-graph to inspect the changed files, risk score, affected flows, callers, and test gaps before reviewing the diff. Report findings with file and line references, and do not rely on the graph as the only evidence when source reads or tests are needed.
```

For refactors:

```text
Use code-review-graph for blast-radius and dependency context first, then read the exact source files, make the smallest coherent change, and run the repository checks that prove the behavior.
```

## Boundaries

The graph is an assistant, not a source of truth. Git, committed docs, tests, scripts, migrations, and runtime config remain authoritative. Agents should still verify claims with source reads and commands before making changes or reporting completion.

Generated graph reports, visualizations, wiki pages, GraphML, Cypher, SVG, and Obsidian exports are local working artifacts. Keep durable conclusions as focused code changes, tests, docs, or compact entries in `docs/optimization-options.md`.
