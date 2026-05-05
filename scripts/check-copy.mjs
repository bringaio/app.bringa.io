import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultTargets = [
  "AGENTS.md",
  "README.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md",
  "docs",
  ".agents",
];
const defaultIgnoredPathPrefixes = ["docs/prompts/"];
const textExtensions = new Set([".md", ".mdx", ".txt", ".yml", ".yaml"]);
const forbiddenTermPattern = /\bvereine?\b/giu;

function normalizeRelativePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function isTextFile(filePath) {
  return textExtensions.has(path.extname(filePath).toLowerCase());
}

function isIgnored(relativePath, ignoredPathPrefixes) {
  return ignoredPathPrefixes.some((prefix) => relativePath.startsWith(prefix));
}

async function collectTextFiles({ root, targets, ignoredPathPrefixes }) {
  const files = [];

  async function visit(absolutePath) {
    let info;
    try {
      info = await stat(absolutePath);
    } catch (error) {
      if (error.code === "ENOENT") {
        return;
      }
      throw error;
    }

    const relativePath = normalizeRelativePath(path.relative(root, absolutePath));
    if (isIgnored(relativePath, ignoredPathPrefixes)) {
      return;
    }

    if (info.isDirectory()) {
      const entries = await readdir(absolutePath);
      for (const entry of entries) {
        await visit(path.join(absolutePath, entry));
      }
      return;
    }

    if (info.isFile() && isTextFile(absolutePath)) {
      files.push({ absolutePath, relativePath });
    }
  }

  for (const target of targets) {
    await visit(path.join(root, target));
  }

  return files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

export async function findForbiddenEnglishCopyTerms({
  root,
  targets = defaultTargets,
  ignoredPathPrefixes = defaultIgnoredPathPrefixes,
} = {}) {
  const scanRoot = root || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const files = await collectTextFiles({ root: scanRoot, targets, ignoredPathPrefixes });
  const matches = [];

  for (const file of files) {
    const content = await readFile(file.absolutePath, "utf8");
    const lines = content.split(/\r?\n/);

    for (const [index, line] of lines.entries()) {
      forbiddenTermPattern.lastIndex = 0;
      for (const match of line.matchAll(forbiddenTermPattern)) {
        matches.push({
          relativePath: file.relativePath,
          lineNumber: index + 1,
          term: match[0],
          line: line.trim(),
        });
      }
    }
  }

  return matches;
}

async function main() {
  const matches = await findForbiddenEnglishCopyTerms({ root });

  if (matches.length === 0) {
    console.log("Copy check passed.");
    return;
  }

  console.error("Forbidden German organization words found in English documentation:");
  for (const match of matches) {
    console.error(`- ${match.relativePath}:${match.lineNumber}: ${match.term}`);
  }
  process.exitCode = 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
