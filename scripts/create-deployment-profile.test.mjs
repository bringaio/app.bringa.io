import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildDeploymentProfileContent,
  createDeploymentProfile,
  normalizeDeploymentSlug,
  parseArgs,
} from "./create-deployment-profile.mjs";

test("normalizes safe deployment slugs and rejects unsafe paths", () => {
  assert.equal(normalizeDeploymentSlug(" share.example.org "), "share.example.org");
  assert.equal(normalizeDeploymentSlug("community-hub_1"), "community-hub_1");

  for (const slug of ["", "../bad", "bad/path", ".hidden", "bad slug"]) {
    assert.throws(() => normalizeDeploymentSlug(slug), /deployment slug/i);
  }
});

test("builds a fork-ready public deployment profile", () => {
  const content = buildDeploymentProfileContent({
    slug: "share.example.org",
    githubOwner: "example",
    githubRepo: "sharing-app",
    operatorName: "Share Example",
    canonicalUrl: "https://share.example.org",
    supabaseUrl: "https://abc.supabase.co",
    supabasePublishableKey: "public-publishable-key",
  });

  assert.match(content, /Fork deployment profile/);
  assert.match(content, /public browser settings, not secrets/i);
  assert.match(content, /"canonicalUrl": "https:\/\/share\.example\.org"/);
  assert.match(content, /"url": "https:\/\/github\.com\/example\/sharing-app"/);
  assert.match(content, /"issuesUrl": "https:\/\/github\.com\/example\/sharing-app\/issues"/);
  assert.match(content, /"templateMode": "fork"/);
  assert.match(content, /"localDemoMode": true/);
  assert.doesNotMatch(content, /service[_ -]?role/i);
});

test("writes a deployment profile and refuses overwrite by default", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "bringa-deployment-profile-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const result = await createDeploymentProfile({
    root,
    slug: "share.example.org",
    githubOwner: "example",
    githubRepo: "sharing-app",
  });

  assert.equal(result.slug, "share.example.org");
  assert.equal(
    result.relativePath,
    "config/deployments/share.example.org.jsonc",
  );

  const written = await readFile(result.filePath, "utf8");
  assert.match(written, /"name": "share\.example\.org"/);
  assert.match(written, /"owner": "example"/);
  assert.match(written, /"publishableKey": "replace-with-your-public-publishable-key"/);

  await assert.rejects(
    () => createDeploymentProfile({ root, slug: "share.example.org" }),
    /already exists/i,
  );
});

test("previews a deployment profile without writing it in dry run mode", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "bringa-deployment-profile-dry-run-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const result = await createDeploymentProfile({
    root,
    slug: "share.example.org",
    githubOwner: "example",
    githubRepo: "sharing-app",
    dryRun: true,
  });

  assert.equal(result.slug, "share.example.org");
  assert.equal(result.dryRun, true);
  assert.match(result.content, /"name": "share\.example\.org"/);
  await assert.rejects(() => access(result.filePath), /ENOENT/);
});

test("parses pnpm argument separator before deployment options", () => {
  assert.deepEqual(
    parseArgs([
      "--",
      "share.example.org",
      "--owner",
      "example",
      "--repo",
      "sharing-app",
      "--dry-run",
    ]),
    {
      slug: "share.example.org",
      githubOwner: "example",
      githubRepo: "sharing-app",
      dryRun: true,
      force: false,
    },
  );
});
