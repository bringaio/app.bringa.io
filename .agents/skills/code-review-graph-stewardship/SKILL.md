---
name: code-review-graph-stewardship
description: Legacy compatibility shim. Use only when a prompt explicitly mentions code-review-graph; otherwise prefer .agents/skills/codebase-memory-stewardship/ for graph-guided review, debugging, architecture, refactoring, and code discovery in this repository.
---

# Code Review Graph Stewardship

`code-review-graph` has been superseded in this repository by `codebase-memory-mcp`.

Use `.agents/skills/codebase-memory-stewardship/SKILL.md` instead for normal graph-guided work. That skill documents the current MCP tools, setup checks, UI behavior, fallback CLI commands, reporting expectations, and repository-specific focus areas.

If a user explicitly asks about historical `code-review-graph` notes, explain that this repository now uses `codebase-memory-mcp` and route the task through the current skill unless the user specifically needs legacy migration or cleanup context.
