import assert from "node:assert/strict";
import test from "node:test";

import {
  candidateMaintenanceKeys,
  describeMaintenanceKey,
  resolveSupabaseMaintenanceUrl,
} from "./check-supabase-maintenance-key.mjs";

test("resolves Supabase URL from explicit URL or project ref", () => {
  assert.equal(
    resolveSupabaseMaintenanceUrl({ SUPABASE_URL: "https://example.supabase.co" }),
    "https://example.supabase.co",
  );
  assert.equal(
    resolveSupabaseMaintenanceUrl({ SUPABASE_PROJECT_REF: "abc123" }),
    "https://abc123.supabase.co",
  );
  assert.throws(() => resolveSupabaseMaintenanceUrl({}), /SUPABASE_URL/);
});

test("prefers modern secret keys and only includes legacy keys when requested", () => {
  const env = {
    SUPABASE_SECRET_KEY: "sb_secret_modern",
    SUPABASE_SERVICE_ROLE_KEY: "legacy.jwt.value",
  };

  assert.deepEqual(candidateMaintenanceKeys(env), [{
    name: "SUPABASE_SECRET_KEY",
    value: "sb_secret_modern",
  }]);
  assert.deepEqual(candidateMaintenanceKeys(env, { includeLegacy: true }), [
    {
      name: "SUPABASE_SECRET_KEY",
      value: "sb_secret_modern",
    },
    {
      name: "SUPABASE_SERVICE_ROLE_KEY",
      value: "legacy.jwt.value",
    },
  ]);
});

test("describes keys without exposing their values", () => {
  assert.equal(describeMaintenanceKey("SUPABASE_SECRET_KEY", "sb_secret_modern"), "SUPABASE_SECRET_KEY (modern secret, length 16)");
  assert.equal(describeMaintenanceKey("SUPABASE_SERVICE_ROLE_KEY", "legacy.jwt.value"), "SUPABASE_SERVICE_ROLE_KEY (legacy JWT-like key, length 16)");
});
