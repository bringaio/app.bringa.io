import assert from "node:assert/strict";
import test from "node:test";

import { renderIssuePrompt } from "../src/lib/issue-prompt.ts";

test("renders deployment issue prompts with repository links", () => {
  assert.equal(
    renderIssuePrompt("Open an issue for <repo-url>.\n<repo-url>", "https://github.com/example/app"),
    "Open an issue for https://github.com/example/app.\nhttps://github.com/example/app",
  );
});

test("keeps issue prompt output trimmed with a fallback repository label", () => {
  assert.equal(renderIssuePrompt("  Open an issue for <repo-url>.  ", ""), "Open an issue for this repository.");
});
