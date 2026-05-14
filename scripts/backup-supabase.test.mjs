import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  backupStorageBucket,
  buildBackupRunRecord,
  defaultTables,
  fetchTable,
  fetchAuthUsers,
  listStorageFiles,
  parseBoolean,
  parseCsvList,
  recordBackupRun,
  resolveSupabaseMaintenanceKey,
  resolveSupabaseMaintenanceUrl,
  safeBackupPath,
} from "./backup-supabase.mjs";

test("parses backup environment values", () => {
  assert.deepEqual(parseCsvList(" items, avatars ,, ", ["fallback"]), ["items", "avatars"]);
  assert.deepEqual(parseCsvList("", ["items"]), ["items"]);
  assert.deepEqual(parseCsvList("none", ["items"]), []);
  assert.equal(parseBoolean("1"), true);
  assert.equal(parseBoolean("true"), true);
  assert.equal(parseBoolean("yes"), true);
  assert.equal(parseBoolean("0"), false);
  assert.equal(parseBoolean(undefined), false);
});

test("prefers Supabase secret keys for trusted server-side maintenance", () => {
  assert.equal(resolveSupabaseMaintenanceKey({
    SUPABASE_SECRET_KEY: "sb_secret_preferred",
    SUPABASE_SERVICE_ROLE_KEY: "legacy-service-role",
  }), "sb_secret_preferred");

  assert.equal(resolveSupabaseMaintenanceKey({
    SUPABASE_SECRET_KEYS: JSON.stringify({ default: "sb_secret_from_map" }),
    SUPABASE_SERVICE_ROLE_KEY: "legacy-service-role",
  }), "sb_secret_from_map");

  assert.equal(resolveSupabaseMaintenanceKey({
    SUPABASE_SERVICE_ROLE_KEY: "legacy-service-role",
  }), "legacy-service-role");

  assert.throws(
    () => resolveSupabaseMaintenanceKey({}),
    /SUPABASE_SECRET_KEY, SUPABASE_SECRET_KEYS, or SUPABASE_SERVICE_ROLE_KEY/,
  );
});

test("derives hosted Supabase maintenance URL from project ref", () => {
  assert.equal(resolveSupabaseMaintenanceUrl({
    SUPABASE_URL: "https://example.supabase.co/",
  }), "https://example.supabase.co");

  assert.equal(resolveSupabaseMaintenanceUrl({
    SUPABASE_PROJECT_REF: "abc123",
  }), "https://abc123.supabase.co");

  assert.throws(() => resolveSupabaseMaintenanceUrl({}), /SUPABASE_URL or SUPABASE_PROJECT_REF/);
});

test("includes operational notification metadata in the default table backup scope", () => {
  assert.ok(defaultTables.includes("notification_events"));
  assert.ok(defaultTables.includes("notification_mutes"));
});

test("fetches tables in deterministic id order", async () => {
  const calls = [];
  const supabase = {
    from(tableName) {
      assert.equal(tableName, "items");
      return {
        select(columns) {
          calls.push(["select", columns]);
          return this;
        },
        order(column, options) {
          calls.push(["order", column, options]);
          return this;
        },
        async range(from, to) {
          calls.push(["range", from, to]);
          return { data: [{ id: "item-1" }], error: null };
        },
      };
    },
  };

  const rows = await fetchTable(supabase, "items", 1000);

  assert.deepEqual(rows, [{ id: "item-1" }]);
  assert.deepEqual(calls, [
    ["select", "*"],
    ["order", "id", { ascending: true }],
    ["range", 0, 999],
  ]);
});

function modeBits(stats) {
  return stats.mode & 0o777;
}

test("keeps storage backup paths inside the bucket directory", () => {
  const root = path.join(tmpdir(), "safe-backup-root");
  assert.equal(safeBackupPath(root, "nested/file.webp"), path.join(root, "nested/file.webp"));
  assert.throws(() => safeBackupPath(root, "./file.webp"), /Unsafe backup path/);
  assert.throws(() => safeBackupPath(root, "nested//file.webp"), /Unsafe backup path/);
  assert.throws(() => safeBackupPath(root, "nested/./file.webp"), /Unsafe backup path/);
  assert.throws(() => safeBackupPath(root, "../escape.webp"), /Unsafe backup path/);
  assert.throws(() => safeBackupPath(root, "nested/../collision.webp"), /Unsafe backup path/);
  assert.throws(() => safeBackupPath(root, "/absolute.webp"), /Unsafe backup path/);
});

test("refuses storage backup objects that resolve to duplicate local targets", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "bringa-storage-backup-collision-"));
  try {
    const bucketClient = {
      async list() {
        return {
          data: [
            { name: "Item.webp", id: "file-1", metadata: { size: 5, mimetype: "image/webp" } },
            { name: "item.webp", id: "file-2", metadata: { size: 6, mimetype: "image/webp" } },
          ],
          error: null,
        };
      },
      async download(filePath) {
        return { data: new Blob([filePath]), error: null };
      },
    };

    await assert.rejects(
      () => backupStorageBucket(bucketClient, "items", outputDir, 1000),
      /Duplicate backup target/,
    );
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("lists storage files recursively with pagination", async () => {
  const calls = [];
  const bucketClient = {
    async list(prefix = "", options = {}) {
      calls.push({ prefix, offset: options.offset || 0 });
      if (prefix === "" && (options.offset || 0) === 0) {
        return {
          data: [
            { name: "root.webp", id: "file-1", metadata: { size: 4 } },
            { name: "nested", id: null, metadata: null },
          ],
          error: null,
        };
      }
      if (prefix === "" && options.offset === 2) {
        return { data: [{ name: "later.webp", id: "file-2", metadata: { size: 5 } }], error: null };
      }
      if (prefix === "nested") {
        return { data: [{ name: "child.webp", id: "file-3", metadata: { size: 6 } }], error: null };
      }
      return { data: [], error: null };
    },
  };

  const files = await listStorageFiles(bucketClient, "", 2);
  assert.deepEqual(files.map((file) => file.path), ["root.webp", "nested/child.webp", "later.webp"]);
  assert.deepEqual(calls, [
    { prefix: "", offset: 0 },
    { prefix: "nested", offset: 0 },
    { prefix: "", offset: 2 },
  ]);
});

test("downloads storage files and writes a bucket manifest", async () => {
  const outputDir = await mkdtemp(path.join(tmpdir(), "bringa-storage-backup-"));
  try {
    const bucketClient = {
      async list() {
        return { data: [{ name: "item.webp", id: "file-1", metadata: { size: 5, mimetype: "image/webp" } }], error: null };
      },
      async download(filePath) {
        assert.equal(filePath, "item.webp");
        return { data: new Blob(["image"]), error: null };
      },
    };

    const result = await backupStorageBucket(bucketClient, "items", outputDir, 1000);
    const objectPath = path.join(outputDir, "storage", "items", "item.webp");
    const manifestPath = path.join(outputDir, "storage", "items.manifest.json");
    const stored = await readFile(objectPath, "utf8");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

    assert.equal(stored, "image");
    assert.deepEqual(result, { objects: 1, bytes: 5 });
    assert.equal(manifest.bucket, "items");
    assert.equal(manifest.objects[0].path, "item.webp");
    assert.equal(manifest.objects[0].bytes, 5);
    assert.equal(modeBits(await stat(path.join(outputDir, "storage"))), 0o700);
    assert.equal(modeBits(await stat(path.join(outputDir, "storage", "items"))), 0o700);
    assert.equal(modeBits(await stat(objectPath)), 0o600);
    assert.equal(modeBits(await stat(manifestPath)), 0o600);
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});

test("fetches Auth users with explicit pagination", async () => {
  const pages = [];
  const authAdmin = {
    async listUsers(params) {
      pages.push(params);
      if (params.page === 1) {
        return { data: { users: [{ id: "user-1" }], aud: "authenticated" }, error: null };
      }
      return { data: { users: [], aud: "authenticated" }, error: null };
    },
  };

  const users = await fetchAuthUsers(authAdmin, 1);
  assert.deepEqual(users, [{ id: "user-1" }]);
  assert.deepEqual(pages, [{ page: 1, perPage: 1 }, { page: 2, perPage: 1 }]);
});

test("builds compact backup run metadata from a manifest", () => {
  const record = buildBackupRunRecord({
    manifest: {
      tables: {
        profiles: 2,
        items: 3,
      },
      storage: {
        items: { objects: 4, bytes: 12 },
        avatars: { objects: 1, bytes: 5 },
      },
      authUsers: {
        exported: true,
        users: 6,
      },
    },
    startedAt: "2026-05-05T10:00:00Z",
    finishedAt: "2026-05-05T10:01:00Z",
    status: "completed",
  });

  assert.deepEqual(record, {
    started_at: "2026-05-05T10:00:00Z",
    finished_at: "2026-05-05T10:01:00Z",
    status: "completed",
    table_count: 2,
    table_rows: 5,
    storage_bucket_count: 2,
    storage_object_count: 5,
    storage_bytes: 17,
    auth_users_exported: true,
    auth_user_count: 6,
  });
});

test("records backup run metadata through the Supabase client", async () => {
  const inserts = [];
  const supabase = {
    from(tableName) {
      assert.equal(tableName, "backup_runs");
      return {
        async insert(payload) {
          inserts.push(payload);
          return { data: null, error: null };
        },
      };
    },
  };

  await recordBackupRun(supabase, {
    manifest: {
      tables: { profiles: 1 },
      storage: {},
      authUsers: { exported: false, users: null },
    },
    startedAt: "2026-05-05T10:00:00Z",
    finishedAt: "2026-05-05T10:01:00Z",
  });

  assert.equal(inserts.length, 1);
  assert.equal(inserts[0].table_count, 1);
  assert.equal(inserts[0].status, "completed");
});
