import assert from "node:assert/strict";
import test from "node:test";

import { checkWorkflowContent, extractWorkflowTriggers } from "./check-github-workflows.mjs";

test("extracts manual workflow triggers from block syntax", () => {
  const triggers = extractWorkflowTriggers(`name: CI

on:
  workflow_dispatch:

jobs:
  quality:
    runs-on: ubuntu-latest
`);

  assert.deepEqual([...triggers], ["workflow_dispatch"]);
});

test("accepts the CI workflow when it checks the secret-free quality gates", () => {
  const triggers = checkWorkflowContent(".github/workflows/ci.yml", `name: CI

on:
  workflow_dispatch:

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - uses: denoland/setup-deno@v2
      - run: pnpm check:supabase-cli
      - run: pnpm check:local-supabase
      - run: pnpm check:security-maintenance
      - run: pnpm check:version-bump
      - run: pnpm check:edge-functions
      - run: pnpm check:production-bundle
`);

  assert.deepEqual([...triggers], ["workflow_dispatch"]);
});

test("requires the CI workflow to check Supabase CLI and Edge Functions", () => {
  assert.throws(
    () => checkWorkflowContent(".github/workflows/ci.yml", `name: CI

on:
  workflow_dispatch:

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
`),
    /check:supabase-cli|check:local-supabase|Deno before checking Supabase Edge Functions|check:edge-functions/,
  );
});

test("requires the CI workflow to check the repo-local Supabase CLI contract", () => {
  assert.throws(
    () => checkWorkflowContent(".github/workflows/ci.yml", `name: CI

on:
  workflow_dispatch:

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - uses: denoland/setup-deno@v2
      - run: pnpm check:edge-functions
`),
    /check:supabase-cli/,
  );
});

test("requires the CI workflow to check local Supabase development guardrails", () => {
  assert.throws(
    () => checkWorkflowContent(".github/workflows/ci.yml", `name: CI

on:
  workflow_dispatch:

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - uses: denoland/setup-deno@v2
      - run: pnpm check:supabase-cli
      - run: pnpm check:security-maintenance
      - run: pnpm check:edge-functions
`),
    /check:local-supabase/,
  );
});

test("requires the CI workflow to check security maintenance guardrails", () => {
  assert.throws(
    () => checkWorkflowContent(".github/workflows/ci.yml", `name: CI

on:
  workflow_dispatch:

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - uses: denoland/setup-deno@v2
      - run: pnpm check:supabase-cli
      - run: pnpm check:local-supabase
      - run: pnpm check:edge-functions
`),
    /check:security-maintenance/,
  );
});

test("requires the CI workflow to check production bundles after static build output exists", () => {
  assert.throws(
    () => checkWorkflowContent(".github/workflows/ci.yml", `name: CI

on:
  workflow_dispatch:

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - uses: denoland/setup-deno@v2
      - run: pnpm check:supabase-cli
      - run: pnpm check:local-supabase
      - run: pnpm check:security-maintenance
      - run: pnpm check:version-bump
      - run: pnpm check:edge-functions
`),
    /check:production-bundle/,
  );
});

test("requires the CI workflow to check version bumps", () => {
  assert.throws(
    () => checkWorkflowContent(".github/workflows/ci.yml", `name: CI

on:
  workflow_dispatch:

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - uses: denoland/setup-deno@v2
      - run: pnpm check:supabase-cli
      - run: pnpm check:local-supabase
      - run: pnpm check:security-maintenance
      - run: pnpm check:edge-functions
      - run: pnpm check:production-bundle
`),
    /check:version-bump/,
  );
});

test("requires the CI workflow to fetch Git history for version comparisons", () => {
  assert.throws(
    () => checkWorkflowContent(".github/workflows/ci.yml", `name: CI

on:
  workflow_dispatch:

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 1
      - uses: denoland/setup-deno@v2
      - run: pnpm check:supabase-cli
      - run: pnpm check:local-supabase
      - run: pnpm check:security-maintenance
      - run: pnpm check:version-bump
      - run: pnpm check:edge-functions
      - run: pnpm check:production-bundle
`),
    /fetch-depth: 0/,
  );
});

test("requires the Pages workflow to check production bundles before artifact upload", () => {
  assert.throws(
    () => checkWorkflowContent(".github/workflows/pages.yml", `name: Pages

on:
  workflow_run:
    workflows: ["CI"]
    branches: [main]
    types: [completed]
  workflow_dispatch:

jobs:
  build:
    if: \${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - run: pnpm build
`),
    /check:production-bundle/,
  );
});

test("accepts the Pages workflow when it runs after successful CI", () => {
  const triggers = checkWorkflowContent(".github/workflows/pages.yml", `name: Pages

on:
  workflow_run:
    workflows: ["CI"]
    branches: [main]
    types: [completed]
  workflow_dispatch:

jobs:
  build:
    if: \${{ github.event_name == 'workflow_dispatch' || github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - run: pnpm build
      - run: pnpm check:production-bundle
`);

  assert.deepEqual([...triggers].sort(), ["workflow_dispatch", "workflow_run"]);
});

test("rejects direct push triggers on the Pages workflow", () => {
  assert.throws(
    () => checkWorkflowContent(".github/workflows/pages.yml", `name: Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm check:production-bundle
`),
    /after successful CI instead of directly on push/,
  );
});

test("accepts the e2e workflow when it is manual-only and runs Playwright against local Supabase", () => {
  const triggers = checkWorkflowContent(".github/workflows/e2e.yml", `name: E2E

on:
  workflow_dispatch:

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm exec supabase start >/dev/null
      - run: pnpm setup:local-supabase --force --seed
      - run: pnpm doctor:local-supabase
      - run: pnpm test:e2e:ci
      - uses: actions/upload-artifact@v4
        with:
          path: |
            playwright-report/
            test-results/
`);

  assert.deepEqual([...triggers], ["workflow_dispatch"]);
});

test("rejects push triggers on the e2e workflow", () => {
  assert.throws(
    () => checkWorkflowContent(".github/workflows/e2e.yml", `name: E2E

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm exec supabase start >/dev/null
      - run: pnpm setup:local-supabase --force --seed
      - run: pnpm doctor:local-supabase
      - run: pnpm test:e2e:ci
      - uses: actions/upload-artifact@v4
        with:
          path: |
            playwright-report/
            test-results/
`),
    /must stay manual-only/,
  );
});

test("requires the e2e workflow to install Chromium before running tests", () => {
  assert.throws(
    () => checkWorkflowContent(".github/workflows/e2e.yml", `name: E2E

on:
  workflow_dispatch:

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm exec supabase start >/dev/null
      - run: pnpm setup:local-supabase --force --seed
      - run: pnpm doctor:local-supabase
      - run: pnpm test:e2e:ci
`),
    /playwright install --with-deps chromium/,
  );
});

test("accepts push triggers alongside workflow_dispatch", () => {
  const triggers = extractWorkflowTriggers(`name: CI

on:
  push:
    branches: [main]
  workflow_dispatch:
`);

  assert.deepEqual([...triggers].sort(), ["push", "workflow_dispatch"]);
});

test("rejects inline arrays with non-allowed triggers", () => {
  assert.throws(
    () => checkWorkflowContent(".github/workflows/pages.yml", "on: [workflow_dispatch, pull_request]"),
    /only allows .*pull_request/s,
  );
});

test("rejects schedule even when workflow_dispatch is present", () => {
  assert.throws(
    () => checkWorkflowContent(".github/workflows/nightly.yml", `on:
  workflow_dispatch:
  schedule:
    - cron: "0 0 * * *"
`),
    /only allows .*schedule/s,
  );
});

test("requires workflow_dispatch for every workflow", () => {
  assert.throws(
    () => checkWorkflowContent(".github/workflows/nightly.yml", `on:
  schedule:
    - cron: "0 0 * * *"
`),
    /must include workflow_dispatch/,
  );
});
