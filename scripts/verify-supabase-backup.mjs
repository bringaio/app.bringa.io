import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function safePath(rootDir, relativePath) {
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

async function readJson(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

async function verifyTable(backupDir, tableName, expectedRows) {
  const rows = await readJson(safePath(backupDir, `${tableName}.json`), `${tableName}.json`);
  if (!Array.isArray(rows)) {
    throw new Error(`${tableName}.json: expected a JSON array`);
  }

  assertEqual(rows.length, expectedRows, `${tableName}.json row count`);
  return rows.length;
}

async function verifyStorageObject(bucketDir, object) {
  const objectPath = safePath(bucketDir, object.path);
  const buffer = await readFile(objectPath);
  const fileStat = await stat(objectPath);
  const digest = createHash("sha256").update(buffer).digest("hex");

  if (fileStat.size !== object.bytes || digest !== object.sha256) {
    throw new Error(`Storage object drift: ${object.path}`);
  }

  return fileStat.size;
}

async function verifyStorageBucket(backupDir, bucketName, expectedSummary) {
  const storageRoot = path.join(backupDir, "storage");
  const manifest = await readJson(safePath(storageRoot, `${bucketName}.manifest.json`), `${bucketName}.manifest.json`);
  const objects = Array.isArray(manifest.objects) ? manifest.objects : [];
  const bucketDir = safePath(storageRoot, bucketName);
  let bytes = 0;

  assertEqual(manifest.objectCount, expectedSummary.objects, `${bucketName} object count`);
  assertEqual(manifest.bytes, expectedSummary.bytes, `${bucketName} byte count`);

  for (const object of objects) {
    bytes += await verifyStorageObject(bucketDir, object);
  }

  assertEqual(objects.length, expectedSummary.objects, `${bucketName} manifest object count`);
  assertEqual(bytes, expectedSummary.bytes, `${bucketName} verified byte count`);

  return { objects: objects.length, bytes };
}

async function verifyAuthUsers(backupDir, authUsers) {
  if (!authUsers?.exported) {
    return { exported: false, users: null };
  }

  const users = await readJson(path.join(backupDir, "auth-users.json"), "auth-users.json");
  if (!Array.isArray(users)) {
    throw new Error("auth-users.json: expected a JSON array");
  }
  if (typeof authUsers.users === "number") {
    assertEqual(users.length, authUsers.users, "auth-users.json user count");
  }

  return { exported: true, users: users.length };
}

export async function verifyBackupDirectory(backupDirInput) {
  const backupDir = path.resolve(root, backupDirInput);
  const manifest = await readJson(path.join(backupDir, "manifest.json"), "manifest.json");
  const tableEntries = Object.entries(manifest.tables || {});
  const storageEntries = Object.entries(manifest.storage || {});
  let tableRows = 0;
  let storageObjectCount = 0;
  let storageBytes = 0;

  for (const [tableName, expectedRows] of tableEntries) {
    tableRows += await verifyTable(backupDir, tableName, expectedRows);
  }

  for (const [bucketName, expectedSummary] of storageEntries) {
    const summary = await verifyStorageBucket(backupDir, bucketName, expectedSummary);
    storageObjectCount += summary.objects;
    storageBytes += summary.bytes;
  }

  const authSummary = await verifyAuthUsers(backupDir, manifest.authUsers);

  return {
    tableCount: tableEntries.length,
    tableRows,
    storageBucketCount: storageEntries.length,
    storageObjectCount,
    storageBytes,
    authUsersExported: authSummary.exported,
    authUserCount: authSummary.users,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const backupDir = argv[0];
  if (!backupDir) {
    throw new Error("Usage: node scripts/verify-supabase-backup.mjs <backup-directory>");
  }

  const summary = await verifyBackupDirectory(backupDir);
  console.log(`Backup verified: ${summary.tableCount} tables, ${summary.tableRows} rows, ${summary.storageObjectCount} Storage objects, ${summary.storageBytes} bytes.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
