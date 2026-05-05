import assert from "node:assert/strict";
import test from "node:test";

import {
  checkOptimizationOptionsContent,
  extractSections,
} from "./check-optimization-options.mjs";

test("extracts markdown sections by heading", () => {
  const sections = extractSections(`# Title

## One

Body one.

## Two

Body two.
`);

  assert.equal(sections.get("One")?.trim(), "Body one.");
  assert.equal(sections.get("Two")?.trim(), "Body two.");
});

test("accepts structured roadmap, deferred, and question sections", () => {
  assert.doesNotThrow(() => checkOptimizationOptionsContent(`---
title: Optimization Options
---

# Optimization Options

## How To Record Ideas

- Add ideas.

## Active Goal Candidates

- Supabase contract alignment: reconcile surfaces. Impact: improves reliability.

## Product Model

- Item ownership: clarify ownership. Impact: improves deletion semantics.

## Media

- Image lifecycle: define cleanup. Impact: protects privacy.

## User And Admin Workflows

- Moderation follow-through: keep queues useful. Impact: improves quality.

## App Experience

- Responsive QA: test target viewports. Impact: improves accessibility.

## Operations

- Backups: test restore drills. Impact: improves recovery confidence.

## Developer Experience

- Test strategy: extend focused checks. Impact: improves refactors.

## Deferred Until Explicit Decision

- Full decentralized architecture.

## Questions Waiting For User

- Should profiles be public by default?

## Hyperoptimum Reminder

Prefer small coherent steps.
`));
});

test("rejects roadmap entries without impact", () => {
  assert.throws(
    () => checkOptimizationOptionsContent(`---
title: Optimization Options
---

# Optimization Options

## How To Record Ideas
- Add ideas.

## Active Goal Candidates

- Missing impact: this is not enough.

## Product Model
- Item ownership: clarify ownership. Impact: improves deletion semantics.
## Media
- Image lifecycle: define cleanup. Impact: protects privacy.
## User And Admin Workflows
- Moderation follow-through: keep queues useful. Impact: improves quality.
## App Experience
- Responsive QA: test target viewports. Impact: improves accessibility.
## Operations
- Backups: test restore drills. Impact: improves recovery confidence.
## Developer Experience
- Test strategy: extend focused checks. Impact: improves refactors.
## Deferred Until Explicit Decision
- Deferred item.
## Questions Waiting For User
- Should profiles be public by default?
## Hyperoptimum Reminder
Prefer small coherent steps.
`),
    /Active Goal Candidates.*Impact::.*Missing impact/s,
  );
});

test("rejects user questions that are not questions", () => {
  assert.throws(
    () => checkOptimizationOptionsContent(`---
title: Optimization Options
---

# Optimization Options

## How To Record Ideas
- Add ideas.

## Active Goal Candidates
- Supabase contract alignment: reconcile surfaces. Impact: improves reliability.
## Product Model
- Item ownership: clarify ownership. Impact: improves deletion semantics.
## Media
- Image lifecycle: define cleanup. Impact: protects privacy.
## User And Admin Workflows
- Moderation follow-through: keep queues useful. Impact: improves quality.
## App Experience
- Responsive QA: test target viewports. Impact: improves accessibility.
## Operations
- Backups: test restore drills. Impact: improves recovery confidence.
## Developer Experience
- Test strategy: extend focused checks. Impact: improves refactors.
## Deferred Until Explicit Decision
- Deferred item.
## Questions Waiting For User
- Decide profile visibility.
## Hyperoptimum Reminder
Prefer small coherent steps.
`),
    /Questions Waiting For User.*must end with a question mark/s,
  );
});
