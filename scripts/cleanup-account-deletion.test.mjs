import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAccountDeletionCleanupPlan,
  parseAccountDeletionCleanupArgs,
  parseStorageObjectSpecs,
  runAccountDeletionCleanup,
} from "./cleanup-account-deletion.mjs";

const userId = "11111111-1111-4111-8111-111111111111";
const requestId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

test("parses account deletion cleanup CLI arguments", () => {
  assert.deepEqual(
    parseAccountDeletionCleanupArgs([
      "--user-id",
      userId,
      "--request-id",
      requestId,
      "--storage",
      "items:one.webp,two.webp",
      "--storage",
      "avatars:profiles/user.webp",
      "--execute",
      "--confirm-user-id",
      userId,
    ]),
    {
      userId,
      requestId,
      storageSpecs: ["items:one.webp,two.webp", "avatars:profiles/user.webp"],
      execute: true,
      confirmUserId: userId,
    },
  );
});

test("requires an explicit user id for cleanup", () => {
  assert.throws(
    () => parseAccountDeletionCleanupArgs(["--storage", "items:one.webp"]),
    /--user-id is required/,
  );
});

test("requires an explicit completed deletion request id for cleanup", () => {
  assert.throws(
    () => parseAccountDeletionCleanupArgs(["--user-id", userId]),
    /--request-id is required/,
  );
});

test("parses and groups Storage cleanup specs", () => {
  assert.deepEqual(parseStorageObjectSpecs([
    "items:one.webp,two.webp",
    "items:nested/three.webp",
    "avatars:profiles/user.webp",
  ]), [
    { bucket: "items", paths: ["one.webp", "two.webp", "nested/three.webp"] },
    { bucket: "avatars", paths: ["profiles/user.webp"] },
  ]);
});

test("rejects unsafe Storage cleanup paths", () => {
  assert.throws(() => parseStorageObjectSpecs(["items:/absolute.webp"]), /Unsafe Storage object path/);
  assert.throws(() => parseStorageObjectSpecs(["items:../escape.webp"]), /Unsafe Storage object path/);
  assert.throws(() => parseStorageObjectSpecs(["items:nested/../escape.webp"]), /Unsafe Storage object path/);
  assert.throws(() => parseStorageObjectSpecs(["items:"]), /missing object path/);
});

test("builds a dry-run cleanup plan with counts", () => {
  assert.deepEqual(buildAccountDeletionCleanupPlan({
    userId,
    requestId,
    storageObjects: [
      { bucket: "items", paths: ["one.webp", "two.webp"] },
    ],
    execute: false,
    confirmUserId: null,
  }), {
    userId,
    requestId,
    execute: false,
    storage: [{ bucket: "items", objectCount: 2, paths: ["one.webp", "two.webp"] }],
    storageObjectCount: 2,
    authUserDeletion: true,
  });
});

test("requires matching confirmation before destructive execution", () => {
  assert.throws(
    () => buildAccountDeletionCleanupPlan({
      userId,
      requestId,
      storageObjects: [],
      execute: true,
      confirmUserId: "22222222-2222-4222-8222-222222222222",
    }),
    /--confirm-user-id must match --user-id/,
  );
});

test("dry-run cleanup does not call Supabase", async () => {
  const calls = [];
  const supabase = {
    storage: {
      from(bucket) {
        calls.push(["from", bucket]);
        return {
          async remove(paths) {
            calls.push(["remove", paths]);
            return { data: [], error: null };
          },
        };
      },
    },
    auth: {
      admin: {
        async deleteUser(id) {
          calls.push(["deleteUser", id]);
          return { data: null, error: null };
        },
      },
    },
  };

  const result = await runAccountDeletionCleanup(supabase, {
    userId,
    requestId,
    storageObjects: [{ bucket: "items", paths: ["one.webp"] }],
    execute: false,
    confirmUserId: null,
  });

  assert.equal(result.executed, false);
  assert.equal(result.authUserDeleted, false);
  assert.deepEqual(calls, []);
});

test("executes Storage removal before Auth deletion", async () => {
  const calls = [];
  const supabase = {
    from(table) {
      calls.push(["from", table]);
      return {
        select(columns) {
          calls.push(["select", columns]);
          return {
            eq(column, value) {
              calls.push(["eq", column, value]);
              return {
                async maybeSingle() {
                  calls.push(["maybeSingle"]);
                  return {
                    data: {
                      id: requestId,
                      subject_user_id: userId,
                      status: "completed",
                      completed_at: "2026-05-05T10:00:00Z",
                    },
                    error: null,
                  };
                },
              };
            },
          };
        },
      };
    },
    storage: {
      from(bucket) {
        calls.push(["from", bucket]);
        return {
          async remove(paths) {
            calls.push(["remove", paths]);
            return { data: paths.map((name) => ({ name })), error: null };
          },
        };
      },
    },
    auth: {
      admin: {
        async deleteUser(id) {
          calls.push(["deleteUser", id]);
          return { data: null, error: null };
        },
      },
    },
  };

  const result = await runAccountDeletionCleanup(supabase, {
    userId,
    requestId,
    storageObjects: [{ bucket: "items", paths: ["one.webp", "two.webp"] }],
    execute: true,
    confirmUserId: userId,
  });

  assert.deepEqual(calls, [
    ["from", "account_deletion_requests"],
    ["select", "id,status,subject_user_id,completed_at"],
    ["eq", "id", requestId],
    ["maybeSingle"],
    ["from", "items"],
    ["remove", ["one.webp", "two.webp"]],
    ["deleteUser", userId],
  ]);
  assert.equal(result.executed, true);
  assert.equal(result.storageObjectCount, 2);
  assert.equal(result.authUserDeleted, true);
});
