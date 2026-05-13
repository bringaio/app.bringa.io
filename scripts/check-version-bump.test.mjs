import assert from "node:assert/strict";
import test from "node:test";

import { checkVersionBump, compareSemver, parseArgs, parseSemver } from "./check-version-bump.mjs";

test("parses simple semver versions", () => {
  assert.deepEqual(parseSemver("1.2.3"), { major: 1, minor: 2, patch: 3 });
  assert.equal(compareSemver("1.2.4", "1.2.3"), 1);
  assert.equal(compareSemver("1.3.0", "1.2.9"), 1);
  assert.equal(compareSemver("2.0.0", "1.99.99"), 1);
  assert.equal(compareSemver("1.2.3", "1.2.3"), 0);
  assert.equal(compareSemver("1.2.2", "1.2.3"), -1);
});

test("rejects invalid app versions", () => {
  assert.throws(() => parseSemver("1.2"), /valid semver/);
  assert.throws(() => parseSemver("01.2.3"), /valid semver/);
  assert.throws(() => parseSemver("v1.2.3"), /valid semver/);
});

test("parses pnpm argument separator before base ref", () => {
  assert.deepEqual(parseArgs(["--", "--base", "origin/main"]), { baseRef: "origin/main" });
});

test("allows clean comparisons without a version bump", () => {
  assert.deepEqual(checkVersionBump({
    basePackageJson: JSON.stringify({ version: "1.2.3" }),
    currentPackageJson: JSON.stringify({ version: "1.2.3" }),
    changedFiles: [],
  }), {
    changed: false,
    baseVersion: "1.2.3",
    currentVersion: "1.2.3",
  });
});

test("requires changed branches to increase package version", () => {
  assert.throws(
    () => checkVersionBump({
      basePackageJson: JSON.stringify({ version: "1.2.3" }),
      currentPackageJson: JSON.stringify({ version: "1.2.3" }),
      changedFiles: ["docs/forking.md"],
    }),
    /must be greater than base version 1\.2\.3/,
  );

  assert.throws(
    () => checkVersionBump({
      basePackageJson: JSON.stringify({ version: "1.2.3" }),
      currentPackageJson: JSON.stringify({ version: "1.2.2" }),
      changedFiles: ["src/app/settings/page.tsx"],
    }),
    /must be greater than base version 1\.2\.3/,
  );
});

test("accepts a greater package version when files changed", () => {
  assert.deepEqual(checkVersionBump({
    basePackageJson: JSON.stringify({ version: "1.2.3" }),
    currentPackageJson: JSON.stringify({ version: "1.3.0" }),
    changedFiles: ["src/components/layout/topbar.tsx"],
  }), {
    changed: true,
    baseVersion: "1.2.3",
    currentVersion: "1.3.0",
  });
});
