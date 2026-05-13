/**
 * Verifies changed branches increase the single app version in package.json.
 *
 * Source of truth: `package.json.version`.
 * Side effects: None beyond CLI output and exit status.
 *
 * @module scripts/check-version-bump
 */
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultBaseRef = "origin/main";

export function parseSemver(version) {
  const match = String(version).match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  if (!match) {
    throw new Error(`Expected package.json version to be valid semver in x.y.z format: ${version}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function compareSemver(left, right) {
  const parsedLeft = parseSemver(left);
  const parsedRight = parseSemver(right);

  for (const key of ["major", "minor", "patch"]) {
    if (parsedLeft[key] > parsedRight[key]) return 1;
    if (parsedLeft[key] < parsedRight[key]) return -1;
  }

  return 0;
}

function versionFromPackageJson(packageJson, label) {
  let parsed;
  try {
    parsed = JSON.parse(packageJson);
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }

  parseSemver(parsed.version);
  return parsed.version;
}

export function checkVersionBump({
  basePackageJson,
  currentPackageJson,
  changedFiles,
}) {
  const baseVersion = versionFromPackageJson(basePackageJson, "base package.json");
  const currentVersion = versionFromPackageJson(currentPackageJson, "current package.json");
  const changed = changedFiles.length > 0;

  if (!changed) {
    return { changed, baseVersion, currentVersion };
  }

  if (compareSemver(currentVersion, baseVersion) <= 0) {
    throw new Error(
      `package.json version ${currentVersion} must be greater than base version ${baseVersion} when files changed.`,
    );
  }

  return { changed, baseVersion, currentVersion };
}

export function parseArgs(argv) {
  const options = { baseRef: defaultBaseRef };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    }
    if (arg === "--base") {
      options.baseRef = argv[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.baseRef) {
    throw new Error("Expected --base to be followed by a Git ref.");
  }

  return options;
}

function git(args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  } catch (error) {
    const detail = error.stderr?.toString().trim() || error.message;
    throw new Error(`Git command failed: git ${args.join(" ")}\n${detail}`);
  }
}

function changedFilesSince(baseRef) {
  const mergeBase = git(["merge-base", baseRef, "HEAD"]);
  const output = git(["diff", "--name-only", mergeBase]);
  return output ? output.split(/\r?\n/).filter(Boolean) : [];
}

async function currentPackageJson() {
  return readFile(path.join(root, "package.json"), "utf8");
}

function basePackageJson(baseRef) {
  return git(["show", `${baseRef}:package.json`]);
}

export async function main(argv = process.argv.slice(2)) {
  const { baseRef } = parseArgs(argv);
  const result = checkVersionBump({
    basePackageJson: basePackageJson(baseRef),
    currentPackageJson: await currentPackageJson(),
    changedFiles: changedFilesSince(baseRef),
  });

  if (!result.changed) {
    console.log(`Version bump check passed: no changes compared with ${baseRef}.`);
    return;
  }

  console.log(`Version bump check passed: ${result.baseVersion} -> ${result.currentVersion}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
