import assert from "node:assert/strict";
import test from "node:test";

import {
  generateInviteCode,
  parseBootstrapFirstAdminArgs,
  requireHostedProjectConfirmation,
  runBootstrapFirstAdmin,
} from "./bootstrap-first-admin.mjs";

const profileId = "11111111-1111-4111-8111-111111111111";
const otherProfileId = "22222222-2222-4222-8222-222222222222";

function createFakeSupabase({
  adminCount = 0,
  profiles = [{ id: profileId, created_at: "2026-05-12T10:00:00Z" }],
  explicitProfile = { id: profileId },
  insertError = null,
} = {}) {
  const calls = [];

  return {
    calls,
    from(tableName) {
      calls.push(["from", tableName]);

      if (tableName === "admins") {
        return {
          select(columns, options) {
            calls.push(["select", tableName, columns, options]);
            return Promise.resolve({ count: adminCount, data: null, error: null });
          },
          insert(payload) {
            calls.push(["insert", tableName, payload]);
            return Promise.resolve({ data: null, error: insertError });
          },
        };
      }

      if (tableName === "profiles") {
        return {
          select(columns) {
            calls.push(["select", tableName, columns]);
            return {
              order(column, options) {
                calls.push(["order", column, options]);
                return Promise.resolve({ data: profiles, error: null });
              },
              eq(column, value) {
                calls.push(["eq", column, value]);
                return {
                  maybeSingle() {
                    calls.push(["maybeSingle"]);
                    return Promise.resolve({ data: explicitProfile, error: null });
                  },
                };
              },
            };
          },
          update(payload) {
            calls.push(["update", tableName, payload]);
            return {
              eq(column, value) {
                calls.push(["eq", column, value]);
                return Promise.resolve({ data: null, error: null });
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${tableName}`);
    },
  };
}

test("parses first-admin bootstrap CLI arguments", () => {
  assert.deepEqual(parseBootstrapFirstAdminArgs([]), {
    execute: false,
    confirmProjectRef: null,
    profileId: null,
    inviteCode: null,
  });

  assert.deepEqual(parseBootstrapFirstAdminArgs([
    "--execute",
    "--confirm-project-ref",
    "abc123",
    "--profile-id",
    profileId,
    "--invite-code",
    "BRINGA-FOUNDERS",
  ]), {
    execute: true,
    confirmProjectRef: "abc123",
    profileId,
    inviteCode: "BRINGA-FOUNDERS",
  });

  assert.throws(() => parseBootstrapFirstAdminArgs(["--profile-id", "not-a-uuid"]), /--profile-id must be a UUID/);
  assert.throws(() => parseBootstrapFirstAdminArgs(["--invite-code", "bad code"]), /--invite-code contains unsupported characters/);
  assert.throws(() => parseBootstrapFirstAdminArgs(["--unknown"]), /Unknown argument/);
});

test("execute rolls back profile validation when admin insert fails", async () => {
  const supabase = createFakeSupabase({
    profiles: [{
      id: profileId,
      created_at: "2026-05-12T10:00:00Z",
      profile_valid: false,
      invited_by_code: null,
    }],
    insertError: { message: "duplicate invite code" },
  });

  await assert.rejects(
    () => runBootstrapFirstAdmin(supabase, {
      execute: true,
      profileId: null,
      inviteCode: "BRINGA-FOUNDERS",
    }),
    /admins insert: duplicate invite code. Profile validation was rolled back./,
  );

  assert.deepEqual(supabase.calls.filter(([action]) => ["update", "insert"].includes(action)), [
    ["update", "profiles", { profile_valid: true, invited_by_code: "BOOTSTRAP-FIRST-ADMIN" }],
    ["insert", "admins", { profile_id: profileId, invite_code: "BRINGA-FOUNDERS" }],
    ["update", "profiles", { profile_valid: false, invited_by_code: null }],
  ]);
});

test("generates non-secret invite codes with a stable prefix", () => {
  const code = generateInviteCode(() => Buffer.from("abcdefghi"));
  assert.match(code, /^BRINGA-[A-Z0-9_-]+$/);
});

test("requires explicit project confirmation for hosted Supabase targets", () => {
  assert.doesNotThrow(() => requireHostedProjectConfirmation({
    supabaseUrl: "http://127.0.0.1:54321",
    projectRef: null,
    confirmProjectRef: null,
  }));

  assert.throws(() => requireHostedProjectConfirmation({
    supabaseUrl: "https://abc123.supabase.co",
    projectRef: "abc123",
    confirmProjectRef: null,
  }), /--confirm-project-ref abc123/);

  assert.doesNotThrow(() => requireHostedProjectConfirmation({
    supabaseUrl: "https://abc123.supabase.co",
    projectRef: "abc123",
    confirmProjectRef: "abc123",
  }));
});

test("dry-run bootstrap reports the plan without writing rows", async () => {
  const supabase = createFakeSupabase();

  const result = await runBootstrapFirstAdmin(supabase, {
    execute: false,
    profileId: null,
    inviteCode: null,
  });

  assert.deepEqual(result, {
    executed: false,
    profileCount: 1,
    adminCount: 0,
    willCreateAdmin: true,
    willValidateProfile: true,
  });
  assert.deepEqual(supabase.calls.filter(([action]) => ["insert", "update"].includes(action)), []);
});

test("refuses bootstrap when an admin already exists", async () => {
  const supabase = createFakeSupabase({ adminCount: 1 });

  await assert.rejects(
    () => runBootstrapFirstAdmin(supabase, { execute: false, profileId: null, inviteCode: null }),
    /already has 1 admin/,
  );
});

test("refuses implicit bootstrap unless exactly one profile exists", async () => {
  await assert.rejects(
    () => runBootstrapFirstAdmin(createFakeSupabase({ profiles: [] }), {
      execute: false,
      profileId: null,
      inviteCode: null,
    }),
    /No profiles found/,
  );

  await assert.rejects(
    () => runBootstrapFirstAdmin(createFakeSupabase({
      profiles: [
        { id: profileId, created_at: "2026-05-12T10:00:00Z" },
        { id: otherProfileId, created_at: "2026-05-12T10:01:00Z" },
      ],
    }), {
      execute: false,
      profileId: null,
      inviteCode: null,
    }),
    /Found 2 profiles/,
  );
});

test("allows an explicit profile id when multiple profiles exist", async () => {
  const supabase = createFakeSupabase({
    profiles: [
      { id: profileId, created_at: "2026-05-12T10:00:00Z" },
      { id: otherProfileId, created_at: "2026-05-12T10:01:00Z" },
    ],
    explicitProfile: { id: otherProfileId },
  });

  const result = await runBootstrapFirstAdmin(supabase, {
    execute: false,
    profileId: otherProfileId,
    inviteCode: null,
  });

  assert.equal(result.executed, false);
  assert.deepEqual(supabase.calls.slice(2, 6), [
    ["from", "profiles"],
    ["select", "profiles", "id,profile_valid,invited_by_code"],
    ["eq", "id", otherProfileId],
    ["maybeSingle"],
  ]);
});

test("execute validates the profile before creating the admin invite code", async () => {
  const supabase = createFakeSupabase();

  const result = await runBootstrapFirstAdmin(supabase, {
    execute: true,
    profileId: null,
    inviteCode: "BRINGA-FOUNDERS",
  });

  assert.deepEqual(result, {
    executed: true,
    firstAdminInviteCode: "BRINGA-FOUNDERS",
    createdAdminCount: 1,
    validatedProfileCount: 1,
  });
  assert.deepEqual(supabase.calls.filter(([action]) => ["update", "insert"].includes(action)), [
    ["update", "profiles", { profile_valid: true, invited_by_code: "BOOTSTRAP-FIRST-ADMIN" }],
    ["insert", "admins", { profile_id: profileId, invite_code: "BRINGA-FOUNDERS" }],
  ]);
});
