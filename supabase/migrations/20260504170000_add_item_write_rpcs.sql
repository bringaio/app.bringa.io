CREATE OR REPLACE FUNCTION public.create_item(
    name_input text,
    description_input text DEFAULT NULL,
    image_url_input text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    new_item_id uuid;
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
    RETURN updated_count = 1;
END;
$$;

DROP POLICY IF EXISTS "Validated users can insert items" ON public.items;
DROP POLICY IF EXISTS "No direct item inserts" ON public.items;
CREATE POLICY "No direct item inserts" ON public.items FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Admins and creators can update items" ON public.items;
DROP POLICY IF EXISTS "No direct item updates" ON public.items;
CREATE POLICY "No direct item updates" ON public.items FOR UPDATE USING (false);
