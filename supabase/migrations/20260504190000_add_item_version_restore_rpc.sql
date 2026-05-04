-- Add item version capture and admin restore-by-republish RPCs.
-- Direct writes to item_versions remain blocked by RLS.

CREATE OR REPLACE FUNCTION public.record_item_version(
    item_id_input uuid,
    reason_input text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    current_item public.items%ROWTYPE;
    new_version_id uuid;
    next_version_number integer;
    normalized_reason text;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT *
    INTO current_item
    FROM public.items
    WHERE id = item_id_input
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    IF NOT public.is_admin() THEN
        IF NOT public.is_validated() OR current_item.created_by IS DISTINCT FROM auth.uid() THEN
            RETURN NULL;
        END IF;
    END IF;

    SELECT coalesce(max(version_number), 0) + 1
    INTO next_version_number
    FROM public.item_versions
    WHERE item_id = item_id_input;

    normalized_reason := NULLIF(btrim(coalesce(reason_input, '')), '');

    INSERT INTO public.item_versions (
        item_id,
        version_number,
        name,
        description,
        image_url,
        owner_kind,
        owner_profile_id,
        owner_label,
        visibility_state,
        actor_id,
        reason
    )
    VALUES (
        current_item.id,
        next_version_number,
        current_item.name,
        current_item.description,
        current_item.image_url,
        current_item.owner_kind,
        current_item.owner_profile_id,
        current_item.owner_label,
        current_item.visibility_state,
        auth.uid(),
        normalized_reason
    )
    RETURNING id INTO new_version_id;

    RETURN new_version_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_item_version(uuid, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.create_item(
    name_input text,
    description_input text DEFAULT NULL,
    image_url_input text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    new_item_id uuid;
    new_version_id uuid;
    normalized_name text;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_validated() THEN
        RETURN NULL;
    END IF;

    normalized_name := NULLIF(btrim(name_input), '');
    IF normalized_name IS NULL THEN
        RETURN NULL;
    END IF;

    INSERT INTO public.items (name, description, image_url, status, created_by)
    VALUES (
        normalized_name,
        NULLIF(btrim(coalesce(description_input, '')), ''),
        NULLIF(btrim(coalesce(image_url_input, '')), ''),
        'inStock',
        auth.uid()
    )
    RETURNING id INTO new_item_id;

    SELECT public.record_item_version(new_item_id, 'created') INTO new_version_id;
    IF new_version_id IS NULL THEN
        RAISE EXCEPTION 'could not record created item version';
    END IF;

    RETURN new_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_item(
    item_id_input uuid,
    name_input text,
    description_input text DEFAULT NULL,
    image_url_input text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    item_creator uuid;
    new_version_id uuid;
    normalized_name text;
    updated_count integer;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_validated() THEN
        RETURN false;
    END IF;

    normalized_name := NULLIF(btrim(name_input), '');
    IF normalized_name IS NULL THEN
        RETURN false;
    END IF;

    SELECT created_by
    INTO item_creator
    FROM public.items
    WHERE id = item_id_input;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    IF NOT public.is_admin() AND item_creator IS DISTINCT FROM auth.uid() THEN
        RETURN false;
    END IF;

    UPDATE public.items
    SET
        name = normalized_name,
        description = NULLIF(btrim(coalesce(description_input, '')), ''),
        image_url = NULLIF(btrim(coalesce(image_url_input, '')), '')
    WHERE id = item_id_input;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count <> 1 THEN
        RETURN false;
    END IF;

    SELECT public.record_item_version(item_id_input, 'updated') INTO new_version_id;
    IF new_version_id IS NULL THEN
        RAISE EXCEPTION 'could not record updated item version';
    END IF;

    RETURN true;
END;
$$;

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
        owner_kind = selected_version.owner_kind,
        owner_profile_id = selected_version.owner_profile_id,
        owner_label = selected_version.owner_label,
        visibility_state = selected_version.visibility_state,
        visibility_reason = restore_reason,
        hidden_at = CASE WHEN selected_version.visibility_state = 'visible' THEN NULL ELSE now() END,
        hidden_by = CASE WHEN selected_version.visibility_state = 'visible' THEN NULL ELSE auth.uid() END
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
