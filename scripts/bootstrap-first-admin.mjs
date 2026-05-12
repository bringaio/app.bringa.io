/**
 * Bootstraps the first admin for a fresh hosted Supabase project.
 *
 * Source of truth: Supabase `profiles` and `admins`, trusted maintenance
 * credentials, and explicit project confirmation.
 * Side effects: With `--execute`, validates one profile and creates one admin
 * invite code. Dry-run is the default.
 *
 * @module scripts/bootstrap-first-admin
 */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

import { loadEnvFile, resolveSupabaseMaintenanceKey, resolveSupabaseMaintenanceUrl } from "./backup-supabase.mjs";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const inviteCodePattern = /^[A-Za-z0-9][A-Za-z0-9._-]{2,95}$/;
const trustedBootstrapInviteMarker = "BOOTSTRAP-FIRST-ADMIN";

function usage() {
  return `Usage: pnpm bootstrap:first-admin [--execute] [--confirm-project-ref <ref>] [--profile-id <uuid>] [--invite-code <code>]

Bootstraps the first admin invite code for a fresh Supabase project.

Default mode is a dry run. Hosted Supabase projects require
--confirm-project-ref <ref> before execution or dry-run output.

Options:
  --execute                    Write the first admin row and validate the profile
  --confirm-project-ref <ref>  Confirm the hosted Supabase project ref
  --profile-id <uuid>          Bootstrap a specific profile when multiple profiles exist
  --invite-code <code>         Use a chosen non-secret invite code instead of a random one
  --help                       Show this help

Never paste Supabase secret keys or OAuth secrets into this command output.
`;
}

function valueAfter(argv, index, name) {
  const value = argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

function requireUuid(value, label) {
  if (!uuidPattern.test(String(value || ""))) {
    throw new Error(`${label} must be a UUID.`);
  }
}

function normalizeInviteCode(value) {
  const normalized = String(value || "").trim();
  if (!inviteCodePattern.test(normalized)) {
    throw new Error("--invite-code contains unsupported characters. Use 3-96 letters, numbers, dots, underscores, or dashes.");
  }
  return normalized;
}

export function parseBootstrapFirstAdminArgs(argv = []) {
  const parsed = {
    execute: false,
    confirmProjectRef: null,
    profileId: null,
    inviteCode: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--execute") {
      parsed.execute = true;
    } else if (arg === "--confirm-project-ref") {
      parsed.confirmProjectRef = valueAfter(argv, index, arg).trim();
      index += 1;
    } else if (arg === "--profile-id") {
      const profileId = valueAfter(argv, index, arg).trim();
      requireUuid(profileId, "--profile-id");
      parsed.profileId = profileId;
      index += 1;
    } else if (arg === "--invite-code") {
      parsed.inviteCode = normalizeInviteCode(valueAfter(argv, index, arg));
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

export function generateInviteCode(randomBytesImpl = randomBytes) {
  return `BRINGA-${Buffer.from(randomBytesImpl(9)).toString("base64url").toUpperCase()}`;
}

function isLocalSupabaseUrl(supabaseUrl) {
  const hostname = new URL(supabaseUrl).hostname;
  return ["localhost", "127.0.0.1", "::1"].includes(hostname);
}

export function projectRefFromSupabaseUrl(supabaseUrl) {
  const hostname = new URL(supabaseUrl).hostname;
  if (hostname.endsWith(".supabase.co")) {
    return hostname.split(".")[0] || null;
  }
  return null;
}

export function requireHostedProjectConfirmation({ supabaseUrl, projectRef, confirmProjectRef }) {
  if (isLocalSupabaseUrl(supabaseUrl)) {
    return;
  }

  const resolvedProjectRef = projectRef || projectRefFromSupabaseUrl(supabaseUrl);
  if (!resolvedProjectRef) {
    throw new Error("Set SUPABASE_PROJECT_REF before bootstrapping a hosted Supabase project.");
  }
  if (confirmProjectRef !== resolvedProjectRef) {
    throw new Error(`--confirm-project-ref ${resolvedProjectRef} is required before bootstrapping this hosted project.`);
  }
}

async function fetchAdminCount(supabase) {
  const { count, error } = await supabase
    .from("admins")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new Error(`admins: ${error.message}`);
  }
  return count ?? 0;
}

async function fetchCandidateProfiles(supabase) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,created_at,profile_valid,invited_by_code")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`profiles: ${error.message}`);
  }
  return data || [];
}

async function fetchExplicitProfile(supabase, profileId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,profile_valid,invited_by_code")
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    throw new Error(`profiles: ${error.message}`);
  }
  if (!data) {
    throw new Error(`Profile not found for --profile-id ${profileId}.`);
  }
  return data;
}

async function resolveBootstrapProfile(supabase, profileId) {
  if (profileId) {
    const profile = await fetchExplicitProfile(supabase, profileId);
    return {
      profileId: profile.id,
      previousProfileValid: profile.profile_valid === true,
      previousInvitedByCode: profile.invited_by_code ?? null,
      profileCount: null,
    };
  }

  const profiles = await fetchCandidateProfiles(supabase);
  if (profiles.length === 0) {
    throw new Error("No profiles found. Sign in once with the intended first admin account, then rerun this command.");
  }
  if (profiles.length > 1) {
    throw new Error(`Found ${profiles.length} profiles. Rerun with --profile-id <uuid> for the intended first admin.`);
  }

  return {
    profileId: profiles[0].id,
    previousProfileValid: profiles[0].profile_valid === true,
    previousInvitedByCode: profiles[0].invited_by_code ?? null,
    profileCount: profiles.length,
  };
}

async function rollbackProfileValidation(supabase, selected) {
  const { error } = await supabase
    .from("profiles")
    .update({
      profile_valid: selected.previousProfileValid,
      invited_by_code: selected.previousInvitedByCode,
    })
    .eq("id", selected.profileId);

  if (error) {
    throw new Error(`profile rollback: ${error.message}`);
  }
}

export async function runBootstrapFirstAdmin(supabase, {
  execute = false,
  profileId = null,
  inviteCode = null,
  inviteCodeFactory = generateInviteCode,
} = {}) {
  const adminCount = await fetchAdminCount(supabase);
  if (adminCount > 0) {
    throw new Error(`This project already has ${adminCount} admin${adminCount === 1 ? "" : "s"}. First-admin bootstrap only works before any admins exist.`);
  }

  const selected = await resolveBootstrapProfile(supabase, profileId);

  if (!execute) {
    return {
      executed: false,
      profileCount: selected.profileCount,
      adminCount,
      willCreateAdmin: true,
      willValidateProfile: true,
    };
  }

  const firstAdminInviteCode = inviteCode || inviteCodeFactory();

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      profile_valid: true,
      invited_by_code: trustedBootstrapInviteMarker,
    })
    .eq("id", selected.profileId);

  if (updateError) {
    throw new Error(`profiles update: ${updateError.message}`);
  }

  const { error: insertError } = await supabase
    .from("admins")
    .insert({
      profile_id: selected.profileId,
      invite_code: firstAdminInviteCode,
    });

  if (insertError) {
    try {
      await rollbackProfileValidation(supabase, selected);
    } catch (rollbackError) {
      throw new Error(`admins insert: ${insertError.message}. ${rollbackError.message}`);
    }
    throw new Error(`admins insert: ${insertError.message}. Profile validation was rolled back.`);
  }

  return {
    executed: true,
    firstAdminInviteCode,
    createdAdminCount: 1,
    validatedProfileCount: 1,
  };
}

export async function main(argv = process.argv.slice(2), env = process.env, output = process.stdout) {
  if (argv.includes("--help") || argv.includes("-h")) {
    output.write(usage());
    return;
  }

  await loadEnvFile(".env.local");
  await loadEnvFile(".env");

  const args = parseBootstrapFirstAdminArgs(argv);
  const supabaseUrl = resolveSupabaseMaintenanceUrl();
  const projectRef = env.SUPABASE_PROJECT_REF || projectRefFromSupabaseUrl(supabaseUrl);
  requireHostedProjectConfirmation({
    supabaseUrl,
    projectRef,
    confirmProjectRef: args.confirmProjectRef,
  });

  const supabase = createClient(supabaseUrl, resolveSupabaseMaintenanceKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const result = await runBootstrapFirstAdmin(supabase, args);
  output.write(`${JSON.stringify(result, null, 2)}\n`);

  if (!args.execute) {
    output.write("Dry run only. Re-run with --execute after confirming the target project and intended first admin.\n");
  }
}

if (process.argv[1] && process.argv[1].endsWith("bootstrap-first-admin.mjs")) {
  main().catch((error) => {
    console.error(error.message);
    console.error("");
    console.error(usage().trimEnd());
    process.exitCode = 1;
  });
}
