/**
 * Checks the committed environment template for required keys, placeholders, and safe blank secret values.
 *
 * Source of truth: `.env.example` and the public/private environment contract.
 * Side effects: None beyond CLI output and exit status.
 *
 * @module scripts/check-env-example
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defaultStorageBuckets, defaultTables } from "./backup-supabase.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envExamplePath = path.join(root, ".env.example");

const requiredKeys = [
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SECRET_KEYS",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_BACKUP_TABLES",
  "SUPABASE_BACKUP_STORAGE_BUCKETS",
  "SUPABASE_BACKUP_DIR",
  "SUPABASE_BACKUP_PAGE_SIZE",
  "SUPABASE_BACKUP_STORAGE_PAGE_SIZE",
  "SUPABASE_BACKUP_AUTH_PAGE_SIZE",
  "SUPABASE_BACKUP_AUTH_USERS",
  "SUPABASE_BACKUP_RECORD_RUN",
  "APP_URL",
  "TELEGRAM_WEBHOOK_SECRET",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "TELEGRAM_BOT_TOKEN_USER",
  "TELEGRAM_CHAT_ID_USER",
];

const blankExampleKeys = [
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SECRET_KEYS",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_PROJECT_REF",
  "TELEGRAM_WEBHOOK_SECRET",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "TELEGRAM_BOT_TOKEN_USER",
  "TELEGRAM_CHAT_ID_USER",
];

const forbiddenKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
];

function parseCsv(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function assertExactCsv(env, key, expected) {
  const actual = parseCsv(env.get(key));
  if (actual.join("\n") !== expected.join("\n")) {
    throw new Error(`${key} must match the script default: ${expected.join(",")}`);
  }
}

function assertValue(env, key, expected) {
  if (env.get(key) !== expected) {
    throw new Error(`${key} must be ${expected}`);
  }
}

function assertBlank(env, key) {
  if (env.get(key) !== "") {
    throw new Error(`${key} must stay blank in .env.example.`);
  }
}

export function parseEnvExample(content) {
  const env = new Map();

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const separator = trimmed.indexOf("=");
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (!key) continue;
    if (env.has(key)) {
      throw new Error(`.env.example contains duplicate key: ${key}`);
    }
    env.set(key, value);
  }

  return env;
}

export function checkEnvExampleContent(content) {
  const env = parseEnvExample(content);

  for (const key of requiredKeys) {
    if (!env.has(key)) {
      throw new Error(`.env.example is missing ${key}`);
    }
  }

  for (const key of forbiddenKeys) {
    if (env.has(key)) {
      throw new Error(`${key} belongs in deployment config, not .env.example.`);
    }
  }

  for (const key of blankExampleKeys) {
    assertBlank(env, key);
  }

  assertExactCsv(env, "SUPABASE_BACKUP_TABLES", defaultTables);
  assertExactCsv(env, "SUPABASE_BACKUP_STORAGE_BUCKETS", defaultStorageBuckets);
  assertValue(env, "SUPABASE_BACKUP_DIR", "backups/supabase");
  assertValue(env, "SUPABASE_BACKUP_PAGE_SIZE", "1000");
  assertValue(env, "SUPABASE_BACKUP_STORAGE_PAGE_SIZE", "1000");
  assertValue(env, "SUPABASE_BACKUP_AUTH_PAGE_SIZE", "1000");
  assertValue(env, "SUPABASE_BACKUP_AUTH_USERS", "0");
  assertValue(env, "SUPABASE_BACKUP_RECORD_RUN", "1");

  return env;
}

export async function main() {
  const content = await readFile(envExamplePath, "utf8");
  checkEnvExampleContent(content);
  console.log(".env.example check passed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
