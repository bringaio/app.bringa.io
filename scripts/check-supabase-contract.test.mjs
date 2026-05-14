import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { loadConfigObject } from "./generate-config.mjs";
import {
  checkSupabaseContract,
  checkSupabaseEdgeFunctionContent,
  checkSupabaseFunctionConfig,
} from "./check-supabase-contract.mjs";

async function currentContractInputs() {
  const root = process.cwd();
  const [schema, config] = await Promise.all([
    readFile(path.join(root, "supabase", "schema.sql"), "utf8"),
    loadConfigObject({ root }),
  ]);

  return { schema, config };
}

test("accepts the current committed Supabase schema contract", async () => {
  const inputs = await currentContractInputs();

  assert.doesNotThrow(() => checkSupabaseContract(inputs));
});

test("rejects a missing required RPC", async () => {
  const { schema, config } = await currentContractInputs();
  const driftedSchema = schema.replace(
    "CREATE OR REPLACE FUNCTION public.create_item(",
    "CREATE OR REPLACE FUNCTION public.create_item_missing(",
  );

  assert.throws(
    () => checkSupabaseContract({ schema: driftedSchema, config }),
    /Missing RPC in supabase\/schema.sql: create_item/,
  );
});

test("rejects Storage limits that drift from resolved media config", async () => {
  const { schema, config } = await currentContractInputs();
  const driftedConfig = {
    ...config,
    media: {
      ...config.media,
      maxUploadBytes: 12_345_678,
    },
  };

  assert.throws(
    () => checkSupabaseContract({ schema, config: driftedConfig }),
    /Storage bucket file size limit is not aligned/,
  );
});

test("rejects Storage upload policies that drift from canonical image filenames", async () => {
  const { schema, config } = await currentContractInputs();
  const driftedSchema = schema.replace(
    "AND storage.filename(name) = ANY (ARRAY['detail.webp', 'thumb.webp'])",
    "AND storage.filename(name) IS NOT NULL",
  );

  assert.throws(
    () => checkSupabaseContract({ schema: driftedSchema, config }),
    /generated item image filenames/,
  );
});

test("requires Edge Functions to prefer modern Supabase secret keys", async () => {
  const root = process.cwd();
  const content = await readFile(path.join(root, "supabase", "functions", "notifiy-telegram", "index.ts"), "utf8");

  assert.doesNotThrow(() => checkSupabaseEdgeFunctionContent(content, "notifiy-telegram"));
  assert.throws(
    () => checkSupabaseEdgeFunctionContent(
      content.replace("SUPABASE_SECRET_KEY", "SUPABASE_OLD_SECRET_KEY"),
      "notifiy-telegram",
    ),
    /SUPABASE_SECRET_KEY/,
  );
});

test("requires notification Edge Functions to authenticate trigger calls and refetch events", async () => {
  const root = process.cwd();
  const content = await readFile(path.join(root, "supabase", "functions", "notifiy-telegram", "index.ts"), "utf8");

  assert.doesNotThrow(() => checkSupabaseEdgeFunctionContent(content, "notifiy-telegram"));
  assert.throws(
    () => checkSupabaseEdgeFunctionContent(
      content.replace("const auth = verifyWebhookSecret(req);", "const auth = { ok: true } as const;"),
      "notifiy-telegram",
    ),
    /verify the webhook secret/,
  );
  assert.throws(
    () => checkSupabaseEdgeFunctionContent(
      content.replace(
        `    const auth = verifyWebhookSecret(req);
    if (!auth.ok) {
      return jsonResponse({ error: auth.message }, auth.status);
    }

    const payload = await req.json() as WebhookPayload;`,
        `    const payload = await req.json() as WebhookPayload;
    const auth = verifyWebhookSecret(req);
    if (!auth.ok) {
      return jsonResponse({ error: auth.message }, auth.status);
    }`,
      ),
      "notifiy-telegram",
    ),
    /before parsing untrusted JSON/,
  );
});

test("requires notification Edge Functions to run in handler-authenticated webhook mode", async () => {
  const root = process.cwd();
  const content = await readFile(path.join(root, "supabase", "config.toml"), "utf8");

  assert.doesNotThrow(() => checkSupabaseFunctionConfig(content));
  assert.throws(
    () => checkSupabaseFunctionConfig(content.replaceAll("verify_jwt = false", "verify_jwt = true")),
    /handler-authenticated webhook mode|authenticate database webhook calls/,
  );
});

test("requires borrow and delete RPCs to preserve visibility and audit history", async () => {
  const { schema } = await currentContractInputs();

  assert.match(schema, /selected_visibility_state/, "borrow_item should inspect item visibility state.");
  assert.match(schema, /selected_deleted_at/, "borrow_item should inspect soft deletion state.");
  assert.match(schema, /selected_status = 'borrowed'/, "delete_item should refuse actively borrowed items.");
  assert.match(schema, /visibility_state = 'deleted_user_hidden'/, "delete_item should soft-delete instead of hard-delete.");
  assert.doesNotMatch(schema, /DELETE\s+FROM\s+public\.items\s+WHERE\s+id\s*=\s*item_id_input/i);
});
