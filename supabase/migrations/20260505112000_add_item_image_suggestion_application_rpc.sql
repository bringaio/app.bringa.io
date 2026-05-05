-- Add admin-only image suggestion application into item_images metadata.
-- Direct browser writes to item_images remain blocked by RLS.

CREATE OR REPLACE FUNCTION public.apply_item_image_suggestion(
    suggestion_id_input uuid,
    storage_bucket_input text DEFAULT 'items',
    storage_path_input text DEFAULT NULL,
    public_url_input text DEFAULT NULL,
    caption_input text DEFAULT NULL,
    alt_text_input text DEFAULT NULL,
    is_cover_input boolean DEFAULT false,
    admin_note_input text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    selected_item_id uuid;
    existing_image_item_id uuid;
    normalized_bucket text;
    normalized_path text;
    normalized_public_url text;
    normalized_caption text;
    normalized_alt_text text;
    normalized_note text;
    new_version_id uuid;
    updated_count integer;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RETURN false;
    END IF;

    normalized_bucket := NULLIF(btrim(coalesce(storage_bucket_input, 'items')), '');
    normalized_path := NULLIF(btrim(coalesce(storage_path_input, '')), '');
    normalized_public_url := NULLIF(btrim(coalesce(public_url_input, '')), '');
    normalized_caption := NULLIF(btrim(coalesce(caption_input, '')), '');
    normalized_alt_text := NULLIF(btrim(coalesce(alt_text_input, '')), '');
    normalized_note := NULLIF(btrim(coalesce(admin_note_input, '')), '');

    IF normalized_bucket IS NULL
       OR normalized_path IS NULL
       OR normalized_path LIKE '/%' OR normalized_path LIKE '%..%'
       OR normalized_alt_text IS NULL OR length(normalized_alt_text) < 3
       OR normalized_note IS NULL OR length(normalized_note) < 3 THEN
        RETURN false;
    END IF;

    SELECT item_id
    INTO selected_item_id
    FROM public.item_suggestions
    WHERE id = suggestion_id_input
      AND suggestion_type = 'image'
      AND status = ANY (ARRAY['pending'::text, 'reviewing'::text])
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    SELECT item_id
    INTO existing_image_item_id
    FROM public.item_images
    WHERE storage_bucket = normalized_bucket
      AND storage_path = normalized_path
    FOR UPDATE;

    IF FOUND AND existing_image_item_id IS DISTINCT FROM selected_item_id THEN
        RETURN false;
    END IF;

    IF is_cover_input THEN
        UPDATE public.item_images
        SET is_cover = false
        WHERE item_id = selected_item_id;
    END IF;

    INSERT INTO public.item_images (
        item_id,
        storage_bucket,
        storage_path,
        public_url,
        uploaded_by,
        caption,
        alt_text,
        is_cover,
        moderation_state,
        deleted_at
    )
    VALUES (
        selected_item_id,
        normalized_bucket,
        normalized_path,
        normalized_public_url,
        auth.uid(),
        normalized_caption,
        normalized_alt_text,
        is_cover_input,
        'accepted',
        NULL
    )
    ON CONFLICT (storage_bucket, storage_path) DO UPDATE
    SET
        item_id = EXCLUDED.item_id,
        public_url = EXCLUDED.public_url,
        uploaded_by = EXCLUDED.uploaded_by,
        caption = EXCLUDED.caption,
        alt_text = EXCLUDED.alt_text,
        is_cover = EXCLUDED.is_cover,
        moderation_state = 'accepted',
        deleted_at = NULL;

    IF is_cover_input THEN
        UPDATE public.items
        SET image_url = coalesce(normalized_public_url, image_url)
        WHERE id = selected_item_id;
    END IF;

    SELECT public.record_item_version(selected_item_id, 'accepted image suggestion') INTO new_version_id;
    IF new_version_id IS NULL THEN
        RAISE EXCEPTION 'could not record accepted image suggestion item version';
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

REVOKE EXECUTE ON FUNCTION public.apply_item_image_suggestion(uuid, text, text, text, text, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_item_image_suggestion(uuid, text, text, text, text, text, boolean, text) TO authenticated;
