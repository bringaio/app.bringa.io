CREATE OR REPLACE FUNCTION public.borrow_item(item_id_input uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    selected_status text;
    selected_borrower uuid;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_validated() THEN
        RETURN false;
    END IF;

    SELECT status, borrowed_by
    INTO selected_status, selected_borrower
    FROM public.items
    WHERE id = item_id_input
    FOR UPDATE;

    IF NOT FOUND OR selected_status <> 'inStock' OR selected_borrower IS NOT NULL THEN
        RETURN false;
    END IF;

    UPDATE public.items
    SET status = 'borrowed', borrowed_by = auth.uid()
    WHERE id = item_id_input;

    INSERT INTO public.borrow_history (item_id, borrower_id, borrowed_at)
    VALUES (item_id_input, auth.uid(), now());

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.return_item(item_id_input uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    selected_borrower uuid;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_validated() THEN
        RETURN false;
    END IF;

    SELECT borrowed_by
    INTO selected_borrower
    FROM public.items
    WHERE id = item_id_input
    FOR UPDATE;

    IF NOT FOUND OR selected_borrower IS DISTINCT FROM auth.uid() THEN
        RETURN false;
    END IF;

    UPDATE public.items
    SET status = 'inStock', borrowed_by = NULL
    WHERE id = item_id_input;

    WITH open_history AS (
        SELECT id
        FROM public.borrow_history
        WHERE item_id = item_id_input
          AND borrower_id = auth.uid()
          AND returned_at IS NULL
        ORDER BY borrowed_at DESC
        LIMIT 1
    )
    UPDATE public.borrow_history
    SET returned_at = now()
    WHERE id IN (SELECT id FROM open_history);

    RETURN true;
END;
$$;
