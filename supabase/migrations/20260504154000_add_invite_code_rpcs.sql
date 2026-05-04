CREATE OR REPLACE FUNCTION public.get_my_invite_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    selected_code text;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RETURN NULL;
    END IF;

    SELECT invite_code
    INTO selected_code
    FROM public.admins
    WHERE profile_id = auth.uid();

    RETURN selected_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_my_invite_code(invite_code_input text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    normalized_code text;
    updated_count integer;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RETURN false;
    END IF;

    normalized_code := NULLIF(btrim(invite_code_input), '');
    IF normalized_code IS NULL THEN
        RETURN false;
    END IF;

    UPDATE public.admins
    SET invite_code = normalized_code
    WHERE profile_id = auth.uid();

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count = 1;
END;
$$;
