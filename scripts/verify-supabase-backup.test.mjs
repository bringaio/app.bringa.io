import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { verifyBackupDirectory } from "./verify-supabase-backup.mjs";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

test("verifies table JSON and storage object hashes in a Supabase backup", async () => {
  const backupDir = await mkdtemp(path.join(tmpdir(), "bringa-backup-verify-"));
  try {
    await mkdir(path.join(backupDir, "storage", "items"), { recursive: true });
    await writeFile(path.join(backupDir, "profiles.json"), `${JSON.stringify([{ id: "profile-1" }], null, 2)}\n`);
    await writeFile(path.join(backupDir, "storage", "items", "item.webp"), "image");
    await writeFile(path.join(backupDir, "storage", "items.manifest.json"), `${JSON.stringify({
      bucket: "items",
      objectCount: 1,
      bytes: 5,
      objects: [
        {
          path: "item.webp",
          bytes: 5,
          sha256: sha256("image"),
        },
      ],
    }, null, 2)}\n`);
    await writeFile(path.join(backupDir, "manifest.json"), `${JSON.stringify({
      tables: { profiles: 1 },
      storage: { items: { objects: 1, bytes: 5 } },
      authUsers: { exported: false, users: null },
    }, null, 2)}\n`);

    const summary = await verifyBackupDirectory(backupDir);

    assert.deepEqual(summary, {
      tableCount: 1,
      tableRows: 1,
      storageBucketCount: 1,
      storageObjectCount: 1,
      storageBytes: 5,
      authUsersExported: false,
      authUserCount: null,
    });
  } finally {
    await rm(backupDir, { recursive: true, force: true });
  }
});

test("rejects drifted storage object hashes", async () => {
  const backupDir = await mkdtemp(path.join(tmpdir(), "bringa-backup-verify-"));
  try {
    await mkdir(path.join(backupDir, "storage", "items"), { recursive: true });
    await writeFile(path.join(backupDir, "profiles.json"), "[]\n");
    await writeFile(path.join(backupDir, "storage", "items", "item.webp"), "changed");
    await writeFile(path.join(backupDir, "storage", "items.manifest.json"), `${JSON.stringify({
      bucket: "items",
      objectCount: 1,
      bytes: 5,
      objects: [
        {
          path: "item.webp",
          bytes: 5,
          sha256: sha256("image"),
        },
      ],
    }, null, 2)}\n`);
    await writeFile(path.join(backupDir, "manifest.json"), `${JSON.stringify({
      tables: { profiles: 0 },
      storage: { items: { objects: 1, bytes: 5 } },
      authUsers: { exported: false, users: null },
    }, null, 2)}\n`);

    await assert.rejects(
      () => verifyBackupDirectory(backupDir),
      /Storage object drift/,
    );
  } finally {
    await rm(backupDir, { recursive: true, force: true });
  }
});
