import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultTables = [
  "profiles",
  "items",
  "item_versions",
  "item_images",
  "borrow_history",
  "admins",
  "item_sharing",
  "account_deletion_requests",
  "item_suggestions",
  "item_flags",
];

async function loadEnvFile(fileName) {
  const filePath = path.join(root, fileName);

  try {
    const content = await readFile(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }

      const separator = trimmed.indexOf("=");
      const key = trimmed.slice(0, separator).trim();
      const rawValue = trimmed.slice(separator + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, "");

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function backupTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function fetchTable(supabase, tableName, pageSize) {
  const rows = [];
  let page = 0;

  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await supabase.from(tableName).select("*").range(from, to);

    if (error) {
      throw new Error(`${tableName}: ${error.message}`);
    }

    rows.push(...(data || []));

    if (!data || data.length < pageSize) {
      return rows;
    }

    page += 1;
  }
}

async function main() {
  await loadEnvFile(".env.local");
  await loadEnvFile(".env");

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const tableList = (process.env.SUPABASE_BACKUP_TABLES || defaultTables.join(","))
    .split(",")
    .map((tableName) => tableName.trim())
    .filter(Boolean);
  const pageSize = Number(process.env.SUPABASE_BACKUP_PAGE_SIZE || 1000);
  const backupRoot = process.env.SUPABASE_BACKUP_DIR
    ? path.resolve(root, process.env.SUPABASE_BACKUP_DIR)
    : path.join(root, "backups", "supabase");
  const outputDir = path.join(backupRoot, backupTimestamp());

  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new Error("SUPABASE_BACKUP_PAGE_SIZE must be a positive integer.");
  }

  await mkdir(outputDir, { recursive: true });

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const manifest = {
    createdAt: new Date().toISOString(),
    supabaseUrl,
    tables: {},
    note: "Table backup only. Supabase Storage objects and Auth users require separate export steps.",
  };

  for (const tableName of tableList) {
    const rows = await fetchTable(supabase, tableName, pageSize);
    await writeFile(path.join(outputDir, `${tableName}.json`), `${JSON.stringify(rows, null, 2)}\n`);
    manifest.tables[tableName] = rows.length;
  }

  await writeFile(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Supabase table backup written to ${path.relative(root, outputDir)}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
