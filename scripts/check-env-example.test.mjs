import assert from "node:assert/strict";
import test from "node:test";

import { defaultStorageBuckets, defaultTables } from "./backup-supabase.mjs";
import { checkEnvExampleContent, parseEnvExample } from "./check-env-example.mjs";

function validEnvExampleContent(overrides = {}) {
  const values = {
    SUPABASE_URL: "",
    SUPABASE_SECRET_KEY: "",
    SUPABASE_SECRET_KEYS: "",
    SUPABASE_SERVICE_ROLE_KEY: "",
    SUPABASE_PROJECT_REF: "",
    SUPABASE_BACKUP_TABLES: defaultTables.join(","),
    SUPABASE_BACKUP_STORAGE_BUCKETS: defaultStorageBuckets.join(","),
    SUPABASE_BACKUP_DIR: "backups/supabase",
    SUPABASE_BACKUP_PAGE_SIZE: "1000",
    SUPABASE_BACKUP_STORAGE_PAGE_SIZE: "1000",
    SUPABASE_BACKUP_AUTH_PAGE_SIZE: "1000",
    SUPABASE_BACKUP_AUTH_USERS: "0",
    SUPABASE_BACKUP_RECORD_RUN: "1",
    APP_URL: "http://localhost:3000",
    TELEGRAM_WEBHOOK_SECRET: "",
    TELEGRAM_BOT_TOKEN: "",
    TELEGRAM_CHAT_ID: "",
    TELEGRAM_BOT_TOKEN_USER: "",
    TELEGRAM_CHAT_ID_USER: "",
    ...overrides,
  };

  return `${Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n")}\n`;
}

test("parses example env assignments without comments", () => {
  const env = parseEnvExample(`
# comment
SUPABASE_URL=https://example.supabase.co
EMPTY=
QUOTED="value"
`);

  assert.equal(env.get("SUPABASE_URL"), "https://example.supabase.co");
  assert.equal(env.get("EMPTY"), "");
  assert.equal(env.get("QUOTED"), "value");
});

test("rejects browser-visible Supabase config in env example", () => {
  assert.throws(
    () => checkEnvExampleContent(validEnvExampleContent({ NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" })),
    /NEXT_PUBLIC_SUPABASE_URL/,
  );
});

test("rejects duplicate env keys before blank secret checks can be bypassed", () => {
  assert.throws(
    () => checkEnvExampleContent(`${validEnvExampleContent({ TELEGRAM_WEBHOOK_SECRET: "not-for-example" })}TELEGRAM_WEBHOOK_SECRET=\n`),
    /duplicate key: TELEGRAM_WEBHOOK_SECRET/,
  );
});

test("requires backup defaults to match backup script source of truth", () => {
  assert.doesNotThrow(() => checkEnvExampleContent(validEnvExampleContent()));
});

test("rejects stale backup table lists", () => {
  assert.throws(
    () => checkEnvExampleContent(validEnvExampleContent({ SUPABASE_BACKUP_TABLES: "profiles,items" })),
    /SUPABASE_BACKUP_TABLES/,
  );
});

test("rejects real service and notification values in the example env", () => {
  assert.throws(
    () => checkEnvExampleContent(validEnvExampleContent({ SUPABASE_SECRET_KEY: "not-for-example" })),
    /SUPABASE_SECRET_KEY.*blank/,
  );
  assert.throws(
    () => checkEnvExampleContent(validEnvExampleContent({ SUPABASE_SECRET_KEYS: "{\"default\":\"not-for-example\"}" })),
    /SUPABASE_SECRET_KEYS.*blank/,
  );
  assert.throws(
    () => checkEnvExampleContent(validEnvExampleContent({ SUPABASE_SERVICE_ROLE_KEY: "not-for-example" })),
    /SUPABASE_SERVICE_ROLE_KEY.*blank/,
  );
  assert.throws(
    () => checkEnvExampleContent(validEnvExampleContent({ TELEGRAM_BOT_TOKEN: "123:abc" })),
    /TELEGRAM_BOT_TOKEN.*blank/,
  );
  assert.throws(
    () => checkEnvExampleContent(validEnvExampleContent({ TELEGRAM_WEBHOOK_SECRET: "not-for-example" })),
    /TELEGRAM_WEBHOOK_SECRET.*blank/,
  );
});
