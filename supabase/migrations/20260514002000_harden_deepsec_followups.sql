CREATE OR REPLACE FUNCTION public.restore_item_version(
    version_id_input uuid,
    reason_input text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    selected_version public.item_versions%ROWTYPE;
    selected_item_id uuid;
    new_version_id uuid;
    normalized_reason text;
    restore_reason text;
    updated_count integer;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RETURN false;
    END IF;

    SELECT *
    INTO selected_version
    FROM public.item_versions
    WHERE id = version_id_input;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    SELECT id
    INTO selected_item_id
    FROM public.items
    WHERE id = selected_version.item_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    normalized_reason := NULLIF(btrim(coalesce(reason_input, '')), '');
    restore_reason := 'restored from version ' || selected_version.version_number::text;
    IF normalized_reason IS NOT NULL THEN
        restore_reason := restore_reason || ': ' || normalized_reason;
    END IF;

    UPDATE public.items
    SET
        name = selected_version.name,
        description = selected_version.description,
        image_url = selected_version.image_url,
        thumbnail_url = coalesce(selected_version.thumbnail_url, selected_version.image_url),
        owner_kind = selected_version.owner_kind,
        owner_profile_id = selected_version.owner_profile_id,
        owner_label = selected_version.owner_label,
        visibility_state = selected_version.visibility_state,
        visibility_reason = restore_reason,
        hidden_at = CASE WHEN selected_version.visibility_state = 'visible' THEN NULL ELSE now() END,
        hidden_by = CASE WHEN selected_version.visibility_state = 'visible' THEN NULL ELSE auth.uid() END,
        deleted_at = CASE WHEN selected_version.visibility_state = 'visible' THEN NULL ELSE deleted_at END,
        deleted_by = CASE WHEN selected_version.visibility_state = 'visible' THEN NULL ELSE deleted_by END
    WHERE id = selected_item_id;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count <> 1 THEN
        RETURN false;
    END IF;

    SELECT public.record_item_version(selected_item_id, restore_reason) INTO new_version_id;
    IF new_version_id IS NULL THEN
        RAISE EXCEPTION 'could not record restored item version';
    END IF;

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.execute_account_deletion_request(
    request_id_input uuid,
    admin_note_input text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    target_user_id uuid;
    normalized_note text;
    affected_item_id uuid;
    hidden_item_count integer := 0;
    returned_item_count integer := 0;
    anonymized_created_item_count integer := 0;
    anonymized_image_count integer := 0;
    anonymized_suggestion_count integer := 0;
    anonymized_flag_count integer := 0;
    notification_event_count integer := 0;
    deleted_admin_count integer := 0;
    deleted_sharing_count integer := 0;
    deleted_mute_count integer := 0;
    anonymized_profile_count integer := 0;
    completed_count integer := 0;
    returned_item_ids uuid[] := ARRAY[]::uuid[];
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'unauthorized');
    END IF;

    normalized_note := NULLIF(btrim(coalesce(admin_note_input, '')), '');
    IF normalized_note IS NULL OR length(normalized_note) < 8 THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'admin_note_required');
    END IF;

    SELECT subject_user_id
    INTO target_user_id
    FROM public.account_deletion_requests
    WHERE id = request_id_input
      AND status = 'reviewing'
    FOR UPDATE;

    IF target_user_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'request_not_reviewing');
    END IF;

    IF target_user_id = auth.uid() THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'self_execution_blocked');
    END IF;

    WITH returned_items AS (
        UPDATE public.items
        SET borrowed_by = NULL,
            status = 'inStock'
        WHERE borrowed_by = target_user_id
        RETURNING id
    )
    SELECT coalesce(array_agg(id), ARRAY[]::uuid[]), count(*)::integer
    INTO returned_item_ids, returned_item_count
    FROM returned_items;

    UPDATE public.borrow_history
    SET returned_at = now()
    WHERE borrower_id = target_user_id
      AND returned_at IS NULL
      AND item_id = ANY(returned_item_ids);

    FOR affected_item_id IN
        SELECT id
        FROM public.items
        WHERE owner_profile_id = target_user_id
           OR (created_by = target_user_id AND owner_kind <> 'operator')
    LOOP
        UPDATE public.items
        SET
            created_by = CASE WHEN created_by = target_user_id THEN NULL ELSE created_by END,
            owner_profile_id = CASE WHEN owner_profile_id = target_user_id THEN NULL ELSE owner_profile_id END,
            owner_label = CASE WHEN owner_kind <> 'operator' THEN 'Deleted user' ELSE owner_label END,
            visibility_state = 'deleted_user_hidden',
            visibility_reason = 'Account deletion completed: ' || normalized_note,
            hidden_at = now(),
            hidden_by = auth.uid(),
            deleted_at = coalesce(deleted_at, now()),
            deleted_by = auth.uid()
        WHERE id = affected_item_id;

        hidden_item_count := hidden_item_count + 1;
        PERFORM public.record_item_version(affected_item_id, 'account deletion completed');
    END LOOP;

    UPDATE public.items
    SET created_by = NULL
    WHERE created_by = target_user_id;
    GET DIAGNOSTICS anonymized_created_item_count = ROW_COUNT;

    UPDATE public.item_images
    SET uploaded_by = NULL
    WHERE uploaded_by = target_user_id;
    GET DIAGNOSTICS anonymized_image_count = ROW_COUNT;

    UPDATE public.item_suggestions
    SET suggested_by = NULL
    WHERE suggested_by = target_user_id;
    GET DIAGNOSTICS anonymized_suggestion_count = ROW_COUNT;

    UPDATE public.item_flags
    SET flagged_by = NULL
    WHERE flagged_by = target_user_id;
    GET DIAGNOSTICS anonymized_flag_count = ROW_COUNT;

    UPDATE public.notification_events
    SET actor_id = NULL
    WHERE actor_id = target_user_id;
    GET DIAGNOSTICS notification_event_count = ROW_COUNT;

    DELETE FROM public.admins
    WHERE profile_id = target_user_id;
    GET DIAGNOSTICS deleted_admin_count = ROW_COUNT;

    DELETE FROM public.item_sharing
    WHERE shared_with_user_id = target_user_id;
    GET DIAGNOSTICS deleted_sharing_count = ROW_COUNT;

    DELETE FROM public.notification_mutes
    WHERE subject_profile_id = target_user_id;
    GET DIAGNOSTICS deleted_mute_count = ROW_COUNT;

    PERFORM set_config('app.profile_valid_update', 'trusted', true);

    UPDATE public.profiles
    SET
        email = NULL,
        display_name = 'Deleted',
        display_surname = 'user',
        avatar_url = NULL,
        description = NULL,
        profile_valid = false,
        invited_by_code = NULL,
        updated_at = now()
    WHERE id = target_user_id;
    GET DIAGNOSTICS anonymized_profile_count = ROW_COUNT;

    UPDATE public.account_deletion_requests
    SET
        status = 'completed',
        admin_note = normalized_note,
        reviewed_at = now(),
        reviewed_by = auth.uid(),
        completed_at = now()
    WHERE id = request_id_input
      AND status = 'reviewing';
    GET DIAGNOSTICS completed_count = ROW_COUNT;

    IF completed_count <> 1 THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'request_not_completed');
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'subjectUserId', target_user_id,
        'hiddenItemCount', hidden_item_count,
        'returnedItemCount', returned_item_count,
        'anonymizedCreatedItemCount', anonymized_created_item_count,
        'anonymizedImageCount', anonymized_image_count,
        'anonymizedSuggestionCount', anonymized_suggestion_count,
        'anonymizedFlagCount', anonymized_flag_count,
        'notificationEventCount', notification_event_count,
        'deletedAdminCount', deleted_admin_count,
        'deletedSharingCount', deleted_sharing_count,
        'deletedMuteCount', deleted_mute_count,
        'anonymizedProfileCount', anonymized_profile_count,
        'requiresAuthDeletion', true,
        'requiresStorageCleanup', true
    );
END;
$$;

DROP POLICY IF EXISTS "Anyone can select invite codes for verification" ON public.admins;
DROP POLICY IF EXISTS "Allow authenticated users to read invite codes" ON public.admins;
DROP POLICY IF EXISTS "Authenticated users can check admin status" ON public.admins;
DROP POLICY IF EXISTS "Admins have full access to admins table" ON public.admins;
DROP POLICY IF EXISTS "Admins can view admins table" ON public.admins;
CREATE POLICY "Admins can view admins table" ON public.admins FOR SELECT TO authenticated USING ((select public.is_admin()));
DROP POLICY IF EXISTS "No direct admin inserts" ON public.admins;
CREATE POLICY "No direct admin inserts" ON public.admins FOR INSERT TO authenticated WITH CHECK (false);
DROP POLICY IF EXISTS "No direct admin updates" ON public.admins;
CREATE POLICY "No direct admin updates" ON public.admins FOR UPDATE TO authenticated USING (false);
DROP POLICY IF EXISTS "No direct admin deletes" ON public.admins;
CREATE POLICY "No direct admin deletes" ON public.admins FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "Validated users can view accepted item images" ON public.item_images;
CREATE POLICY "Validated users can view accepted item images" ON public.item_images FOR SELECT TO authenticated USING (
    (select public.is_admin()) OR (
        (select public.is_validated())
        AND moderation_state = 'accepted'
        AND deleted_at IS NULL
        AND EXISTS (
            SELECT 1
            FROM public.items parent_item
            WHERE parent_item.id = item_images.item_id
              AND parent_item.deleted_at IS NULL
              AND (
                  parent_item.visibility_state = 'visible'
                  OR parent_item.created_by = (select auth.uid())
                  OR parent_item.borrowed_by = (select auth.uid())
                  OR parent_item.owner_profile_id = (select auth.uid())
              )
        )
    )
);
