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

test("accepts the CI workflow when it checks Supabase CLI and Edge Functions", () => {
  const triggers = checkWorkflowContent(".github/workflows/ci.yml", `name: CI

on:
  workflow_dispatch:

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: denoland/setup-deno@v2
      - run: pnpm check:supabase-cli
      - run: pnpm check:edge-functions
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
`),
    /check:supabase-cli|Deno before checking Supabase Edge Functions|check:edge-functions/,
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
      - uses: denoland/setup-deno@v2
      - run: pnpm check:edge-functions
`),
    /check:supabase-cli/,
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
