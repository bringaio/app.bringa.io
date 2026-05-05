import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { loadConfigObject } from "./generate-config.mjs";
import {
  checkSupabaseContract,
  checkSupabaseEdgeFunctionContent,
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
