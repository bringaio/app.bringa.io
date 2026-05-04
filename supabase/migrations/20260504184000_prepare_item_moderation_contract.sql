-- Prepare user item suggestions and flags for a future admin moderation queue.
-- Users create records through RPCs; browser clients do not write moderation tables directly.

CREATE TABLE IF NOT EXISTS public.item_suggestions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL,
    suggested_by uuid,
    suggestion_type text NOT NULL DEFAULT 'content'::text CHECK (suggestion_type = ANY (ARRAY['content'::text, 'image'::text, 'visibility'::text, 'owner'::text, 'other'::text])),
    suggestion text NOT NULL CHECK (length(btrim(suggestion)) > 0),
    status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'accepted'::text, 'rejected'::text, 'closed'::text])),
    admin_note text,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT item_suggestions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.item_flags (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL,
    flagged_by uuid,
    reason text NOT NULL DEFAULT 'other'::text CHECK (reason = ANY (ARRAY['incorrect'::text, 'unavailable'::text, 'unsafe'::text, 'image'::text, 'spam'::text, 'other'::text])),
    note text,
    status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'resolved'::text, 'dismissed'::text])),
    admin_note text,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT item_flags_pkey PRIMARY KEY (id)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'item_suggestions_item_id_fkey') THEN
        ALTER TABLE public.item_suggestions
            ADD CONSTRAINT item_suggestions_item_id_fkey
            FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'item_suggestions_suggested_by_fkey') THEN
        ALTER TABLE public.item_suggestions
            ADD CONSTRAINT item_suggestions_suggested_by_fkey
            FOREIGN KEY (suggested_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'item_suggestions_reviewed_by_fkey') THEN
        ALTER TABLE public.item_suggestions
            ADD CONSTRAINT item_suggestions_reviewed_by_fkey
            FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'item_flags_item_id_fkey') THEN
        ALTER TABLE public.item_flags
            ADD CONSTRAINT item_flags_item_id_fkey
            FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'item_flags_flagged_by_fkey') THEN
        ALTER TABLE public.item_flags
            ADD CONSTRAINT item_flags_flagged_by_fkey
            FOREIGN KEY (flagged_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'item_flags_reviewed_by_fkey') THEN
        ALTER TABLE public.item_flags
            ADD CONSTRAINT item_flags_reviewed_by_fkey
            FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_item_suggestions_item_id ON public.item_suggestions(item_id);
CREATE INDEX IF NOT EXISTS idx_item_suggestions_status_created_at ON public.item_suggestions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_item_suggestions_suggested_by ON public.item_suggestions(suggested_by);
CREATE INDEX IF NOT EXISTS idx_item_flags_item_id ON public.item_flags(item_id);
CREATE INDEX IF NOT EXISTS idx_item_flags_status_created_at ON public.item_flags(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_item_flags_flagged_by ON public.item_flags(flagged_by);
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_flags_one_pending_reason_per_user ON public.item_flags(item_id, flagged_by, reason) WHERE status = 'pending' AND flagged_by IS NOT NULL;

CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    export_payload jsonb;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT jsonb_build_object(
        'exported_at', now(),
        'profile', (
            SELECT to_jsonb(profile_row)
            FROM (
                SELECT id, email, display_name, display_surname, avatar_url, description, profile_valid, invited_by_code, created_at, updated_at
                FROM public.profiles
                WHERE id = auth.uid()
            ) AS profile_row
        ),
        'created_items', coalesce((
            SELECT jsonb_agg(to_jsonb(item_row) ORDER BY item_row.created_at DESC)
            FROM (
                SELECT id, created_at, name, description, image_url, status, owner_kind, owner_profile_id, owner_label, visibility_state, visibility_reason, hidden_at, deleted_at, handoff_policy
                FROM public.items
                WHERE created_by = auth.uid()
            ) AS item_row
        ), '[]'::jsonb),
        'borrowed_items', coalesce((
            SELECT jsonb_agg(to_jsonb(item_row) ORDER BY item_row.created_at DESC)
            FROM (
                SELECT id, created_at, name, description, image_url, status, owner_kind, owner_profile_id, owner_label, visibility_state, handoff_policy
                FROM public.items
                WHERE borrowed_by = auth.uid()
            ) AS item_row
        ), '[]'::jsonb),
        'borrow_history', coalesce((
            SELECT jsonb_agg(to_jsonb(history_row) ORDER BY history_row.borrowed_at DESC)
            FROM (
                SELECT id, item_id, borrowed_at, returned_at, notes, created_at
                FROM public.borrow_history
                WHERE borrower_id = auth.uid()
            ) AS history_row
        ), '[]'::jsonb),
        'account_deletion_requests', coalesce((
            SELECT jsonb_agg(to_jsonb(request_row) ORDER BY request_row.requested_at DESC)
            FROM (
                SELECT id, status, user_note, requested_at, reviewed_at, completed_at, created_at
                FROM public.account_deletion_requests
                WHERE user_id = auth.uid()
            ) AS request_row
        ), '[]'::jsonb),
        'item_suggestions', coalesce((
            SELECT jsonb_agg(to_jsonb(suggestion_row) ORDER BY suggestion_row.created_at DESC)
            FROM (
                SELECT id, item_id, suggestion_type, suggestion, status, admin_note, reviewed_at, created_at
                FROM public.item_suggestions
                WHERE suggested_by = auth.uid()
            ) AS suggestion_row
        ), '[]'::jsonb),
        'item_flags', coalesce((
            SELECT jsonb_agg(to_jsonb(flag_row) ORDER BY flag_row.created_at DESC)
            FROM (
                SELECT id, item_id, reason, note, status, admin_note, reviewed_at, created_at
                FROM public.item_flags
                WHERE flagged_by = auth.uid()
            ) AS flag_row
        ), '[]'::jsonb)
    )
    INTO export_payload;

    RETURN export_payload;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_item_suggestion(
    item_id_input uuid,
    suggestion_input text,
    suggestion_type_input text DEFAULT 'content'
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    normalized_suggestion text;
    normalized_type text;
    new_suggestion_id uuid;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_validated() THEN
        RETURN NULL;
    END IF;

    normalized_suggestion := NULLIF(btrim(coalesce(suggestion_input, '')), '');
    IF normalized_suggestion IS NULL THEN
        RETURN NULL;
    END IF;

    normalized_type := lower(NULLIF(btrim(coalesce(suggestion_type_input, '')), ''));
    IF normalized_type IS NULL OR normalized_type <> ALL (ARRAY['content', 'image', 'visibility', 'owner', 'other']) THEN
        normalized_type := 'other';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.items WHERE id = item_id_input) THEN
        RETURN NULL;
    END IF;

    INSERT INTO public.item_suggestions (item_id, suggested_by, suggestion_type, suggestion)
    VALUES (item_id_input, auth.uid(), normalized_type, normalized_suggestion)
    RETURNING id INTO new_suggestion_id;

    RETURN new_suggestion_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_item_flag(
    item_id_input uuid,
    reason_input text DEFAULT 'other',
    note_input text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    normalized_reason text;
    normalized_note text;
    existing_flag_id uuid;
    new_flag_id uuid;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_validated() THEN
        RETURN NULL;
    END IF;

    normalized_reason := lower(NULLIF(btrim(coalesce(reason_input, '')), ''));
    IF normalized_reason IS NULL OR normalized_reason <> ALL (ARRAY['incorrect', 'unavailable', 'unsafe', 'image', 'spam', 'other']) THEN
        normalized_reason := 'other';
    END IF;

    normalized_note := NULLIF(btrim(coalesce(note_input, '')), '');

    IF NOT EXISTS (SELECT 1 FROM public.items WHERE id = item_id_input) THEN
        RETURN NULL;
    END IF;

    SELECT id
    INTO existing_flag_id
    FROM public.item_flags
    WHERE item_id = item_id_input
      AND flagged_by = auth.uid()
      AND reason = normalized_reason
      AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1;

    IF existing_flag_id IS NOT NULL THEN
        RETURN existing_flag_id;
    END IF;

    INSERT INTO public.item_flags (item_id, flagged_by, reason, note)
    VALUES (item_id_input, auth.uid(), normalized_reason, normalized_note)
    RETURNING id INTO new_flag_id;

    RETURN new_flag_id;
END;
$$;

ALTER TABLE public.item_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own item suggestions" ON public.item_suggestions;
CREATE POLICY "Users can view own item suggestions" ON public.item_suggestions FOR SELECT USING (suggested_by = auth.uid());
DROP POLICY IF EXISTS "Admins can view item suggestions" ON public.item_suggestions;
CREATE POLICY "Admins can view item suggestions" ON public.item_suggestions FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "No direct item suggestion inserts" ON public.item_suggestions;
CREATE POLICY "No direct item suggestion inserts" ON public.item_suggestions FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS "No direct item suggestion updates" ON public.item_suggestions;
CREATE POLICY "No direct item suggestion updates" ON public.item_suggestions FOR UPDATE USING (false);
DROP POLICY IF EXISTS "No direct item suggestion deletes" ON public.item_suggestions;
CREATE POLICY "No direct item suggestion deletes" ON public.item_suggestions FOR DELETE USING (false);

ALTER TABLE public.item_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own item flags" ON public.item_flags;
CREATE POLICY "Users can view own item flags" ON public.item_flags FOR SELECT USING (flagged_by = auth.uid());
DROP POLICY IF EXISTS "Admins can view item flags" ON public.item_flags;
CREATE POLICY "Admins can view item flags" ON public.item_flags FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "No direct item flag inserts" ON public.item_flags;
CREATE POLICY "No direct item flag inserts" ON public.item_flags FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS "No direct item flag updates" ON public.item_flags;
CREATE POLICY "No direct item flag updates" ON public.item_flags FOR UPDATE USING (false);
DROP POLICY IF EXISTS "No direct item flag deletes" ON public.item_flags;
CREATE POLICY "No direct item flag deletes" ON public.item_flags FOR DELETE USING (false);
