import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const supabaseSecretKeyPattern = /\bsb_secret_[A-Za-z0-9_-]{20,}\b/g;
const jwtPattern = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const binaryExtensions = new Set([
  ".ico",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
]);

function isAllowedPlaceholder(value) {
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  return (
    trimmed === "" ||
    trimmed.startsWith("<") ||
    /^REDACTED/i.test(trimmed) ||
    /^replace-/i.test(trimmed)
  );
}

function lineNumberForIndex(content, index) {
  let lineNumber = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (content[cursor] === "\n") lineNumber += 1;
  }
  return lineNumber;
}

function decodeJwtPayload(token) {
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

function addMatch(matches, filePath, lineNumber, kind) {
  if (!matches.some((match) => match.filePath === filePath && match.lineNumber === lineNumber && match.kind === kind)) {
    matches.push({ filePath, lineNumber, kind });
  }
}

export function findSecretCandidatesInContent(filePath, content) {
  const matches = [];
  const lines = content.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    const assignment = line.match(/^\s*SUPABASE_SERVICE_ROLE_KEY\s*=\s*(.*)$/);
    if (assignment && !isAllowedPlaceholder(assignment[1])) {
      addMatch(matches, filePath, index + 1, "nonblank Supabase service role assignment");
    }

    supabaseSecretKeyPattern.lastIndex = 0;
    if (supabaseSecretKeyPattern.test(line)) {
      addMatch(matches, filePath, index + 1, "Supabase secret API key");
    }
  }

  jwtPattern.lastIndex = 0;
  for (const match of content.matchAll(jwtPattern)) {
    const payload = decodeJwtPayload(match[0]);
    if (payload?.role === "service_role") {
      addMatch(matches, filePath, lineNumberForIndex(content, match.index ?? 0), "legacy Supabase service_role JWT");
    }
  }

  return matches;
}

async function trackedFilePaths() {
  const { stdout } = await execFileAsync("git", ["ls-files", "-z"], { cwd: root, encoding: "buffer" });
  return stdout
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
}

async function readTrackedTextFiles() {
  const files = new Map();

  for (const filePath of await trackedFilePaths()) {
    if (binaryExtensions.has(path.extname(filePath).toLowerCase())) {
      continue;
    }

    const buffer = await readFile(path.join(root, filePath));
    if (buffer.includes(0)) {
      continue;
    }
    files.set(filePath, buffer.toString("utf8"));
  }

  return files;
}

export async function findCommittedSecretCandidates({ files } = {}) {
  const sourceFiles = files ?? await readTrackedTextFiles();
  const matches = [];

  for (const [filePath, content] of sourceFiles) {
    matches.push(...findSecretCandidatesInContent(filePath, content));
  }

  return matches.sort((a, b) => (
    a.filePath.localeCompare(b.filePath) ||
    a.lineNumber - b.lineNumber ||
    a.kind.localeCompare(b.kind)
  ));
}

export async function main() {
  const matches = await findCommittedSecretCandidates();

  if (matches.length === 0) {
    console.log("Secret leak check passed.");
    return;
  }

  console.error("Potential committed Supabase secrets found:");
  for (const match of matches) {
    console.error(`- ${match.filePath}:${match.lineNumber}: ${match.kind}`);
  }
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
