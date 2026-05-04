---
name: hyperoptimum-stewardship
description: Use when judging architecture, modularization, refactoring, technical debt, optimization opportunities, roadmap tradeoffs, or agent behavior in this repository.
---

# Hyperoptimum Stewardship

Use this skill to keep improvement ideas visible without derailing the current task.

## Read First

- `docs/hyperoptimum.md`
- `docs/optimization-options.md`
- `.agents/rules/source-of-truth.md`

## Practice

- Keep the current task central.
- Prefer small, reversible, verified improvements over broad speculative refactors.
- When you notice a useful but out-of-scope idea, add it to `docs/optimization-options.md`.
- Include likely impact, affected area, uncertainty, possible side effects, and research needs when those are not obvious.
- Ask before implementing unrelated refactors, legal changes, production data access, new packages, or irreversible operations.
- Remove optimization entries once implementation or durable docs become the source of truth.

## Entry Shape

Use compact wording:

```text
- Area: idea. Impact: why it matters. Uncertainty/research: what must be checked before implementation.
```

If there is no uncertainty, omit that clause.
