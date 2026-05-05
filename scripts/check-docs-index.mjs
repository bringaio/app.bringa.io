import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function topLevelDocs(docsDir) {
  const entries = await readdir(docsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "index.md")
    .map((entry) => entry.name)
    .sort();
}

export async function findMissingDocsIndexLinks({ docsDir }) {
  const docs = await topLevelDocs(docsDir);

  const indexText = await readFile(path.join(docsDir, "index.md"), "utf8");
  const linkedDocs = new Set(
    [...indexText.matchAll(/\]\(([^)#?]+\.md)(?:[#?][^)]*)?\)/g)]
      .map((match) => path.basename(match[1]))
      .filter((name) => name !== "index.md"),
  );

  return docs.filter((doc) => !linkedDocs.has(doc));
}

export async function findMissingDocsNavLinks({ docsDir }) {
  const docs = await topLevelDocs(docsDir);
  const layoutText = await readFile(path.join(docsDir, "_layouts", "default.html"), "utf8");
  const linkedDocs = new Set(
    [...layoutText.matchAll(/href="[^"]*\/([^/"]+)\.html[^"]*"/g)]
      .map((match) => `${match[1]}.md`)
      .filter((name) => name !== "index.md"),
  );

  return docs.filter((doc) => !linkedDocs.has(doc));
}

async function main() {
  const docsDir = path.join(process.cwd(), "docs");
  const missingFromIndex = await findMissingDocsIndexLinks({ docsDir });
  const missingFromNav = await findMissingDocsNavLinks({ docsDir });

  if (missingFromIndex.length > 0 || missingFromNav.length > 0) {
    if (missingFromIndex.length > 0) {
      console.error(`docs/index.md is missing links to: ${missingFromIndex.join(", ")}`);
    }
    if (missingFromNav.length > 0) {
      console.error(`docs/_layouts/default.html is missing nav links to: ${missingFromNav.join(", ")}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Docs index and navigation checks passed.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
