import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { Writable } from "node:stream";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { doctorLocalSupabase } from "./doctor-local-supabase.mjs";

function captureOutput() {
  let output = "";
  return {
    stream: new Writable({
      write(chunk, _encoding, callback) {
        output += chunk.toString();
        callback();
      },
    }),
    text() {
      return output;
    },
  };
}

async function withTempRoot(t, name) {
  const root = await mkdtemp(path.join(os.tmpdir(), name));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test("reports a running local stack without printing public keys", async (t) => {
  const root = await withTempRoot(t, "bringa-local-doctor-ok-");
  const configPath = path.join(root, "config", "local.config.jsonc");
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify({
    supabase: {
      url: "http://127.0.0.1:54321",
      publishableKey: "local-public-key",
    },
    development: {
      localDemoMode: false,
    },
  }, null, 2), "utf8");

  const output = captureOutput();
  const result = await doctorLocalSupabase({
    root,
    output: output.stream,
    statusEnv: new Map([
      ["SUPABASE_URL", "http://127.0.0.1:54321"],
      ["ANON_KEY", "local-public-key"],
    ]),
  });

  assert.equal(result.ok, true);
  assert.equal(result.localConfig.state, "ready");
  assert.match(output.text(), /Local Supabase doctor passed/);
  assert.match(output.text(), /http:\/\/127\.0\.0\.1:54321/);
  assert.doesNotMatch(output.text(), /local-public-key/);
});

test("points developers to setup when the local stack is running but local config is missing", async (t) => {
  const root = await withTempRoot(t, "bringa-local-doctor-missing-");
  const output = captureOutput();

  const result = await doctorLocalSupabase({
    root,
    output: output.stream,
    statusEnv: new Map([
      ["API_URL", "http://127.0.0.1:54321"],
      ["PUBLISHABLE_KEY", "local-public-key"],
    ]),
  });

  assert.equal(result.ok, false);
  assert.equal(result.localConfig.state, "missing");
  assert.match(output.text(), /Local Supabase stack is running/);
  assert.match(output.text(), /pnpm setup:local-supabase --seed/);
});

test("fails clearly when the local Supabase CLI status command is unavailable", async (t) => {
  const root = await withTempRoot(t, "bringa-local-doctor-status-");

  await assert.rejects(
    () => doctorLocalSupabase({
      root,
      statusResult: {
        status: 1,
        stdout: "",
        stderr: "supabase is not running",
      },
    }),
    /Run `pnpm exec supabase start` first/,
  );
});

test("rejects remote status URLs before reading app config", async (t) => {
  const root = await withTempRoot(t, "bringa-local-doctor-remote-");

  await assert.rejects(
    () => doctorLocalSupabase({
      root,
      statusEnv: new Map([
        ["SUPABASE_URL", "https://project.supabase.co"],
        ["ANON_KEY", "public-key"],
      ]),
    }),
    /non-local Supabase URL/,
  );
});

test("reports local config drift without exposing keys", async (t) => {
  const root = await withTempRoot(t, "bringa-local-doctor-drift-");
  const configPath = path.join(root, "config", "local.config.jsonc");
  await mkdir(path.dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify({
    supabase: {
      url: "http://127.0.0.1:54322",
      publishableKey: "different-public-key",
    },
    development: {
      localDemoMode: true,
    },
  }, null, 2), "utf8");

  const output = captureOutput();
  const result = await doctorLocalSupabase({
    root,
    output: output.stream,
    statusEnv: new Map([
      ["SUPABASE_URL", "http://127.0.0.1:54321"],
      ["ANON_KEY", "local-public-key"],
    ]),
  });

  assert.equal(result.ok, false);
  assert.equal(result.localConfig.state, "drift");
  assert.match(output.text(), /does not match the running local stack/);
  assert.match(output.text(), /localDemoMode should be false/);
  assert.doesNotMatch(output.text(), /different-public-key/);
  assert.doesNotMatch(output.text(), /local-public-key/);
});
