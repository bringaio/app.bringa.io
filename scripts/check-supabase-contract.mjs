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

export function checkSupabaseContract({ schema, config }) {
  const requiredFunctions = [
    "verify_and_apply_invite",
    "create_item",
    "update_item",
    "borrow_item",
    "return_item",
    "delete_item",
    "promote_admin",
    "demote_admin",
    "set_profile_validation",
    "get_my_invite_code",
    "set_my_invite_code",
    "export_my_data",
    "request_account_deletion",
    "review_account_deletion_request",
    "create_item_suggestion",
    "create_item_flag",
    "review_item_suggestion",
    "apply_item_suggestion",
    "apply_item_image_suggestion",
    "apply_owner_item_suggestion",
    "review_item_flag",
    "record_item_version",
    "restore_item_version",
    "set_item_visibility",
    "request_item_visibility",
    "enqueue_telegram_notification",
    "is_telegram_muted",
    "mark_notification_seen",
    "set_telegram_mute",
    "record_notification_delivery",
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
    [
      "account_deletion_requests_user_id_fkey",
      "ALTER TABLE public.account_deletion_requests ADD CONSTRAINT account_deletion_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;",
    ],
    [
      "item_suggestions_item_id_fkey",
      "ALTER TABLE public.item_suggestions ADD CONSTRAINT item_suggestions_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;",
    ],
    [
      "item_flags_item_id_fkey",
      "ALTER TABLE public.item_flags ADD CONSTRAINT item_flags_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;",
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
    ["account_deletion_requests table", "CREATE TABLE IF NOT EXISTS public.account_deletion_requests ("],
    ["account_deletion_requests nullable live user fk", "user_id uuid,"],
    ["account_deletion_requests durable subject id", "subject_user_id uuid NOT NULL"],
    [
      "account_deletion_requests status",
      "status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'completed'::text, 'cancelled'::text]))",
    ],
    [
      "account deletion subject lookup",
      "CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_subject_user_id ON public.account_deletion_requests(subject_user_id);",
    ],
    [
      "one active deletion request per subject user",
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_account_deletion_requests_one_active_per_subject ON public.account_deletion_requests(subject_user_id) WHERE status = ANY (ARRAY['pending'::text, 'reviewing'::text]);",
    ],
    ["item_suggestions table", "CREATE TABLE IF NOT EXISTS public.item_suggestions ("],
    [
      "item_suggestions status",
      "status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'accepted'::text, 'rejected'::text, 'closed'::text]))",
    ],
    ["item_flags table", "CREATE TABLE IF NOT EXISTS public.item_flags ("],
    [
      "item_flags status",
      "status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'resolved'::text, 'dismissed'::text]))",
    ],
    ["backup_runs table", "CREATE TABLE IF NOT EXISTS public.backup_runs ("],
    [
      "backup_runs status",
      "status text NOT NULL DEFAULT 'completed'::text CHECK (status = ANY (ARRAY['completed'::text, 'failed'::text]))",
    ],
    [
      "backup_runs time order",
      "CONSTRAINT backup_runs_time_order CHECK (finished_at >= started_at)",
    ],
    ["notification_events table", "CREATE TABLE IF NOT EXISTS public.notification_events ("],
    [
      "notification_events status",
      "status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'skipped_muted'::text]))",
    ],
    [
      "notification_events unseen dedupe",
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_events_unseen_dedupe ON public.notification_events(channel, audience, dedupe_key) WHERE seen_at IS NULL AND status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text]);",
    ],
    ["notification_mutes table", "CREATE TABLE IF NOT EXISTS public.notification_mutes ("],
    [
      "notification_mutes window constraint",
      "CONSTRAINT notification_mutes_has_window CHECK (muted_forever OR muted_until IS NOT NULL)",
    ],
  ];

  for (const [label, expectedSql] of requiredProductModelSql) {
    requireIncludes(schema, expectedSql, `Missing product model contract in supabase/schema.sql: ${label}`);
  }

  const requiredVersioningSql = [
    ["initial item version capture", "SELECT public.record_item_version(new_item_id, 'created') INTO new_version_id;"],
    ["item update version capture", "SELECT public.record_item_version(item_id_input, 'updated') INTO new_version_id;"],
    ["restore appends a republished version", "SELECT public.record_item_version(selected_item_id, restore_reason) INTO new_version_id;"],
    ["restore locks the current item", "FOR UPDATE;"],
    ["profile owners can record item versions", "current_item.owner_profile_id IS DISTINCT FROM auth.uid()"],
    ["internal version helper is not browser-executable", "REVOKE EXECUTE ON FUNCTION public.record_item_version(uuid, text) FROM PUBLIC;"],
  ];

  for (const [label, expectedSql] of requiredVersioningSql) {
    requireIncludes(schema, expectedSql, `Missing item versioning contract in supabase/schema.sql: ${label}`);
  }

  const requiredVisibilitySql = [
    ["visibility updates require admin RPC", "CREATE OR REPLACE FUNCTION public.set_item_visibility("],
    ["visibility updates require reasons", "IF normalized_reason IS NULL THEN"],
    ["visibility updates append version", "SELECT public.record_item_version(item_id_input, version_reason) INTO new_version_id;"],
    ["public item reads exclude hidden states", "visibility_state = 'visible'"],
    ["admins can still view all items", "public.is_admin() OR"],
    ["user visibility request RPC", "CREATE OR REPLACE FUNCTION public.request_item_visibility("],
    ["user visibility request only allows hide or pending review", "normalized_state <> ALL (ARRAY['user_hidden', 'pending_visible'])"],
    ["user visibility request requires related user", "selected_created_by IS DISTINCT FROM auth.uid()\n       AND selected_owner_profile_id IS DISTINCT FROM auth.uid()"],
    ["user visibility request records versions", "SELECT public.record_item_version(item_id_input, version_reason) INTO new_version_id;"],
    ["user visibility request blocks anonymous execute", "REVOKE EXECUTE ON FUNCTION public.request_item_visibility(uuid, text, text) FROM PUBLIC;"],
    ["user visibility request allows authenticated execute", "GRANT EXECUTE ON FUNCTION public.request_item_visibility(uuid, text, text) TO authenticated;"],
  ];

  for (const [label, expectedSql] of requiredVisibilitySql) {
    requireIncludes(schema, expectedSql, `Missing item visibility contract in supabase/schema.sql: ${label}`);
  }

  const requiredProfileValidationSql = [
    ["profile validation admin RPC", "CREATE OR REPLACE FUNCTION public.set_profile_validation("],
    ["profile validation rejects null state", "IF profile_valid_input IS NULL THEN"],
    ["profile validation prevents self invalidation", "profile_id_input = auth.uid() AND NOT profile_valid_input"],
    ["trusted profile validity update flag", "PERFORM set_config('app.profile_valid_update', 'trusted', true);"],
    ["profile escalation trigger honors trusted RPCs", "current_setting('app.profile_valid_update', true) IS DISTINCT FROM 'trusted'"],
  ];

  for (const [label, expectedSql] of requiredProfileValidationSql) {
    requireIncludes(schema, expectedSql, `Missing profile validation contract in supabase/schema.sql: ${label}`);
  }

  const requiredSuggestionApplicationSql = [
    ["suggestion application admin RPC", "CREATE OR REPLACE FUNCTION public.apply_item_suggestion("],
    ["suggestion application locks suggestion", "FROM public.item_suggestions\n    WHERE id = suggestion_id_input\n      AND status = ANY (ARRAY['pending'::text, 'reviewing'::text])\n    FOR UPDATE;"],
    ["suggestion application requires note", "IF normalized_note IS NULL OR length(normalized_note) < 3 THEN"],
    ["suggestion application updates item", "UPDATE public.items\n    SET\n        name = normalized_name,"],
    ["suggestion application records version", "SELECT public.record_item_version(selected_item_id, 'accepted suggestion') INTO new_version_id;"],
    ["suggestion application marks suggestion accepted", "status = 'accepted'"],
    ["suggestion application blocks anonymous execute", "REVOKE EXECUTE ON FUNCTION public.apply_item_suggestion(uuid, text, text, text, text) FROM PUBLIC;"],
    ["suggestion application allows authenticated execute", "GRANT EXECUTE ON FUNCTION public.apply_item_suggestion(uuid, text, text, text, text) TO authenticated;"],
    ["image metadata suggestion application admin RPC", "CREATE OR REPLACE FUNCTION public.apply_item_image_suggestion("],
    ["image metadata suggestion locks suggestion", "AND suggestion_type = 'image'"],
    ["image metadata suggestion validates storage path", "normalized_path LIKE '/%' OR normalized_path LIKE '%..%'"],
    ["image metadata suggestion writes item_images", "INSERT INTO public.item_images ("],
    ["image metadata suggestion can set cover", "UPDATE public.item_images\n        SET is_cover = false"],
    ["image metadata suggestion updates legacy cover URL", "image_url = coalesce(normalized_public_url, image_url)"],
    ["image metadata suggestion records version", "SELECT public.record_item_version(selected_item_id, 'accepted image suggestion') INTO new_version_id;"],
    ["image metadata suggestion blocks anonymous execute", "REVOKE EXECUTE ON FUNCTION public.apply_item_image_suggestion(uuid, text, text, text, text, text, boolean, text) FROM PUBLIC;"],
    ["image metadata suggestion allows authenticated execute", "GRANT EXECUTE ON FUNCTION public.apply_item_image_suggestion(uuid, text, text, text, text, text, boolean, text) TO authenticated;"],
    ["owner suggestion application admin RPC", "CREATE OR REPLACE FUNCTION public.apply_owner_item_suggestion("],
    ["owner suggestion application uses hardened search path", "RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$"],
    ["owner suggestion application only applies owner suggestions", "AND suggestion_type = 'owner'"],
    ["owner suggestion application validates profile owners", "PERFORM 1 FROM public.profiles WHERE id = owner_profile_id_input;"],
    ["owner suggestion application updates owner fields", "owner_kind = normalized_kind,\n        owner_profile_id = selected_owner_profile_id,\n        owner_label = selected_owner_label"],
    ["owner suggestion application records version", "SELECT public.record_item_version(selected_item_id, 'accepted owner suggestion') INTO new_version_id;"],
    ["owner suggestion application blocks anonymous execute", "REVOKE EXECUTE ON FUNCTION public.apply_owner_item_suggestion(uuid, text, uuid, text, text) FROM PUBLIC;"],
    ["owner suggestion application allows authenticated execute", "GRANT EXECUTE ON FUNCTION public.apply_owner_item_suggestion(uuid, text, uuid, text, text) TO authenticated;"],
  ];

  for (const [label, expectedSql] of requiredSuggestionApplicationSql) {
    requireIncludes(schema, expectedSql, `Missing suggestion application contract in supabase/schema.sql: ${label}`);
  }

  const requiredNotificationSql = [
    ["notification enqueue helper", "CREATE OR REPLACE FUNCTION public.enqueue_telegram_notification("],
    ["notification enqueue uses hardened search path", "RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$"],
    ["notification enqueue records muted skips", "status\n        )\n        VALUES ("],
    ["notification enqueue suppresses unseen duplicates", "AND seen_at IS NULL\n      AND status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text])"],
    ["notification enqueue handles concurrent duplicates", "ON CONFLICT DO NOTHING\n    RETURNING id INTO new_event_id;"],
    ["notification delivery records retry state", "next_attempt_at = CASE WHEN normalized_status = 'failed' THEN now() + interval '15 minutes' ELSE NULL END"],
    ["notification delivery is service role only", "IF auth.role() IS DISTINCT FROM 'service_role' THEN"],
    ["notification seen admin RPC", "CREATE OR REPLACE FUNCTION public.mark_notification_seen("],
    ["notification mute admin RPC", "CREATE OR REPLACE FUNCTION public.set_telegram_mute("],
    ["notification mute supports one day", "selected_until := now() + interval '1 day';"],
    ["notification mute supports forever", "normalized_window = 'forever'"],
    ["item webhook enqueues notification event", "notification_event_id := public.enqueue_telegram_notification("],
    ["webhook payload uses notification events", "'table', 'notification_events'"],
    ["notification delivery blocks anonymous execute", "REVOKE EXECUTE ON FUNCTION public.record_notification_delivery(uuid, text, text) FROM PUBLIC;"],
    ["notification delivery allows service role execute", "GRANT EXECUTE ON FUNCTION public.record_notification_delivery(uuid, text, text) TO service_role;"],
  ];

  for (const [label, expectedSql] of requiredNotificationSql) {
    requireIncludes(schema, expectedSql, `Missing notification contract in supabase/schema.sql: ${label}`);
  }

  const requiredDeletionReviewSql = [
    ["deletion review admin RPC", "CREATE OR REPLACE FUNCTION public.review_account_deletion_request("],
    ["deletion review remains non-destructive", "normalized_status <> ALL (ARRAY['reviewing', 'cancelled'])"],
    ["cancelled deletion requests require notes", "normalized_status = 'cancelled' AND normalized_note IS NULL"],
    ["deletion review records reviewer", "reviewed_by = auth.uid()"],
    ["deletion review only updates active requests", "WHERE id = request_id_input\n      AND status = ANY (ARRAY['pending'::text, 'reviewing'::text])"],
    ["deletion request creation treats reviewing as active", "AND status = ANY (ARRAY['pending'::text, 'reviewing'::text])"],
    ["deletion review RPC blocks anonymous execute", "REVOKE EXECUTE ON FUNCTION public.review_account_deletion_request(uuid, text, text) FROM PUBLIC;"],
    ["deletion review RPC allows authenticated execute", "GRANT EXECUTE ON FUNCTION public.review_account_deletion_request(uuid, text, text) TO authenticated;"],
    ["deletion execution admin RPC", "CREATE OR REPLACE FUNCTION public.execute_account_deletion_request("],
    ["deletion execution uses hardened search path", "RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$"],
    ["deletion execution requires reviewing status", "AND status = 'reviewing'"],
    ["deletion execution blocks self execution", "'self_execution_blocked'"],
    ["deletion execution requires admin note", "length(normalized_note) < 8"],
    ["deletion execution hides user-owned items", "visibility_state = 'deleted_user_hidden'"],
    ["deletion execution records item versions", "PERFORM public.record_item_version(affected_item_id, 'account deletion completed');"],
    ["deletion execution anonymizes profile", "email = NULL,\n        display_name = 'Deleted',\n        display_surname = 'user'"],
    ["deletion execution marks request completed", "status = 'completed',\n        admin_note = normalized_note"],
    ["deletion execution reports remaining trusted steps", "'requiresAuthDeletion', true,\n        'requiresStorageCleanup', true"],
    ["deletion execution RPC blocks anonymous execute", "REVOKE EXECUTE ON FUNCTION public.execute_account_deletion_request(uuid, text) FROM PUBLIC;"],
    ["deletion execution RPC allows authenticated execute", "GRANT EXECUTE ON FUNCTION public.execute_account_deletion_request(uuid, text) TO authenticated;"],
    ["deletion request creation writes durable subject id", "INSERT INTO public.account_deletion_requests (user_id, subject_user_id, user_note)"],
    ["deletion request lookup uses durable subject id", "WHERE subject_user_id = auth.uid()"],
    ["deletion request owner read handles retained audit rows", "CREATE POLICY \"Users can view own deletion requests\" ON public.account_deletion_requests FOR SELECT USING (user_id = auth.uid() OR subject_user_id = auth.uid());"],
  ];

  for (const [label, expectedSql] of requiredDeletionReviewSql) {
    requireIncludes(schema, expectedSql, `Missing deletion request review contract in supabase/schema.sql: ${label}`);
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
    "Users can view own deletion requests",
    "Admins can view deletion requests",
    "No direct deletion request inserts",
    "No direct deletion request updates",
    "No direct deletion request deletes",
    "Users can view own item suggestions",
    "Admins can view item suggestions",
    "No direct item suggestion inserts",
    "No direct item suggestion updates",
    "No direct item suggestion deletes",
    "Users can view own item flags",
    "Admins can view item flags",
    "No direct item flag inserts",
    "No direct item flag updates",
    "No direct item flag deletes",
    "Admins can view backup runs",
    "No direct backup run inserts",
    "No direct backup run updates",
    "No direct backup run deletes",
    "Admins can view notification events",
    "No direct notification event inserts",
    "No direct notification event updates",
    "No direct notification event deletes",
    "Admins can view notification mutes",
    "No direct notification mute inserts",
    "No direct notification mute updates",
    "No direct notification mute deletes",
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

}

export function checkSupabaseEdgeFunctionContent(content, label = "Edge Function") {
  const requiredValues = [
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SECRET_KEYS",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  for (const value of requiredValues) {
    requireIncludes(content, value, `${label} must support ${value}.`);
  }

  requireMatch(
    content,
    /SUPABASE_SECRET_KEY[\s\S]+SUPABASE_SECRET_KEYS[\s\S]+SUPABASE_SERVICE_ROLE_KEY/,
    `${label} must prefer SUPABASE_SECRET_KEY, then SUPABASE_SECRET_KEYS, before legacy SUPABASE_SERVICE_ROLE_KEY.`,
  );

  requireIncludes(
    content,
    "missing Supabase admin key configuration",
    `${label} must use generic admin-key wording instead of service-role-only wording.`,
  );
}

export async function main() {
  const config = await loadConfigObject({ root });
  const schema = await readFile(schemaPath, "utf8");
  const edgeFunctionPaths = [
    path.join(root, "supabase", "functions", "notifiy-telegram", "index.ts"),
    path.join(root, "supabase", "functions", "notifiy-telegram-user", "index.ts"),
  ];

  checkSupabaseContract({ schema, config });
  for (const functionPath of edgeFunctionPaths) {
    checkSupabaseEdgeFunctionContent(await readFile(functionPath, "utf8"), path.relative(root, functionPath));
  }
  console.log("Supabase contract check passed.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
