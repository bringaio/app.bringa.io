-- Align the fresh live baseline with current Supabase linter guidance.
-- SECURITY DEFINER functions should not inherit default PUBLIC/anon execute grants,
-- trigger helpers should not be browser-callable, and RLS policies should avoid
-- per-row auth helper evaluation where the value is statement-stable.

ALTER FUNCTION public.update_updated_at() SET search_path = public;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;

GRANT EXECUTE ON FUNCTION public.is_validated() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_and_apply_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.borrow_item(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_item(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_item(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_item(uuid, text, text, text) TO authenticated;
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
GRANT EXECUTE ON FUNCTION public.apply_item_image_suggestion(uuid, text, text, text, text, text, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_owner_item_suggestion(uuid, text, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_item_flag(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notification_seen(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_telegram_mute(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_notification_delivery(uuid, text, text) TO service_role;

CREATE INDEX IF NOT EXISTS idx_borrow_history_item_id ON public.borrow_history(item_id);
CREATE INDEX IF NOT EXISTS idx_borrow_history_borrower_id ON public.borrow_history(borrower_id);
CREATE INDEX IF NOT EXISTS idx_item_sharing_item_id ON public.item_sharing(item_id);
CREATE INDEX IF NOT EXISTS idx_item_sharing_shared_with_user_id ON public.item_sharing(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_item_versions_owner_profile_id ON public.item_versions(owner_profile_id);
CREATE INDEX IF NOT EXISTS idx_item_versions_actor_id ON public.item_versions(actor_id);
CREATE INDEX IF NOT EXISTS idx_item_images_uploaded_by ON public.item_images(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_reviewed_by ON public.account_deletion_requests(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_item_suggestions_reviewed_by ON public.item_suggestions(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_item_flags_reviewed_by ON public.item_flags(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_items_borrowed_by ON public.items(borrowed_by);
CREATE INDEX IF NOT EXISTS idx_items_created_by ON public.items(created_by);
CREATE INDEX IF NOT EXISTS idx_items_hidden_by ON public.items(hidden_by);
CREATE INDEX IF NOT EXISTS idx_items_deleted_by ON public.items(deleted_by);
CREATE INDEX IF NOT EXISTS idx_notification_events_seen_by ON public.notification_events(seen_by);
CREATE INDEX IF NOT EXISTS idx_notification_mutes_muted_by ON public.notification_mutes(muted_by);

-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (
    (select auth.uid()) = id OR (select public.is_admin())
);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

-- items
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Validated users can view items" ON public.items;
CREATE POLICY "Validated users can view items" ON public.items FOR SELECT TO authenticated USING (
    (select public.is_admin()) OR (
        (select public.is_validated()) AND (
            visibility_state = 'visible'
            OR created_by = (select auth.uid())
            OR borrowed_by = (select auth.uid())
            OR owner_profile_id = (select auth.uid())
        )
    )
);
DROP POLICY IF EXISTS "Validated users can insert items" ON public.items;
DROP POLICY IF EXISTS "No direct item inserts" ON public.items;
CREATE POLICY "No direct item inserts" ON public.items FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "Admins and creators can update items" ON public.items;
DROP POLICY IF EXISTS "No direct item updates" ON public.items;
CREATE POLICY "No direct item updates" ON public.items FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "Admins and creators can delete items" ON public.items;
DROP POLICY IF EXISTS "No direct item deletes" ON public.items;
CREATE POLICY "No direct item deletes" ON public.items FOR DELETE TO authenticated USING (false);

-- borrow_history
ALTER TABLE public.borrow_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read borrow history" ON public.borrow_history;
DROP POLICY IF EXISTS "borrow_history_select_all" ON public.borrow_history;
DROP POLICY IF EXISTS "Admins can view history" ON public.borrow_history;
CREATE POLICY "Admins can view history" ON public.borrow_history FOR SELECT TO authenticated USING ((select public.is_admin()));
DROP POLICY IF EXISTS "Authenticated users can insert borrow history" ON public.borrow_history;
DROP POLICY IF EXISTS "Validated users can insert history" ON public.borrow_history;
DROP POLICY IF EXISTS "borrow_history_insert_authenticated" ON public.borrow_history;
DROP POLICY IF EXISTS "No direct history inserts" ON public.borrow_history;
CREATE POLICY "No direct history inserts" ON public.borrow_history FOR INSERT TO authenticated WITH CHECK (false);

-- admins
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can select invite codes for verification" ON public.admins;
DROP POLICY IF EXISTS "Admins have full access to admins table" ON public.admins;
CREATE POLICY "Admins have full access to admins table" ON public.admins FOR ALL TO authenticated
USING ((select public.is_admin()))
WITH CHECK ((select public.is_admin()));

-- item_sharing
ALTER TABLE public.item_sharing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view shared items" ON public.item_sharing;
DROP POLICY IF EXISTS "Users can share own items" ON public.item_sharing;
CREATE POLICY "Users can view shared items" ON public.item_sharing FOR SELECT TO authenticated USING (
    shared_with_user_id = (select auth.uid())
    OR (select public.is_admin())
    OR EXISTS (
        SELECT 1
        FROM public.items
        WHERE items.id = item_sharing.item_id
          AND items.created_by = (select auth.uid())
    )
);
CREATE POLICY "Users can share own items" ON public.item_sharing FOR INSERT TO authenticated WITH CHECK (
    (select public.is_admin())
    OR EXISTS (
        SELECT 1
        FROM public.items
        WHERE items.id = item_sharing.item_id
          AND items.created_by = (select auth.uid())
    )
);
CREATE POLICY "Users can update own item shares" ON public.item_sharing FOR UPDATE TO authenticated
USING (
    (select public.is_admin())
    OR EXISTS (
        SELECT 1
        FROM public.items
        WHERE items.id = item_sharing.item_id
          AND items.created_by = (select auth.uid())
    )
)
WITH CHECK (
    (select public.is_admin())
    OR EXISTS (
        SELECT 1
        FROM public.items
        WHERE items.id = item_sharing.item_id
          AND items.created_by = (select auth.uid())
    )
);
CREATE POLICY "Users can delete own item shares" ON public.item_sharing FOR DELETE TO authenticated USING (
    (select public.is_admin())
    OR EXISTS (
        SELECT 1
        FROM public.items
        WHERE items.id = item_sharing.item_id
          AND items.created_by = (select auth.uid())
    )
);

-- item_versions
ALTER TABLE public.item_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view item versions" ON public.item_versions;
CREATE POLICY "Admins can view item versions" ON public.item_versions FOR SELECT TO authenticated USING ((select public.is_admin()));
DROP POLICY IF EXISTS "No direct item version inserts" ON public.item_versions;
CREATE POLICY "No direct item version inserts" ON public.item_versions FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No direct item version updates" ON public.item_versions;
CREATE POLICY "No direct item version updates" ON public.item_versions FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "No direct item version deletes" ON public.item_versions;
CREATE POLICY "No direct item version deletes" ON public.item_versions FOR DELETE TO authenticated USING (false);

-- item_images
ALTER TABLE public.item_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Validated users can view accepted item images" ON public.item_images;
CREATE POLICY "Validated users can view accepted item images" ON public.item_images FOR SELECT TO authenticated USING (
    (select public.is_validated()) AND moderation_state = 'accepted'
);
DROP POLICY IF EXISTS "No direct item image inserts" ON public.item_images;
CREATE POLICY "No direct item image inserts" ON public.item_images FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No direct item image updates" ON public.item_images;
CREATE POLICY "No direct item image updates" ON public.item_images FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "No direct item image deletes" ON public.item_images;
CREATE POLICY "No direct item image deletes" ON public.item_images FOR DELETE TO authenticated USING (false);

-- account_deletion_requests
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own deletion requests" ON public.account_deletion_requests;
DROP POLICY IF EXISTS "Admins can view deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Users can view own deletion requests" ON public.account_deletion_requests FOR SELECT TO authenticated USING (
    user_id = (select auth.uid())
    OR subject_user_id = (select auth.uid())
    OR (select public.is_admin())
);
DROP POLICY IF EXISTS "No direct deletion request inserts" ON public.account_deletion_requests;
CREATE POLICY "No direct deletion request inserts" ON public.account_deletion_requests FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No direct deletion request updates" ON public.account_deletion_requests;
CREATE POLICY "No direct deletion request updates" ON public.account_deletion_requests FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "No direct deletion request deletes" ON public.account_deletion_requests;
CREATE POLICY "No direct deletion request deletes" ON public.account_deletion_requests FOR DELETE TO authenticated USING (false);

-- item_suggestions
ALTER TABLE public.item_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own item suggestions" ON public.item_suggestions;
DROP POLICY IF EXISTS "Admins can view item suggestions" ON public.item_suggestions;
CREATE POLICY "Users can view own item suggestions" ON public.item_suggestions FOR SELECT TO authenticated USING (
    suggested_by = (select auth.uid())
    OR (select public.is_admin())
);
DROP POLICY IF EXISTS "No direct item suggestion inserts" ON public.item_suggestions;
CREATE POLICY "No direct item suggestion inserts" ON public.item_suggestions FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No direct item suggestion updates" ON public.item_suggestions;
CREATE POLICY "No direct item suggestion updates" ON public.item_suggestions FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "No direct item suggestion deletes" ON public.item_suggestions;
CREATE POLICY "No direct item suggestion deletes" ON public.item_suggestions FOR DELETE TO authenticated USING (false);

-- item_flags
ALTER TABLE public.item_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own item flags" ON public.item_flags;
DROP POLICY IF EXISTS "Admins can view item flags" ON public.item_flags;
CREATE POLICY "Users can view own item flags" ON public.item_flags FOR SELECT TO authenticated USING (
    flagged_by = (select auth.uid())
    OR (select public.is_admin())
);
DROP POLICY IF EXISTS "No direct item flag inserts" ON public.item_flags;
CREATE POLICY "No direct item flag inserts" ON public.item_flags FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No direct item flag updates" ON public.item_flags;
CREATE POLICY "No direct item flag updates" ON public.item_flags FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "No direct item flag deletes" ON public.item_flags;
CREATE POLICY "No direct item flag deletes" ON public.item_flags FOR DELETE TO authenticated USING (false);

-- backup_runs
ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view backup runs" ON public.backup_runs;
CREATE POLICY "Admins can view backup runs" ON public.backup_runs FOR SELECT TO authenticated USING ((select public.is_admin()));
DROP POLICY IF EXISTS "No direct backup run inserts" ON public.backup_runs;
CREATE POLICY "No direct backup run inserts" ON public.backup_runs FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No direct backup run updates" ON public.backup_runs;
CREATE POLICY "No direct backup run updates" ON public.backup_runs FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "No direct backup run deletes" ON public.backup_runs;
CREATE POLICY "No direct backup run deletes" ON public.backup_runs FOR DELETE TO authenticated USING (false);

-- notification_events
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view notification events" ON public.notification_events;
CREATE POLICY "Admins can view notification events" ON public.notification_events FOR SELECT TO authenticated USING ((select public.is_admin()));
DROP POLICY IF EXISTS "No direct notification event inserts" ON public.notification_events;
CREATE POLICY "No direct notification event inserts" ON public.notification_events FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No direct notification event updates" ON public.notification_events;
CREATE POLICY "No direct notification event updates" ON public.notification_events FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "No direct notification event deletes" ON public.notification_events;
CREATE POLICY "No direct notification event deletes" ON public.notification_events FOR DELETE TO authenticated USING (false);

-- notification_mutes
ALTER TABLE public.notification_mutes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view notification mutes" ON public.notification_mutes;
CREATE POLICY "Admins can view notification mutes" ON public.notification_mutes FOR SELECT TO authenticated USING ((select public.is_admin()));
DROP POLICY IF EXISTS "No direct notification mute inserts" ON public.notification_mutes;
CREATE POLICY "No direct notification mute inserts" ON public.notification_mutes FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No direct notification mute updates" ON public.notification_mutes;
CREATE POLICY "No direct notification mute updates" ON public.notification_mutes FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "No direct notification mute deletes" ON public.notification_mutes;
CREATE POLICY "No direct notification mute deletes" ON public.notification_mutes FOR DELETE TO authenticated USING (false);

-- storage.objects
DROP POLICY IF EXISTS "Validated users can upload item images" ON storage.objects;
CREATE POLICY "Validated users can upload item images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'items'
    AND (select public.is_validated())
);
