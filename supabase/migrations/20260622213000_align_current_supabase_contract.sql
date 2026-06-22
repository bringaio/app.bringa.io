-- Align existing Supabase projects with the current repository contract.
--
-- This migration is intentionally idempotent. It is safe for projects that
-- already have parts of the current schema, policies, indexes, grants, or
-- Realtime setup from earlier repaired migrations.

-- Keep item-image bucket limits aligned with the generated app config.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'items',
    'items',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Ensure current thumbnail and pagination support exists on older projects.
ALTER TABLE IF EXISTS public.items
    ADD COLUMN IF NOT EXISTS thumbnail_url text;

ALTER TABLE IF EXISTS public.item_versions
    ADD COLUMN IF NOT EXISTS thumbnail_url text;

ALTER TABLE IF EXISTS public.item_images
    ADD COLUMN IF NOT EXISTS thumbnail_storage_path text,
    ADD COLUMN IF NOT EXISTS thumbnail_public_url text;

UPDATE public.items
SET thumbnail_url = image_url
WHERE thumbnail_url IS NULL
  AND image_url IS NOT NULL;

UPDATE public.item_versions
SET thumbnail_url = image_url
WHERE thumbnail_url IS NULL
  AND image_url IS NOT NULL;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_profiles_profile_valid ON public.profiles(profile_valid);
CREATE INDEX IF NOT EXISTS idx_items_visibility_state ON public.items(visibility_state);
CREATE INDEX IF NOT EXISTS idx_items_owner_profile_id ON public.items(owner_profile_id);
CREATE INDEX IF NOT EXISTS idx_items_borrowed_by ON public.items(borrowed_by);
CREATE INDEX IF NOT EXISTS idx_items_created_by ON public.items(created_by);
CREATE INDEX IF NOT EXISTS idx_items_hidden_by ON public.items(hidden_by);
CREATE INDEX IF NOT EXISTS idx_items_deleted_by ON public.items(deleted_by);
CREATE INDEX IF NOT EXISTS idx_borrow_history_item_id ON public.borrow_history(item_id);
CREATE INDEX IF NOT EXISTS idx_borrow_history_borrower_id ON public.borrow_history(borrower_id);
CREATE INDEX IF NOT EXISTS idx_item_sharing_item_id ON public.item_sharing(item_id);
CREATE INDEX IF NOT EXISTS idx_item_sharing_shared_with_user_id ON public.item_sharing(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_item_versions_item_id ON public.item_versions(item_id);
CREATE INDEX IF NOT EXISTS idx_item_versions_owner_profile_id ON public.item_versions(owner_profile_id);
CREATE INDEX IF NOT EXISTS idx_item_versions_actor_id ON public.item_versions(actor_id);
CREATE INDEX IF NOT EXISTS idx_item_images_item_id ON public.item_images(item_id);
CREATE INDEX IF NOT EXISTS idx_item_images_uploaded_by ON public.item_images(uploaded_by);
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_images_one_cover_per_item ON public.item_images(item_id) WHERE is_cover;
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_images_unique_thumbnail_storage_path ON public.item_images(storage_bucket, thumbnail_storage_path) WHERE thumbnail_storage_path IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_id ON public.account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_subject_user_id ON public.account_deletion_requests(subject_user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_reviewed_by ON public.account_deletion_requests(reviewed_by);
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_deletion_requests_one_active_per_subject ON public.account_deletion_requests(subject_user_id) WHERE status = ANY (ARRAY['pending'::text, 'reviewing'::text]);
CREATE INDEX IF NOT EXISTS idx_item_suggestions_item_id ON public.item_suggestions(item_id);
CREATE INDEX IF NOT EXISTS idx_item_suggestions_status_created_at ON public.item_suggestions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_item_suggestions_suggested_by ON public.item_suggestions(suggested_by);
CREATE INDEX IF NOT EXISTS idx_item_suggestions_reviewed_by ON public.item_suggestions(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_item_flags_item_id ON public.item_flags(item_id);
CREATE INDEX IF NOT EXISTS idx_item_flags_status_created_at ON public.item_flags(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_item_flags_flagged_by ON public.item_flags(flagged_by);
CREATE INDEX IF NOT EXISTS idx_item_flags_reviewed_by ON public.item_flags(reviewed_by);
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_flags_one_pending_reason_per_user ON public.item_flags(item_id, flagged_by, reason) WHERE status = 'pending' AND flagged_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_backup_runs_finished_at ON public.backup_runs(finished_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_events_status_created_at ON public.notification_events(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_events_actor_id ON public.notification_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_seen_by ON public.notification_events(seen_by);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_events_unseen_dedupe ON public.notification_events(channel, audience, dedupe_key) WHERE seen_at IS NULL AND status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text]);
CREATE INDEX IF NOT EXISTS idx_notification_mutes_subject_profile_id ON public.notification_mutes(subject_profile_id);
CREATE INDEX IF NOT EXISTS idx_notification_mutes_muted_by ON public.notification_mutes(muted_by);

CREATE INDEX IF NOT EXISTS idx_items_visible_name_id
  ON public.items (name, id)
  WHERE visibility_state = 'visible';

CREATE INDEX IF NOT EXISTS idx_items_available_name_id
  ON public.items (status, name, id)
  WHERE visibility_state = 'visible';

CREATE INDEX IF NOT EXISTS idx_items_borrowed_by_name_id
  ON public.items (borrowed_by, name, id);

CREATE INDEX IF NOT EXISTS idx_items_created_by_created_at_id
  ON public.items (created_by, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_items_borrowed_by_status_created_at_id
  ON public.items (borrowed_by, status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_items_name_trgm_visible
  ON public.items USING gin (name gin_trgm_ops)
  WHERE visibility_state = 'visible';

-- Realtime publication membership has no IF NOT EXISTS syntax.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_publication
        WHERE pubname = 'supabase_realtime'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.items;
    END IF;
END;
$$;

-- Ensure foreign-key and invite-code constraints exist without duplicate errors.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'items_owner_profile_id_fkey') THEN
        ALTER TABLE public.items ADD CONSTRAINT items_owner_profile_id_fkey FOREIGN KEY (owner_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'items_hidden_by_fkey') THEN
        ALTER TABLE public.items ADD CONSTRAINT items_hidden_by_fkey FOREIGN KEY (hidden_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'items_deleted_by_fkey') THEN
        ALTER TABLE public.items ADD CONSTRAINT items_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'borrow_history_item_id_fkey') THEN
        ALTER TABLE public.borrow_history ADD CONSTRAINT borrow_history_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'item_sharing_item_id_fkey') THEN
        ALTER TABLE public.item_sharing ADD CONSTRAINT item_sharing_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'item_versions_item_id_fkey') THEN
        ALTER TABLE public.item_versions ADD CONSTRAINT item_versions_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'item_images_item_id_fkey') THEN
        ALTER TABLE public.item_images ADD CONSTRAINT item_images_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'account_deletion_requests_user_id_fkey') THEN
        ALTER TABLE public.account_deletion_requests ADD CONSTRAINT account_deletion_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'item_suggestions_item_id_fkey') THEN
        ALTER TABLE public.item_suggestions ADD CONSTRAINT item_suggestions_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'item_flags_item_id_fkey') THEN
        ALTER TABLE public.item_flags ADD CONSTRAINT item_flags_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admins_invite_code_unique') THEN
        ALTER TABLE public.admins ADD CONSTRAINT admins_invite_code_unique UNIQUE (invite_code);
    END IF;
END;
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_sharing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_mutes ENABLE ROW LEVEL SECURITY;

-- Remove legacy broad policies before recreating the narrow current contract.
DROP POLICY IF EXISTS "Validated users can insert items" ON public.items;
DROP POLICY IF EXISTS "Admins and creators can update items" ON public.items;
DROP POLICY IF EXISTS "Admins and creators can delete items" ON public.items;
DROP POLICY IF EXISTS "Authenticated users can insert borrow history" ON public.borrow_history;
DROP POLICY IF EXISTS "Validated users can insert history" ON public.borrow_history;
DROP POLICY IF EXISTS "borrow_history_insert_authenticated" ON public.borrow_history;
DROP POLICY IF EXISTS "borrow_history_select_all" ON public.borrow_history;
DROP POLICY IF EXISTS "Anyone can select invite codes for verification" ON public.admins;
DROP POLICY IF EXISTS "Allow authenticated users to read invite codes" ON public.admins;
DROP POLICY IF EXISTS "Authenticated users can check admin status" ON public.admins;
DROP POLICY IF EXISTS "Admins have full access to admins table" ON public.admins;

DROP POLICY IF EXISTS "No direct item inserts" ON public.items;
CREATE POLICY "No direct item inserts" ON public.items FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No direct item updates" ON public.items;
CREATE POLICY "No direct item updates" ON public.items FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "No direct item deletes" ON public.items;
CREATE POLICY "No direct item deletes" ON public.items FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "Admins can view history" ON public.borrow_history;
CREATE POLICY "Admins can view history" ON public.borrow_history FOR SELECT TO authenticated USING ((select public.is_admin()));
DROP POLICY IF EXISTS "No direct history inserts" ON public.borrow_history;
CREATE POLICY "No direct history inserts" ON public.borrow_history FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "Admins can view admins table" ON public.admins;
CREATE POLICY "Admins can view admins table" ON public.admins FOR SELECT TO authenticated USING ((select public.is_admin()));
DROP POLICY IF EXISTS "No direct admin inserts" ON public.admins;
CREATE POLICY "No direct admin inserts" ON public.admins FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No direct admin updates" ON public.admins;
CREATE POLICY "No direct admin updates" ON public.admins FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "No direct admin deletes" ON public.admins;
CREATE POLICY "No direct admin deletes" ON public.admins FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "No direct item version inserts" ON public.item_versions;
CREATE POLICY "No direct item version inserts" ON public.item_versions FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No direct item version updates" ON public.item_versions;
CREATE POLICY "No direct item version updates" ON public.item_versions FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "No direct item version deletes" ON public.item_versions;
CREATE POLICY "No direct item version deletes" ON public.item_versions FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "No direct item image inserts" ON public.item_images;
CREATE POLICY "No direct item image inserts" ON public.item_images FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No direct item image updates" ON public.item_images;
CREATE POLICY "No direct item image updates" ON public.item_images FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "No direct item image deletes" ON public.item_images;
CREATE POLICY "No direct item image deletes" ON public.item_images FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "No direct deletion request inserts" ON public.account_deletion_requests;
CREATE POLICY "No direct deletion request inserts" ON public.account_deletion_requests FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No direct deletion request updates" ON public.account_deletion_requests;
CREATE POLICY "No direct deletion request updates" ON public.account_deletion_requests FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "No direct deletion request deletes" ON public.account_deletion_requests;
CREATE POLICY "No direct deletion request deletes" ON public.account_deletion_requests FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "No direct item suggestion inserts" ON public.item_suggestions;
CREATE POLICY "No direct item suggestion inserts" ON public.item_suggestions FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No direct item suggestion updates" ON public.item_suggestions;
CREATE POLICY "No direct item suggestion updates" ON public.item_suggestions FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "No direct item suggestion deletes" ON public.item_suggestions;
CREATE POLICY "No direct item suggestion deletes" ON public.item_suggestions FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "No direct item flag inserts" ON public.item_flags;
CREATE POLICY "No direct item flag inserts" ON public.item_flags FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No direct item flag updates" ON public.item_flags;
CREATE POLICY "No direct item flag updates" ON public.item_flags FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "No direct item flag deletes" ON public.item_flags;
CREATE POLICY "No direct item flag deletes" ON public.item_flags FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "No direct backup run inserts" ON public.backup_runs;
CREATE POLICY "No direct backup run inserts" ON public.backup_runs FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No direct backup run updates" ON public.backup_runs;
CREATE POLICY "No direct backup run updates" ON public.backup_runs FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "No direct backup run deletes" ON public.backup_runs;
CREATE POLICY "No direct backup run deletes" ON public.backup_runs FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "No direct notification event inserts" ON public.notification_events;
CREATE POLICY "No direct notification event inserts" ON public.notification_events FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No direct notification event updates" ON public.notification_events;
CREATE POLICY "No direct notification event updates" ON public.notification_events FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "No direct notification event deletes" ON public.notification_events;
CREATE POLICY "No direct notification event deletes" ON public.notification_events FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "No direct notification mute inserts" ON public.notification_mutes;
CREATE POLICY "No direct notification mute inserts" ON public.notification_mutes FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No direct notification mute updates" ON public.notification_mutes;
CREATE POLICY "No direct notification mute updates" ON public.notification_mutes FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "No direct notification mute deletes" ON public.notification_mutes;
CREATE POLICY "No direct notification mute deletes" ON public.notification_mutes FOR DELETE TO authenticated USING (false);

-- Storage uploads must use generated renditions in <uid>/<uuid>/{detail,thumb}.webp.
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Validated users can upload item images" ON storage.objects;
CREATE POLICY "Validated users can upload item images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'items'
    AND (select public.is_validated())
    AND storage.extension(name) = 'webp'
    AND storage.filename(name) = ANY (ARRAY['detail.webp', 'thumb.webp'])
    AND array_length(storage.foldername(name), 1) = 2
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
    AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
);

DROP POLICY IF EXISTS "Validated users can delete own unreferenced item uploads" ON storage.objects;
CREATE POLICY "Validated users can delete own unreferenced item uploads" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'items'
    AND owner = (select auth.uid())
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
    AND NOT EXISTS (
        SELECT 1
        FROM public.item_images
        WHERE storage_bucket = 'items'
          AND (storage_path = name OR thumbnail_storage_path = name)
    )
);

-- Keep browser-callable RPCs explicit after global function revocation.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;

GRANT EXECUTE ON FUNCTION public.is_validated() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_and_apply_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.borrow_item(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_item(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_item(text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_item(uuid, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_item(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_item_version(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_item_visibility(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_item_visibility(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.demote_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_profile_validation(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_invite_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_my_invite_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_my_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_account_deletion_request(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_account_deletion_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_item_suggestion(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_item_flag(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_item_suggestion(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_item_suggestion(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_item_image_suggestion(uuid, text, text, text, text, text, boolean, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_owner_item_suggestion(uuid, text, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_item_flag(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_seen(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_telegram_mute(uuid, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.record_item_version(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_item_version(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_item_version(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.record_notification_delivery(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_notification_delivery(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_notification_delivery(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_notification_delivery(uuid, text, text) TO service_role;
