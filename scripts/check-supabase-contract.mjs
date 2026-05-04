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
