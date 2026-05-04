CREATE OR REPLACE FUNCTION public.verify_and_apply_invite(invite_code_input text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    updated_count integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;

    IF EXISTS (SELECT 1 FROM public.admins WHERE invite_code = btrim(invite_code_input)) THEN
        UPDATE public.profiles
        SET profile_valid = true, invited_by_code = btrim(invite_code_input)
        WHERE id = auth.uid();
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        RETURN updated_count = 1;
    END IF;

    RETURN false;
END;
$$;
