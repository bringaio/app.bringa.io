CREATE OR REPLACE FUNCTION public.borrow_item(item_id_input uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    selected_status text;
    selected_borrower uuid;
    selected_visibility_state text;
    selected_deleted_at timestamp with time zone;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_validated() THEN
        RETURN false;
    END IF;

    SELECT status, borrowed_by, visibility_state, deleted_at
    INTO selected_status, selected_borrower, selected_visibility_state, selected_deleted_at
    FROM public.items
    WHERE id = item_id_input
    FOR UPDATE;

    IF NOT FOUND
       OR selected_status <> 'inStock'
       OR selected_borrower IS NOT NULL
       OR selected_visibility_state IS DISTINCT FROM 'visible'
       OR selected_deleted_at IS NOT NULL THEN
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

CREATE OR REPLACE FUNCTION public.delete_item(item_id_input uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    item_creator uuid;
    selected_status text;
    selected_borrower uuid;
    selected_deleted_at timestamp with time zone;
    updated_count integer;
    new_version_id uuid;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_validated() THEN
        RETURN false;
    END IF;

    SELECT created_by, status, borrowed_by, deleted_at
    INTO item_creator, selected_status, selected_borrower, selected_deleted_at
    FROM public.items
    WHERE id = item_id_input
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    IF NOT public.is_admin() AND item_creator IS DISTINCT FROM auth.uid() THEN
        RETURN false;
    END IF;

    IF selected_deleted_at IS NOT NULL
       OR selected_status = 'borrowed'
       OR selected_borrower IS NOT NULL THEN
        RETURN false;
    END IF;

    UPDATE public.items
    SET
        visibility_state = 'deleted_user_hidden',
        visibility_reason = 'Deleted by owner or admin',
        hidden_at = now(),
        hidden_by = auth.uid(),
        deleted_at = now(),
        deleted_by = auth.uid()
    WHERE id = item_id_input;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count <> 1 THEN
        RETURN false;
    END IF;

    SELECT public.record_item_version(item_id_input, 'deleted') INTO new_version_id;
    IF new_version_id IS NULL THEN
        RAISE EXCEPTION 'could not record deleted item version';
    END IF;

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_item_webhook()
RETURNS trigger AS $$
DECLARE
  payload jsonb;
  event_payload jsonb;
  endpoint_url text;
  webhook_secret text;
  notification_event_id uuid;
BEGIN
  endpoint_url := NULLIF(current_setting('app.settings.telegram_item_webhook_url', true), '');
  webhook_secret := NULLIF(current_setting('app.settings.telegram_webhook_secret', true), '');
  IF endpoint_url IS NULL OR webhook_secret IS NULL THEN
    RETURN NEW;
  END IF;

  notification_event_id := public.enqueue_telegram_notification(
    'item',
    TG_TABLE_NAME,
    NEW.id,
    NEW.created_by,
    'item:' || NEW.id::text,
    'Item activity',
    '/items/details?id=' || NEW.id::text,
    'admin'
  );

  IF notification_event_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT to_jsonb(notification_events.*)
  INTO event_payload
  FROM public.notification_events
  WHERE id = notification_event_id;

  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'notification_events',
    'schema', TG_TABLE_SCHEMA,
    'record', event_payload,
    'old_record', NULL
  );

  PERFORM net.http_post(
    url := endpoint_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-bringa-webhook-secret', webhook_secret),
    body := payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.send_user_webhook()
RETURNS trigger AS $$
DECLARE
  payload jsonb;
  event_payload jsonb;
  endpoint_url text;
  webhook_secret text;
  notification_event_id uuid;
BEGIN
  endpoint_url := NULLIF(current_setting('app.settings.telegram_user_webhook_url', true), '');
  webhook_secret := NULLIF(current_setting('app.settings.telegram_webhook_secret', true), '');
  IF endpoint_url IS NULL OR webhook_secret IS NULL THEN
    RETURN NEW;
  END IF;

  notification_event_id := public.enqueue_telegram_notification(
    'profile',
    TG_TABLE_NAME,
    NEW.id,
    NEW.id,
    'profile:' || NEW.id::text,
    'Profile activity',
    '/admin/users',
    'admin'
  );

  IF notification_event_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT to_jsonb(notification_events.*)
  INTO event_payload
  FROM public.notification_events
  WHERE id = notification_event_id;

  payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'notification_events',
    'schema', TG_TABLE_SCHEMA,
    'record', event_payload,
    'old_record', NULL
  );

  PERFORM net.http_post(
    url := endpoint_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-bringa-webhook-secret', webhook_secret),
    body := payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Validated users can upload item images" ON storage.objects;
CREATE POLICY "Validated users can upload item images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'items'
    AND (select public.is_validated())
    AND storage.extension(name) = 'webp'
    AND storage.filename(name) = ANY (ARRAY['detail.webp', 'thumb.webp'])
    AND array_length(storage.foldername(name), 1) = 2
    AND (storage.foldername(name))[1] = (select auth.uid()::text)
    AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
);
