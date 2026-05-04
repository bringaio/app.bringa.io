-- Add non-destructive admin review for account deletion requests.
-- This does not delete Auth users, Storage objects, item images, item records, or profile rows.

DROP INDEX IF EXISTS public.idx_account_deletion_requests_one_pending_per_user;
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_deletion_requests_one_active_per_user
    ON public.account_deletion_requests(user_id)
    WHERE status = ANY (ARRAY['pending'::text, 'reviewing'::text]);

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
    WHERE user_id = auth.uid()
      AND status = ANY (ARRAY['pending'::text, 'reviewing'::text])
    ORDER BY requested_at DESC
    LIMIT 1;

    IF existing_request_id IS NOT NULL THEN
        RETURN existing_request_id;
    END IF;

    INSERT INTO public.account_deletion_requests (user_id, user_note)
    VALUES (auth.uid(), normalized_note)
    RETURNING id INTO new_request_id;

    RETURN new_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_account_deletion_request(
    request_id_input uuid,
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
    IF normalized_status IS NULL OR normalized_status <> ALL (ARRAY['reviewing', 'cancelled']) THEN
        RETURN false;
    END IF;

    normalized_note := NULLIF(btrim(coalesce(admin_note_input, '')), '');
    IF normalized_status = 'cancelled' AND normalized_note IS NULL THEN
        RETURN false;
    END IF;

    UPDATE public.account_deletion_requests
    SET
        status = normalized_status,
        admin_note = coalesce(normalized_note, admin_note),
        reviewed_at = now(),
        reviewed_by = auth.uid(),
        completed_at = NULL
    WHERE id = request_id_input
      AND status = ANY (ARRAY['pending'::text, 'reviewing'::text]);

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count = 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.review_account_deletion_request(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_account_deletion_request(uuid, text, text) TO authenticated;
