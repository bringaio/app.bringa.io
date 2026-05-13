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

test("accepts the CI workflow when it checks Supabase CLI, local Supabase, security maintenance, version bumps, Edge Functions, and production bundles", () => {
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
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm build
`),
    /check:production-bundle/,
  );
});

test("rejects push triggers in workflow blocks", () => {
  assert.throws(
    () => checkWorkflowContent(".github/workflows/ci.yml", `name: CI
on:
  workflow_dispatch:
  push:
`),
    /must stay manual-only.*push/s,
  );
});

test("rejects inline arrays with non-manual triggers", () => {
  assert.throws(
    () => checkWorkflowContent(".github/workflows/pages.yml", "on: [workflow_dispatch, pull_request]"),
    /must stay manual-only.*pull_request/s,
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
