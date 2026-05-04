-- Add admin-only profile validation RPC and allow trusted RPCs through the profile escalation trigger.

CREATE OR REPLACE FUNCTION public.set_profile_validation(
    profile_id_input uuid,
    profile_valid_input boolean
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    updated_count integer;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RETURN false;
    END IF;

    IF profile_valid_input IS NULL THEN
        RETURN false;
    END IF;

    IF profile_id_input = auth.uid() AND NOT profile_valid_input THEN
        RETURN false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id_input) THEN
        RETURN false;
    END IF;

    PERFORM set_config('app.profile_valid_update', 'trusted', true);

    UPDATE public.profiles
    SET profile_valid = profile_valid_input
    WHERE id = profile_id_input;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_and_apply_invite(invite_code_input text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    updated_count integer;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN false;
    END IF;

    IF EXISTS (SELECT 1 FROM public.admins WHERE invite_code = btrim(invite_code_input)) THEN
        PERFORM set_config('app.profile_valid_update', 'trusted', true);

        UPDATE public.profiles
        SET profile_valid = true, invited_by_code = btrim(invite_code_input)
        WHERE id = auth.uid();
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        RETURN updated_count = 1;
    END IF;
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_profile_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF auth.role() = 'authenticated'
       AND current_setting('app.profile_valid_update', true) IS DISTINCT FROM 'trusted' THEN
        NEW.profile_valid = OLD.profile_valid;
        NEW.invited_by_code = OLD.invited_by_code;
    END IF;
    RETURN NEW;
END;
$$;
