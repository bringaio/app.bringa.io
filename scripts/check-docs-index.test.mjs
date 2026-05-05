import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { findMissingDocsIndexLinks, findMissingDocsNavLinks } from "./check-docs-index.mjs";

async function writeDoc(root, name, content = "---\ntitle: Test\n---\n\n# Test\n") {
  await writeFile(path.join(root, name), content);
}

test("reports top-level docs missing from docs/index.md", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "bringa-docs-index-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  await mkdir(root, { recursive: true });
  await writeDoc(root, "index.md", "- [Listed](listed.md)\n");
  await writeDoc(root, "listed.md");
  await writeDoc(root, "missing.md");

  const missing = await findMissingDocsIndexLinks({ docsDir: root });

  assert.deepEqual(missing, ["missing.md"]);
});

test("reports top-level docs missing from the GitHub Pages nav", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "bringa-docs-nav-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  await mkdir(path.join(root, "_layouts"), { recursive: true });
  await writeDoc(root, "index.md");
  await writeDoc(root, "listed.md");
  await writeDoc(root, "missing.md");
  await writeFile(
    path.join(root, "_layouts", "default.html"),
    "<nav><a href=\"{{ '/listed.html' | relative_url }}\">Listed</a></nav>\n",
  );

  const missing = await findMissingDocsNavLinks({ docsDir: root });

  assert.deepEqual(missing, ["missing.md"]);
});

test("accepts the current repository docs index", async () => {
  const missing = await findMissingDocsIndexLinks({ docsDir: path.join(process.cwd(), "docs") });

  assert.deepEqual(missing, []);
});

test("accepts the current repository GitHub Pages nav", async () => {
  const missing = await findMissingDocsNavLinks({ docsDir: path.join(process.cwd(), "docs") });

  assert.deepEqual(missing, []);
});
