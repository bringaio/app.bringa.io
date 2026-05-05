-- Prepare the database-side completion stage for approved account deletion requests.
-- Auth user deletion and Storage object cleanup still require a trusted service-role workflow.

ALTER TABLE public.account_deletion_requests
  ADD COLUMN IF NOT EXISTS subject_user_id uuid;

UPDATE public.account_deletion_requests
SET subject_user_id = coalesce(subject_user_id, user_id)
WHERE subject_user_id IS NULL;

ALTER TABLE public.account_deletion_requests
  ALTER COLUMN subject_user_id SET NOT NULL;

ALTER TABLE public.account_deletion_requests
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.account_deletion_requests
  DROP CONSTRAINT IF EXISTS account_deletion_requests_user_id_fkey;

ALTER TABLE public.account_deletion_requests
  ADD CONSTRAINT account_deletion_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS public.idx_account_deletion_requests_one_active_per_user;
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_subject_user_id
ON public.account_deletion_requests(subject_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_deletion_requests_one_active_per_subject
ON public.account_deletion_requests(subject_user_id)
WHERE status = ANY (ARRAY['pending'::text, 'reviewing'::text]);

DROP POLICY IF EXISTS "Users can view own deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Users can view own deletion requests"
ON public.account_deletion_requests
FOR SELECT
USING (user_id = auth.uid() OR subject_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.request_account_deletion(note_input text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    existing_request_id uuid;
    new_request_id uuid;
    normalized_note text;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    normalized_note := NULLIF(btrim(coalesce(note_input, '')), '');

    SELECT id
    INTO existing_request_id
    FROM public.account_deletion_requests
    WHERE subject_user_id = auth.uid()
      AND status = ANY (ARRAY['pending'::text, 'reviewing'::text])
    ORDER BY requested_at DESC
    LIMIT 1;

    IF existing_request_id IS NOT NULL THEN
        RETURN existing_request_id;
    END IF;

    INSERT INTO public.account_deletion_requests (user_id, subject_user_id, user_note)
    VALUES (auth.uid(), auth.uid(), normalized_note)
    RETURNING id INTO new_request_id;

    RETURN new_request_id;
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

    UPDATE public.items
    SET borrowed_by = NULL,
        status = 'inStock'
    WHERE borrowed_by = target_user_id;
    GET DIAGNOSTICS returned_item_count = ROW_COUNT;

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

REVOKE EXECUTE ON FUNCTION public.execute_account_deletion_request(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_account_deletion_request(uuid, text) TO authenticated;
