import assert from "node:assert/strict";
import test from "node:test";

import {
  checkReleaseChecklist,
  extractCiPnpmCommands,
  extractMarkdownPnpmCommands,
} from "./check-release-checklist.mjs";

test("extracts pnpm commands from GitHub workflow run steps", () => {
  const commands = extractCiPnpmCommands(`
steps:
  - name: Install
    run: pnpm install --frozen-lockfile
  - name: Test
    run: pnpm test:config
`);

  assert.deepEqual([...commands], ["pnpm install --frozen-lockfile", "pnpm test:config"]);
});

test("extracts pnpm commands from markdown code spans", () => {
  const commands = extractMarkdownPnpmCommands(`
- \`pnpm check:config\`
- \`NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=dummy-anon-key pnpm build\`
`);

  assert.deepEqual([...commands], [
    "pnpm check:config",
    "NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=dummy-anon-key pnpm build",
  ]);
});

test("accepts aligned release checklist sources", () => {
  assert.doesNotThrow(() => checkReleaseChecklist({
    packageJson: JSON.stringify({
      scripts: {
        "test:config": "node --test scripts/generate-config.test.mjs",
        "check:config": "node scripts/generate-config.mjs --check",
      },
    }),
    ciYaml: "run: pnpm test:config\nrun: pnpm check:config\nrun: pnpm build\n",
    conventionsMarkdown: "- `pnpm test:config`\n- `pnpm check:config`\n- `pnpm build`\n",
    readinessMarkdown: "- [ ] `pnpm test:config`\n- [ ] `pnpm check:config`\n- [ ] `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=dummy-anon-key pnpm build`\n",
  }));
});

test("rejects CI commands missing from conventions", () => {
  assert.throws(
    () => checkReleaseChecklist({
      packageJson: JSON.stringify({ scripts: { "test:config": "node --test x.mjs" } }),
      ciYaml: "run: pnpm test:config\n",
      conventionsMarkdown: "",
      readinessMarkdown: "- [ ] `pnpm test:config`\n",
    }),
    /docs\/conventions\.md.*pnpm test:config/s,
  );
});

test("rejects release checklist commands missing from package scripts", () => {
  assert.throws(
    () => checkReleaseChecklist({
      packageJson: JSON.stringify({ scripts: {} }),
      ciYaml: "run: pnpm test:missing\n",
      conventionsMarkdown: "- `pnpm test:missing`\n",
      readinessMarkdown: "- [ ] `pnpm test:missing`\n",
    }),
    /package\.json.*test:missing/s,
  );
});
