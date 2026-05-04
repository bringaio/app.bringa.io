-- Add admin-only moderation review RPCs.
-- Direct updates to moderation tables remain blocked by RLS.

CREATE OR REPLACE FUNCTION public.review_item_suggestion(
    suggestion_id_input uuid,
    status_input text,
    admin_note_input text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    normalized_status text;
    normalized_note text;
    updated_count integer;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RETURN false;
    END IF;

    normalized_status := lower(NULLIF(btrim(coalesce(status_input, '')), ''));
    IF normalized_status IS NULL OR normalized_status <> ALL (ARRAY['reviewing', 'accepted', 'rejected', 'closed']) THEN
        RETURN false;
    END IF;

    normalized_note := NULLIF(btrim(coalesce(admin_note_input, '')), '');

    UPDATE public.item_suggestions
    SET
        status = normalized_status,
        admin_note = coalesce(normalized_note, admin_note),
        reviewed_at = now(),
        reviewed_by = auth.uid()
    WHERE id = suggestion_id_input;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_item_flag(
    flag_id_input uuid,
    status_input text,
    admin_note_input text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    normalized_status text;
    normalized_note text;
    updated_count integer;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RETURN false;
    END IF;

    normalized_status := lower(NULLIF(btrim(coalesce(status_input, '')), ''));
    IF normalized_status IS NULL OR normalized_status <> ALL (ARRAY['reviewing', 'resolved', 'dismissed']) THEN
        RETURN false;
    END IF;

    normalized_note := NULLIF(btrim(coalesce(admin_note_input, '')), '');

    UPDATE public.item_flags
    SET
        status = normalized_status,
        admin_note = coalesce(normalized_note, admin_note),
        reviewed_at = now(),
        reviewed_by = auth.uid()
    WHERE id = flag_id_input;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count = 1;
END;
$$;
