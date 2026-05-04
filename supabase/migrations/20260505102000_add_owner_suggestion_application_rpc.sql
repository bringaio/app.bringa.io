-- Add admin-only owner suggestion application.
-- Accepted owner suggestions update explicit ownership fields and record a new item version.

CREATE OR REPLACE FUNCTION public.apply_owner_item_suggestion(
    suggestion_id_input uuid,
    owner_kind_input text,
    owner_profile_id_input uuid DEFAULT NULL,
    owner_label_input text DEFAULT NULL,
    admin_note_input text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    selected_item_id uuid;
    normalized_kind text;
    normalized_label text;
    normalized_note text;
    selected_owner_profile_id uuid;
    selected_owner_label text;
    new_version_id uuid;
    updated_count integer;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RETURN false;
    END IF;

    normalized_kind := lower(NULLIF(btrim(coalesce(owner_kind_input, '')), ''));
    IF normalized_kind IS NULL OR normalized_kind <> ALL (ARRAY['operator', 'profile', 'free_text']) THEN
        RETURN false;
    END IF;

    normalized_note := NULLIF(btrim(coalesce(admin_note_input, '')), '');
    IF normalized_note IS NULL OR length(normalized_note) < 3 THEN
        RETURN false;
    END IF;

    normalized_label := NULLIF(btrim(coalesce(owner_label_input, '')), '');

    IF normalized_kind = 'profile' THEN
        IF owner_profile_id_input IS NULL THEN
            RETURN false;
        END IF;

        PERFORM 1 FROM public.profiles WHERE id = owner_profile_id_input;
        IF NOT FOUND THEN
            RETURN false;
        END IF;

        selected_owner_profile_id := owner_profile_id_input;
        selected_owner_label := NULL;
    ELSIF normalized_kind = 'free_text' THEN
        IF normalized_label IS NULL THEN
            RETURN false;
        END IF;

        selected_owner_profile_id := NULL;
        selected_owner_label := normalized_label;
    ELSE
        selected_owner_profile_id := NULL;
        selected_owner_label := normalized_label;
    END IF;

    SELECT item_id
    INTO selected_item_id
    FROM public.item_suggestions
    WHERE id = suggestion_id_input
      AND suggestion_type = 'owner'
      AND status = ANY (ARRAY['pending'::text, 'reviewing'::text])
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    UPDATE public.items
    SET
        owner_kind = normalized_kind,
        owner_profile_id = selected_owner_profile_id,
        owner_label = selected_owner_label
    WHERE id = selected_item_id;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count <> 1 THEN
        RETURN false;
    END IF;

    SELECT public.record_item_version(selected_item_id, 'accepted owner suggestion') INTO new_version_id;
    IF new_version_id IS NULL THEN
        RAISE EXCEPTION 'could not record accepted owner suggestion item version';
    END IF;

    UPDATE public.item_suggestions
    SET
        status = 'accepted',
        admin_note = normalized_note,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    WHERE id = suggestion_id_input
      AND status = ANY (ARRAY['pending'::text, 'reviewing'::text]);

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count = 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_owner_item_suggestion(uuid, text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_owner_item_suggestion(uuid, text, uuid, text, text) TO authenticated;
