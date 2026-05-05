import { createClient } from "@supabase/supabase-js";

import { loadEnvFile } from "./backup-supabase.mjs";

function parseBoolean(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

function secretKeyFromMap(value) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    const defaultKey = parsed?.default;
    return typeof defaultKey === "string" && defaultKey.trim() ? defaultKey : null;
  } catch {
    return null;
  }
}

export function resolveSupabaseMaintenanceUrl(env = process.env) {
  const explicitUrl = String(env.SUPABASE_URL || "").trim().replace(/\/$/, "");
  if (explicitUrl) return explicitUrl;

  const projectRef = String(env.SUPABASE_PROJECT_REF || "").trim();
  if (projectRef) return `https://${projectRef}.supabase.co`;

  throw new Error("Set SUPABASE_URL or SUPABASE_PROJECT_REF before checking Supabase maintenance keys.");
}

export function candidateMaintenanceKeys(env = process.env, { includeLegacy = false } = {}) {
  const candidates = [];

  if (env.SUPABASE_SECRET_KEY) {
    candidates.push({ name: "SUPABASE_SECRET_KEY", value: env.SUPABASE_SECRET_KEY });
  }

  const mappedSecretKey = secretKeyFromMap(env.SUPABASE_SECRET_KEYS);
  if (mappedSecretKey) {
    candidates.push({ name: "SUPABASE_SECRET_KEYS.default", value: mappedSecretKey });
  }

  if (env.SUPABASE_SERVICE_ROLE_KEY && (includeLegacy || candidates.length === 0)) {
    candidates.push({ name: "SUPABASE_SERVICE_ROLE_KEY", value: env.SUPABASE_SERVICE_ROLE_KEY });
  }

  if (candidates.length === 0) {
    throw new Error("Set SUPABASE_SECRET_KEY or legacy SUPABASE_SERVICE_ROLE_KEY before checking Supabase maintenance access.");
  }

  return candidates;
}

export function describeMaintenanceKey(name, value) {
  const kind = String(value || "").startsWith("sb_secret_")
    ? "modern secret"
    : String(value || "").split(".").length === 3
      ? "legacy JWT-like key"
      : "configured key";

  return `${name} (${kind}, length ${String(value || "").length})`;
}

async function checkMaintenanceKey({ supabaseUrl, name, value, includeAuth }) {
  const supabase = createClient(supabaseUrl, value, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    throw new Error(`${name}: storage.listBuckets failed: ${bucketError.message}`);
  }

  const checks = [`Storage admin API ok (${Array.isArray(buckets) ? buckets.length : 0} buckets)`];

  if (includeAuth) {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) {
      throw new Error(`${name}: auth.admin.listUsers failed: ${error.message}`);
    }
    checks.push(`Auth admin API ok (${data?.users?.length ?? 0} user metadata rows returned)`);
  }

  return checks;
}

export async function main() {
  await loadEnvFile(".env.local");
  await loadEnvFile(".env");

  const supabaseUrl = resolveSupabaseMaintenanceUrl();
  const includeLegacy = parseBoolean(process.env.SUPABASE_MAINTENANCE_CHECK_ALL_KEYS);
  const includeAuth = parseBoolean(process.env.SUPABASE_MAINTENANCE_CHECK_AUTH);
  const candidates = candidateMaintenanceKeys(process.env, { includeLegacy });

  console.log(`Supabase maintenance target: ${new URL(supabaseUrl).host}`);
  for (const candidate of candidates) {
    const checks = await checkMaintenanceKey({
      supabaseUrl,
      name: candidate.name,
      value: candidate.value,
      includeAuth,
    });
    console.log(`${describeMaintenanceKey(candidate.name, candidate.value)}: ${checks.join("; ")}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith("check-supabase-maintenance-key.mjs")) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
