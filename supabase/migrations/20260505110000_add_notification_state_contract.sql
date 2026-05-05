-- Add Telegram notification state, dedupe, mute windows, and delivery status recording.
-- The existing misspelled Edge Function names remain the deployed surface.

CREATE TABLE IF NOT EXISTS public.notification_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    channel text NOT NULL DEFAULT 'telegram'::text CHECK (channel = ANY (ARRAY['telegram'::text])),
    audience text NOT NULL DEFAULT 'admin'::text CHECK (audience = ANY (ARRAY['admin'::text])),
    notification_kind text NOT NULL CHECK (notification_kind = ANY (ARRAY['item'::text, 'profile'::text, 'moderation'::text, 'deletion'::text, 'system'::text])),
    source_table text NOT NULL,
    source_id uuid NOT NULL,
    actor_id uuid,
    dedupe_key text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'skipped_muted'::text])),
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    last_error text,
    next_attempt_at timestamp with time zone,
    delivered_at timestamp with time zone,
    seen_at timestamp with time zone,
    seen_by uuid,
    admin_note text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notification_events_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.notification_mutes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    subject_profile_id uuid NOT NULL,
    muted_by uuid,
    muted_until timestamp with time zone,
    muted_forever boolean NOT NULL DEFAULT false,
    reason text NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notification_mutes_pkey PRIMARY KEY (id),
    CONSTRAINT notification_mutes_has_window CHECK (muted_forever OR muted_until IS NOT NULL)
);

ALTER TABLE public.notification_events ADD CONSTRAINT notification_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.notification_events ADD CONSTRAINT notification_events_seen_by_fkey FOREIGN KEY (seen_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.notification_mutes ADD CONSTRAINT notification_mutes_subject_profile_id_fkey FOREIGN KEY (subject_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.notification_mutes ADD CONSTRAINT notification_mutes_muted_by_fkey FOREIGN KEY (muted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notification_events_status_created_at ON public.notification_events(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_events_actor_id ON public.notification_events(actor_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_events_unseen_dedupe ON public.notification_events(channel, audience, dedupe_key) WHERE seen_at IS NULL AND status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text]);
CREATE INDEX IF NOT EXISTS idx_notification_mutes_subject_profile_id ON public.notification_mutes(subject_profile_id);

CREATE OR REPLACE FUNCTION public.is_telegram_muted(profile_id_input uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.notification_mutes
        WHERE subject_profile_id = profile_id_input
          AND revoked_at IS NULL
          AND (muted_forever OR muted_until > now())
    );
$$;

CREATE OR REPLACE FUNCTION public.enqueue_telegram_notification(
    notification_kind_input text,
    source_table_input text,
    source_id_input uuid,
    actor_id_input uuid,
    dedupe_key_input text,
    title_input text,
    url_path_input text,
    audience_input text DEFAULT 'admin'
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    normalized_kind text;
    normalized_table text;
    normalized_dedupe_key text;
    normalized_title text;
    normalized_url_path text;
    normalized_audience text;
    existing_event_id uuid;
    new_event_id uuid;
BEGIN
    normalized_kind := lower(NULLIF(btrim(coalesce(notification_kind_input, '')), ''));
    normalized_table := lower(NULLIF(btrim(coalesce(source_table_input, '')), ''));
    normalized_dedupe_key := NULLIF(btrim(coalesce(dedupe_key_input, '')), '');
    normalized_title := NULLIF(btrim(coalesce(title_input, '')), '');
    normalized_url_path := NULLIF(btrim(coalesce(url_path_input, '')), '');
    normalized_audience := lower(NULLIF(btrim(coalesce(audience_input, '')), ''));

    IF normalized_kind IS NULL
       OR normalized_kind <> ALL (ARRAY['item', 'profile', 'moderation', 'deletion', 'system'])
       OR normalized_table IS NULL
       OR source_id_input IS NULL
       OR normalized_dedupe_key IS NULL
       OR normalized_title IS NULL
       OR normalized_url_path IS NULL
       OR normalized_audience IS NULL
       OR normalized_audience <> 'admin' THEN
        RETURN NULL;
    END IF;

    IF actor_id_input IS NOT NULL AND public.is_telegram_muted(actor_id_input) THEN
        INSERT INTO public.notification_events (
            audience,
            notification_kind,
            source_table,
            source_id,
            actor_id,
            dedupe_key,
            payload,
            status
        )
        VALUES (
            normalized_audience,
            normalized_kind,
            normalized_table,
            source_id_input,
            actor_id_input,
            normalized_dedupe_key,
            jsonb_build_object('title', normalized_title, 'url_path', normalized_url_path),
            'skipped_muted'
        );

        RETURN NULL;
    END IF;

    SELECT id
    INTO existing_event_id
    FROM public.notification_events
    WHERE channel = 'telegram'
      AND audience = normalized_audience
      AND dedupe_key = normalized_dedupe_key
      AND seen_at IS NULL
      AND status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text])
    ORDER BY created_at DESC
    LIMIT 1;

    IF existing_event_id IS NOT NULL THEN
        RETURN NULL;
    END IF;

    INSERT INTO public.notification_events (
        audience,
        notification_kind,
        source_table,
        source_id,
        actor_id,
        dedupe_key,
        payload
    )
    VALUES (
        normalized_audience,
        normalized_kind,
        normalized_table,
        source_id_input,
        actor_id_input,
        normalized_dedupe_key,
        jsonb_build_object('title', normalized_title, 'url_path', normalized_url_path)
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO new_event_id;

    RETURN new_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notification_seen(
    event_id_input uuid,
    admin_note_input text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    normalized_note text;
    updated_count integer;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RETURN false;
    END IF;

    normalized_note := NULLIF(btrim(coalesce(admin_note_input, '')), '');

    UPDATE public.notification_events
    SET
        seen_at = now(),
        seen_by = auth.uid(),
        admin_note = coalesce(normalized_note, admin_note)
    WHERE id = event_id_input
      AND seen_at IS NULL;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_telegram_mute(
    profile_id_input uuid,
    mute_window_input text,
    reason_input text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    normalized_window text;
    normalized_reason text;
    selected_until timestamp with time zone;
    selected_forever boolean := false;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RETURN false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id_input) THEN
        RETURN false;
    END IF;

    normalized_window := lower(replace(NULLIF(btrim(coalesce(mute_window_input, '')), ''), '_', ' '));
    normalized_reason := NULLIF(btrim(coalesce(reason_input, '')), '');

    IF normalized_window IS NULL THEN
        RETURN false;
    END IF;

    IF normalized_window = ANY (ARRAY['none', 'clear', 'off', 'unmute']) THEN
        UPDATE public.notification_mutes
        SET revoked_at = now()
        WHERE subject_profile_id = profile_id_input
          AND revoked_at IS NULL;

        RETURN true;
    END IF;

    IF normalized_reason IS NULL OR length(normalized_reason) < 3 THEN
        RETURN false;
    END IF;

    IF normalized_window = ANY (ARRAY['1 day', 'day', '24 hours']) THEN
        selected_until := now() + interval '1 day';
    ELSIF normalized_window = ANY (ARRAY['1 week', 'week', '7 days']) THEN
        selected_until := now() + interval '1 week';
    ELSIF normalized_window = 'forever' THEN
        selected_forever := true;
    ELSE
        RETURN false;
    END IF;

    UPDATE public.notification_mutes
    SET revoked_at = now()
    WHERE subject_profile_id = profile_id_input
      AND revoked_at IS NULL;

    INSERT INTO public.notification_mutes (
        subject_profile_id,
        muted_by,
        muted_until,
        muted_forever,
        reason
    )
    VALUES (
        profile_id_input,
        auth.uid(),
        selected_until,
        selected_forever,
        normalized_reason
    );

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_notification_delivery(
    event_id_input uuid,
    status_input text,
    error_input text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    normalized_status text;
    normalized_error text;
    updated_count integer;
BEGIN
    IF auth.role() IS DISTINCT FROM 'service_role' THEN
        RETURN false;
    END IF;

    normalized_status := lower(NULLIF(btrim(coalesce(status_input, '')), ''));
    IF normalized_status IS NULL OR normalized_status <> ALL (ARRAY['sent', 'failed']) THEN
        RETURN false;
    END IF;

    normalized_error := NULLIF(btrim(coalesce(error_input, '')), '');

    UPDATE public.notification_events
    SET
        status = normalized_status,
        attempts = attempts + 1,
        delivered_at = CASE WHEN normalized_status = 'sent' THEN now() ELSE delivered_at END,
        last_error = CASE WHEN normalized_status = 'failed' THEN normalized_error ELSE NULL END,
        next_attempt_at = CASE WHEN normalized_status = 'failed' THEN now() + interval '15 minutes' ELSE NULL END
    WHERE id = event_id_input
      AND status <> 'skipped_muted';

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_item_webhook()
RETURNS trigger AS $$
DECLARE
  payload jsonb;
  event_payload jsonb;
  endpoint_url text;
  notification_event_id uuid;
BEGIN
  endpoint_url := NULLIF(current_setting('app.settings.telegram_item_webhook_url', true), '');
  IF endpoint_url IS NULL THEN
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
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || COALESCE(current_setting('app.settings.telegram_bot_token', true), '')),
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
  notification_event_id uuid;
BEGIN
  endpoint_url := NULLIF(current_setting('app.settings.telegram_user_webhook_url', true), '');
  IF endpoint_url IS NULL THEN
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
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || COALESCE(current_setting('app.settings.telegram_bot_token', true), '')),
    body := payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view notification events" ON public.notification_events;
CREATE POLICY "Admins can view notification events" ON public.notification_events FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "No direct notification event inserts" ON public.notification_events;
CREATE POLICY "No direct notification event inserts" ON public.notification_events FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS "No direct notification event updates" ON public.notification_events;
CREATE POLICY "No direct notification event updates" ON public.notification_events FOR UPDATE USING (false);
DROP POLICY IF EXISTS "No direct notification event deletes" ON public.notification_events;
CREATE POLICY "No direct notification event deletes" ON public.notification_events FOR DELETE USING (false);

ALTER TABLE public.notification_mutes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view notification mutes" ON public.notification_mutes;
CREATE POLICY "Admins can view notification mutes" ON public.notification_mutes FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "No direct notification mute inserts" ON public.notification_mutes;
CREATE POLICY "No direct notification mute inserts" ON public.notification_mutes FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS "No direct notification mute updates" ON public.notification_mutes;
CREATE POLICY "No direct notification mute updates" ON public.notification_mutes FOR UPDATE USING (false);
DROP POLICY IF EXISTS "No direct notification mute deletes" ON public.notification_mutes;
CREATE POLICY "No direct notification mute deletes" ON public.notification_mutes FOR DELETE USING (false);

REVOKE EXECUTE ON FUNCTION public.enqueue_telegram_notification(text, text, uuid, uuid, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_telegram_muted(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_notification_seen(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_telegram_mute(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_notification_delivery(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notification_seen(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_telegram_mute(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_notification_delivery(uuid, text, text) TO service_role;
