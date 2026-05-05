import { createClient } from "@supabase/supabase-js";

import { loadEnvFile, requiredEnv } from "./backup-supabase.mjs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const storageBatchSize = 1000;

function requireUuid(value, label) {
  if (!uuidPattern.test(String(value || ""))) {
    throw new Error(`${label} must be a UUID.`);
  }
}

function requireStorageBucket(bucket) {
  if (!/^[A-Za-z0-9._-]+$/.test(bucket)) {
    throw new Error(`Unsafe Storage bucket name: ${bucket}`);
  }
}

function requireStoragePath(objectPath) {
  if (
    !objectPath ||
    objectPath.startsWith("/") ||
    objectPath.includes("\\") ||
    objectPath.split("/").includes("..")
  ) {
    throw new Error(`Unsafe Storage object path: ${objectPath}`);
  }
}

function chunkArray(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export function parseAccountDeletionCleanupArgs(argv) {
  const parsed = {
    userId: null,
    requestId: null,
    storageSpecs: [],
    execute: false,
    confirmUserId: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--user-id") {
      parsed.userId = argv[index + 1];
      index += 1;
    } else if (arg === "--request-id") {
      parsed.requestId = argv[index + 1];
      index += 1;
    } else if (arg === "--storage") {
      parsed.storageSpecs.push(argv[index + 1]);
      index += 1;
    } else if (arg === "--execute") {
      parsed.execute = true;
    } else if (arg === "--confirm-user-id") {
      parsed.confirmUserId = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!parsed.userId) {
    throw new Error("--user-id is required.");
  }
  if (!parsed.requestId) {
    throw new Error("--request-id is required.");
  }

  return parsed;
}

export function parseStorageObjectSpecs(specs = []) {
  const byBucket = new Map();

  for (const spec of specs) {
    const separator = String(spec || "").indexOf(":");
    if (separator <= 0) {
      throw new Error(`Storage cleanup spec must be bucket:path[,path]: ${spec}`);
    }

    const bucket = spec.slice(0, separator).trim();
    const rawPaths = spec.slice(separator + 1);
    requireStorageBucket(bucket);

    const paths = rawPaths
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (paths.length === 0) {
      throw new Error(`Storage cleanup spec for ${bucket} is missing object path.`);
    }

    for (const objectPath of paths) {
      requireStoragePath(objectPath);
    }

    byBucket.set(bucket, [...(byBucket.get(bucket) || []), ...paths]);
  }

  return [...byBucket.entries()].map(([bucket, paths]) => ({ bucket, paths }));
}

export function buildAccountDeletionCleanupPlan({
  userId,
  requestId,
  storageObjects = [],
  execute = false,
  confirmUserId = null,
}) {
  requireUuid(userId, "--user-id");
  requireUuid(requestId, "--request-id");

  if (execute && confirmUserId !== userId) {
    throw new Error("--confirm-user-id must match --user-id before destructive cleanup runs.");
  }

  const storage = storageObjects.map(({ bucket, paths }) => {
    requireStorageBucket(bucket);
    for (const objectPath of paths) {
      requireStoragePath(objectPath);
    }

    return { bucket, objectCount: paths.length, paths };
  });
  const storageObjectCount = storage.reduce((total, bucket) => total + bucket.objectCount, 0);

  return {
    userId,
    requestId,
    execute,
    storage,
    storageObjectCount,
    authUserDeletion: true,
  };
}

export async function verifyCompletedDeletionRequest(supabase, { requestId, userId }) {
  const { data, error } = await supabase
    .from("account_deletion_requests")
    .select("id,status,subject_user_id,completed_at")
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    throw new Error(`account_deletion_requests: ${error.message}`);
  }
  if (!data) {
    throw new Error(`Deletion request not found: ${requestId}`);
  }
  if (data.subject_user_id !== userId) {
    throw new Error("Deletion request subject does not match --user-id.");
  }
  if (data.status !== "completed" || !data.completed_at) {
    throw new Error("Deletion request must be completed before trusted Auth and Storage cleanup.");
  }

  return data;
}

export async function runAccountDeletionCleanup(supabase, options) {
  const storageObjects = options.storageObjects || [];
  const plan = buildAccountDeletionCleanupPlan({ ...options, storageObjects });

  if (!plan.execute) {
    return {
      ...plan,
      executed: false,
      authUserDeleted: false,
      removedStorageObjects: 0,
    };
  }

  await verifyCompletedDeletionRequest(supabase, {
    requestId: plan.requestId,
    userId: plan.userId,
  });

  let removedStorageObjects = 0;
  for (const { bucket, paths } of storageObjects) {
    const bucketClient = supabase.storage.from(bucket);
    for (const batch of chunkArray(paths, storageBatchSize)) {
      const { error } = await bucketClient.remove(batch);
      if (error) {
        throw new Error(`${bucket}: ${error.message}`);
      }
      removedStorageObjects += batch.length;
    }
  }

  const { error: deleteUserError } = await supabase.auth.admin.deleteUser(plan.userId);
  if (deleteUserError) {
    throw new Error(`auth.admin.deleteUser: ${deleteUserError.message}`);
  }

  return {
    ...plan,
    executed: true,
    authUserDeleted: true,
    removedStorageObjects,
  };
}

export async function main(argv = process.argv.slice(2)) {
  await loadEnvFile(".env.local");
  await loadEnvFile(".env");

  const args = parseAccountDeletionCleanupArgs(argv);
  const storageObjects = parseStorageObjectSpecs(args.storageSpecs);
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const result = await runAccountDeletionCleanup(supabase, {
    userId: args.userId,
    requestId: args.requestId,
    storageObjects,
    execute: args.execute,
    confirmUserId: args.confirmUserId,
  });

  console.log(JSON.stringify(result, null, 2));
  if (!args.execute) {
    console.log("Dry run only. Re-run with --execute --confirm-user-id <user-id> after backup, export, and retention checks.");
  }
}

if (process.argv[1] && process.argv[1].endsWith("cleanup-account-deletion.mjs")) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
