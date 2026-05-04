import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfigObject } from "./generate-config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = path.join(root, "supabase", "schema.sql");

function requireMatch(content, pattern, message) {
  if (!pattern.test(content)) {
    throw new Error(message);
  }
}

function requireIncludes(content, value, message) {
  if (!content.includes(value)) {
    throw new Error(message);
  }
}

function requireConstraint(content, constraintName, expectedSql) {
  requireIncludes(
    content,
    expectedSql,
    `Missing or drifted constraint in supabase/schema.sql: ${constraintName}`,
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function requirePolicyCreate(content, policyName) {
  requireMatch(
    content,
    new RegExp(`CREATE\\s+POLICY\\s+"${escapeRegExp(policyName)}"`),
    `Missing policy in supabase/schema.sql: ${policyName}`,
  );
}

function requireNoPolicyCreate(content, policyName) {
  if (new RegExp(`CREATE\\s+POLICY\\s+"${escapeRegExp(policyName)}"`).test(content)) {
    throw new Error(`Forbidden legacy policy remains in supabase/schema.sql: ${policyName}`);
  }
}

async function main() {
  const config = await loadConfigObject({ root });
  const schema = await readFile(schemaPath, "utf8");

  const requiredFunctions = [
    "verify_and_apply_invite",
    "create_item",
    "update_item",
    "borrow_item",
    "return_item",
    "delete_item",
    "promote_admin",
    "demote_admin",
    "get_my_invite_code",
    "set_my_invite_code",
  ];

  for (const functionName of requiredFunctions) {
    requireMatch(
      schema,
      new RegExp(`CREATE OR REPLACE FUNCTION public\\.${functionName}\\s*\\(`),
      `Missing RPC in supabase/schema.sql: ${functionName}`,
    );
  }

  const requiredPolicies = [
    "No direct item inserts",
    "No direct item updates",
    "No direct item deletes",
    "Admins can view history",
    "No direct history inserts",
    "Validated users can upload item images",
  ];

  for (const policyName of requiredPolicies) {
    requirePolicyCreate(schema, policyName);
  }

  const forbiddenPolicies = [
    "Validated users can insert items",
    "Admins and creators can update items",
    "Admins and creators can delete items",
    "Authenticated users can insert borrow history",
    "Validated users can insert history",
    "borrow_history_insert_authenticated",
    "borrow_history_select_all",
  ];

  for (const policyName of forbiddenPolicies) {
    requireNoPolicyCreate(schema, policyName);
  }

  const requiredConstraints = [
    [
      "borrow_history_item_id_fkey",
      "ALTER TABLE public.borrow_history ADD CONSTRAINT borrow_history_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;",
    ],
    [
      "item_sharing_item_id_fkey",
      "ALTER TABLE public.item_sharing ADD CONSTRAINT item_sharing_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;",
    ],
    [
      "items_owner_profile_id_fkey",
      "ALTER TABLE public.items ADD CONSTRAINT items_owner_profile_id_fkey FOREIGN KEY (owner_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;",
    ],
    [
      "item_versions_item_id_fkey",
      "ALTER TABLE public.item_versions ADD CONSTRAINT item_versions_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;",
    ],
    [
      "item_images_item_id_fkey",
      "ALTER TABLE public.item_images ADD CONSTRAINT item_images_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;",
    ],
    ["admins_invite_code_unique", "CONSTRAINT admins_invite_code_unique UNIQUE (invite_code)"],
  ];

  for (const [constraintName, expectedSql] of requiredConstraints) {
    requireConstraint(schema, constraintName, expectedSql);
  }

  const requiredProductModelSql = [
    [
      "items.owner_kind",
      "owner_kind text NOT NULL DEFAULT 'operator'::text CHECK (owner_kind = ANY (ARRAY['operator'::text, 'profile'::text, 'free_text'::text]))",
    ],
    [
      "items.visibility_state",
      "visibility_state text NOT NULL DEFAULT 'visible'::text CHECK (visibility_state = ANY (ARRAY['visible'::text, 'user_hidden'::text, 'admin_hidden'::text, 'pending_visible'::text, 'deleted_user_hidden'::text, 'archived'::text]))",
    ],
    [
      "items.handoff_policy",
      "handoff_policy text NOT NULL DEFAULT 'return_to_owner'::text CHECK (handoff_policy = ANY (ARRAY['return_to_owner'::text, 'direct_handoff_allowed'::text]))",
    ],
    ["item_versions table", "CREATE TABLE IF NOT EXISTS public.item_versions ("],
    [
      "item_versions unique version",
      "CONSTRAINT item_versions_item_id_version_number_unique UNIQUE (item_id, version_number)",
    ],
    ["item_images table", "CREATE TABLE IF NOT EXISTS public.item_images ("],
    [
      "item_images unique storage path",
      "CONSTRAINT item_images_storage_bucket_path_unique UNIQUE (storage_bucket, storage_path)",
    ],
    [
      "item_images moderation state",
      "moderation_state text NOT NULL DEFAULT 'accepted'::text CHECK (moderation_state = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'flagged'::text, 'deleted'::text]))",
    ],
    [
      "item_images one cover",
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_item_images_one_cover_per_item ON public.item_images(item_id) WHERE is_cover;",
    ],
  ];

  for (const [label, expectedSql] of requiredProductModelSql) {
    requireIncludes(schema, expectedSql, `Missing product model contract in supabase/schema.sql: ${label}`);
  }

  const requiredProductPolicies = [
    "Admins can view item versions",
    "No direct item version inserts",
    "No direct item version updates",
    "No direct item version deletes",
    "Validated users can view accepted item images",
    "No direct item image inserts",
    "No direct item image updates",
    "No direct item image deletes",
  ];

  for (const policyName of requiredProductPolicies) {
    requirePolicyCreate(schema, policyName);
  }

  requireIncludes(schema, "INSERT INTO storage.buckets", "Missing Storage bucket setup in supabase/schema.sql.");
  requireIncludes(
    schema,
    String(config.media.maxUploadBytes),
    "Storage bucket file size limit is not aligned with config media.maxUploadBytes.",
  );

  for (const mimeType of config.media.acceptedImageMimeTypes) {
    requireIncludes(
      schema,
      `'${mimeType}'`,
      `Storage bucket MIME allowlist is missing config media type: ${mimeType}`,
    );
  }

  console.log("Supabase contract check passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
