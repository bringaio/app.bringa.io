import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { findForbiddenEnglishCopyTerms } from "./check-copy.mjs";

const forbiddenSingular = "Ver" + "ein";
const forbiddenPlural = `${forbiddenSingular}e`;

async function withFixture(files, callback) {
  const root = await mkdtemp(path.join(os.tmpdir(), "bringa-copy-check-"));

  try {
    for (const [filePath, content] of Object.entries(files)) {
      const absolutePath = path.join(root, filePath);
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, content);
    }

    await callback(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("finds forbidden German organization words in English docs", async () => {
  await withFixture(
    {
      "docs/index.md": `A ${forbiddenSingular} should not appear in English docs.\n`,
      "docs/nested/page.md": `English copy for local ${forbiddenPlural}.\n`,
      "docs/allowed.md": "Avereine and vereinbarung are not exact words.\n",
    },
    async (root) => {
      const matches = await findForbiddenEnglishCopyTerms({ root, targets: ["docs"] });

      assert.deepEqual(
        matches.map(({ relativePath, lineNumber, term }) => ({ relativePath, lineNumber, term })),
        [
          { relativePath: "docs/index.md", lineNumber: 1, term: forbiddenSingular },
          { relativePath: "docs/nested/page.md", lineNumber: 1, term: forbiddenPlural },
        ],
      );
    },
  );
});

test("ignores configured documentation paths", async () => {
  await withFixture(
    {
      "docs/index.md": "English copy is clean.\n",
      "docs/prompts/legacy.md": `Legacy prompt with ${forbiddenSingular} is ignored.\n`,
    },
    async (root) => {
      const matches = await findForbiddenEnglishCopyTerms({
        root,
        targets: ["docs"],
        ignoredPathPrefixes: ["docs/prompts/"],
      });

      assert.deepEqual(matches, []);
    },
  );
});

test("scans contributor docs when configured", async () => {
  await withFixture(
    {
      "README.md": "Clean upstream copy.\n",
      ".github/CONTRIBUTING.md": `Contributor copy with ${forbiddenSingular}.\n`,
      ".github/CODE_OF_CONDUCT.md": "Conduct copy is clean.\n",
    },
    async (root) => {
      const matches = await findForbiddenEnglishCopyTerms({
        root,
        targets: ["README.md", ".github/CONTRIBUTING.md", ".github/CODE_OF_CONDUCT.md"],
      });

      assert.deepEqual(
        matches.map(({ relativePath, lineNumber, term }) => ({ relativePath, lineNumber, term })),
        [{ relativePath: ".github/CONTRIBUTING.md", lineNumber: 1, term: forbiddenSingular }],
      );
    },
  );
});
