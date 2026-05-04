-- Add admin-only item suggestion application.
-- Accepted content/image suggestions update explicit item fields and record a new item version.

CREATE OR REPLACE FUNCTION public.apply_item_suggestion(
    suggestion_id_input uuid,
    name_input text,
    description_input text DEFAULT NULL,
    image_url_input text DEFAULT NULL,
    admin_note_input text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    selected_item_id uuid;
    normalized_name text;
    normalized_description text;
    normalized_image_url text;
    normalized_note text;
    new_version_id uuid;
    updated_count integer;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RETURN false;
    END IF;

    normalized_name := NULLIF(btrim(coalesce(name_input, '')), '');
    IF normalized_name IS NULL THEN
        RETURN false;
    END IF;

    normalized_note := NULLIF(btrim(coalesce(admin_note_input, '')), '');
    IF normalized_note IS NULL OR length(normalized_note) < 3 THEN
        RETURN false;
    END IF;

    normalized_description := NULLIF(btrim(coalesce(description_input, '')), '');
    normalized_image_url := NULLIF(btrim(coalesce(image_url_input, '')), '');

    SELECT item_id
    INTO selected_item_id
    FROM public.item_suggestions
    WHERE id = suggestion_id_input
      AND status = ANY (ARRAY['pending'::text, 'reviewing'::text])
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    UPDATE public.items
    SET
        name = normalized_name,
        description = normalized_description,
        image_url = normalized_image_url
    WHERE id = selected_item_id;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count <> 1 THEN
        RETURN false;
    END IF;

    SELECT public.record_item_version(selected_item_id, 'accepted suggestion') INTO new_version_id;
    IF new_version_id IS NULL THEN
        RAISE EXCEPTION 'could not record accepted suggestion item version';
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

REVOKE EXECUTE ON FUNCTION public.apply_item_suggestion(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_item_suggestion(uuid, text, text, text, text) TO authenticated;
