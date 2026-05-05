import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const defaultTables = [
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
  "backup_runs",
  "notification_events",
  "notification_mutes",
];
export const defaultStorageBuckets = ["items"];

export async function loadEnvFile(fileName) {
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

export function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function backupTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function parseCsvList(value, fallback = []) {
  const rawValue = String(value || "").trim();
  if (["none", "off", "false", "0"].includes(rawValue.toLowerCase())) {
    return [];
  }

  const rows = rawValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return rows.length > 0 ? rows : fallback;
}

export function parseBoolean(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

export function parsePositiveInteger(value, fallback, name) {
  const parsed = value === undefined || value === "" ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

export function safeBackupPath(rootDir, relativePath) {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new Error(`Unsafe backup path: ${relativePath}`);
  }
  if (relativePath.split(/[\\/]+/).includes("..")) {
    throw new Error(`Unsafe backup path: ${relativePath}`);
  }

  const resolvedRoot = path.resolve(rootDir);
  const target = path.resolve(resolvedRoot, relativePath);

  if (target !== resolvedRoot && !target.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Unsafe backup path: ${relativePath}`);
  }

  return target;
}

export async function fetchTable(supabase, tableName, pageSize) {
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

export async function listStorageFiles(bucketClient, prefix = "", pageSize = 1000) {
  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, "");
  const files = [];
  let offset = 0;

  while (true) {
    const { data, error } = await bucketClient.list(normalizedPrefix, {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw new Error(`${normalizedPrefix || "/"}: ${error.message}`);
    }

    for (const item of data || []) {
      if (!item.name) continue;

      const itemPath = normalizedPrefix ? `${normalizedPrefix}/${item.name}` : item.name;
      if (item.metadata === null || item.id === null) {
        files.push(...await listStorageFiles(bucketClient, itemPath, pageSize));
      } else {
        files.push({
          path: itemPath,
          id: item.id ?? null,
          created_at: item.created_at ?? null,
          updated_at: item.updated_at ?? null,
          metadata: item.metadata ?? null,
        });
      }
    }

    if (!data || data.length < pageSize) {
      return files;
    }

    offset += pageSize;
  }
}

async function downloadToBuffer(data) {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  if (data && typeof data.arrayBuffer === "function") return Buffer.from(await data.arrayBuffer());
  if (typeof data === "string") return Buffer.from(data);
  throw new Error("Unsupported Storage download payload.");
}

export async function backupStorageBucket(bucketClient, bucketName, outputDir, pageSize) {
  const storageRoot = path.join(outputDir, "storage");
  const bucketDir = safeBackupPath(storageRoot, bucketName);
  const manifestPath = safeBackupPath(storageRoot, `${bucketName}.manifest.json`);
  const files = await listStorageFiles(bucketClient, "", pageSize);
  const objects = [];
  let bytes = 0;

  await mkdir(bucketDir, { recursive: true });

  for (const file of files) {
    const { data, error } = await bucketClient.download(file.path);
    if (error) {
      throw new Error(`${bucketName}/${file.path}: ${error.message}`);
    }

    const buffer = await downloadToBuffer(data);
    const target = safeBackupPath(bucketDir, file.path);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, buffer);

    const object = {
      ...file,
      bytes: buffer.length,
      sha256: createHash("sha256").update(buffer).digest("hex"),
    };
    objects.push(object);
    bytes += object.bytes;
  }

  await mkdir(storageRoot, { recursive: true });
  await writeFile(
    manifestPath,
    `${JSON.stringify({ bucket: bucketName, objectCount: objects.length, bytes, objects }, null, 2)}\n`,
  );

  return { objects: objects.length, bytes };
}

export async function fetchAuthUsers(authAdmin, pageSize) {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await authAdmin.listUsers({ page, perPage: pageSize });

    if (error) {
      throw new Error(`auth users: ${error.message}`);
    }

    const pageUsers = data?.users || [];
    users.push(...pageUsers);

    if (pageUsers.length < pageSize) {
      return users;
    }

    page += 1;
  }
}

export function buildBackupRunRecord({ manifest, startedAt, finishedAt, status = "completed" }) {
  const tableRows = Object.values(manifest.tables || {}).reduce((total, value) => total + Number(value || 0), 0);
  const storageSummaries = Object.values(manifest.storage || {});
  const storageObjectCount = storageSummaries.reduce((total, value) => total + Number(value?.objects || 0), 0);
  const storageBytes = storageSummaries.reduce((total, value) => total + Number(value?.bytes || 0), 0);
  const authUsersExported = Boolean(manifest.authUsers?.exported);
  const authUserCount = authUsersExported && typeof manifest.authUsers?.users === "number"
    ? manifest.authUsers.users
    : null;

  return {
    started_at: startedAt,
    finished_at: finishedAt,
    status,
    table_count: Object.keys(manifest.tables || {}).length,
    table_rows: tableRows,
    storage_bucket_count: storageSummaries.length,
    storage_object_count: storageObjectCount,
    storage_bytes: storageBytes,
    auth_users_exported: authUsersExported,
    auth_user_count: authUserCount,
  };
}

export async function recordBackupRun(supabase, { manifest, startedAt, finishedAt, status = "completed" }) {
  const record = buildBackupRunRecord({ manifest, startedAt, finishedAt, status });
  const { error } = await supabase.from("backup_runs").insert(record);

  if (error) {
    throw new Error(`backup_runs: ${error.message}`);
  }

  return record;
}

export async function main() {
  await loadEnvFile(".env.local");
  await loadEnvFile(".env");

  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const tableList = parseCsvList(process.env.SUPABASE_BACKUP_TABLES, defaultTables);
  const storageBuckets = parseCsvList(process.env.SUPABASE_BACKUP_STORAGE_BUCKETS, defaultStorageBuckets);
  const pageSize = parsePositiveInteger(process.env.SUPABASE_BACKUP_PAGE_SIZE, 1000, "SUPABASE_BACKUP_PAGE_SIZE");
  const storagePageSize = parsePositiveInteger(process.env.SUPABASE_BACKUP_STORAGE_PAGE_SIZE, 1000, "SUPABASE_BACKUP_STORAGE_PAGE_SIZE");
  const authPageSize = parsePositiveInteger(process.env.SUPABASE_BACKUP_AUTH_PAGE_SIZE, 1000, "SUPABASE_BACKUP_AUTH_PAGE_SIZE");
  const includeAuthUsers = parseBoolean(process.env.SUPABASE_BACKUP_AUTH_USERS);
  const recordRun = process.env.SUPABASE_BACKUP_RECORD_RUN === undefined
    ? true
    : parseBoolean(process.env.SUPABASE_BACKUP_RECORD_RUN);
  const backupRoot = process.env.SUPABASE_BACKUP_DIR
    ? path.resolve(root, process.env.SUPABASE_BACKUP_DIR)
    : path.join(root, "backups", "supabase");
  const startedAt = new Date().toISOString();
  const outputDir = path.join(backupRoot, backupTimestamp());

  await mkdir(outputDir, { recursive: true });

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const manifest = {
    createdAt: startedAt,
    finishedAt: null,
    supabaseUrl,
    tables: {},
    storage: {},
    authUsers: {
      exported: false,
      users: null,
      note: "Set SUPABASE_BACKUP_AUTH_USERS=1 to export Auth user metadata through the Supabase Admin API. Password hashes and provider secrets are not exported by this script.",
    },
    notes: [
      "Postgres tables are exported as JSON files.",
      "Configured Storage buckets are downloaded through the Supabase Storage API so object bytes and metadata are captured together.",
      "Keep backup directories encrypted at rest and test restore procedures before relying on backups operationally.",
    ],
  };

  for (const tableName of tableList) {
    const rows = await fetchTable(supabase, tableName, pageSize);
    await writeFile(path.join(outputDir, `${tableName}.json`), `${JSON.stringify(rows, null, 2)}\n`);
    manifest.tables[tableName] = rows.length;
  }

  for (const bucketName of storageBuckets) {
    manifest.storage[bucketName] = await backupStorageBucket(
      supabase.storage.from(bucketName),
      bucketName,
      outputDir,
      storagePageSize,
    );
  }

  if (includeAuthUsers) {
    const users = await fetchAuthUsers(supabase.auth.admin, authPageSize);
    await writeFile(path.join(outputDir, "auth-users.json"), `${JSON.stringify(users, null, 2)}\n`);
    manifest.authUsers = {
      exported: true,
      users: users.length,
      note: "Auth user metadata exported through the Supabase Admin API. Password hashes and provider secrets are not exported by this script.",
    };
  }

  const finishedAt = new Date().toISOString();
  manifest.finishedAt = finishedAt;

  await writeFile(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  if (recordRun) {
    try {
      await recordBackupRun(supabase, { manifest, startedAt, finishedAt });
    } catch (error) {
      console.warn(`Backup files were written, but backup run status was not recorded: ${error.message}`);
    }
  }

  console.log(`Supabase backup written to ${path.relative(root, outputDir)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
