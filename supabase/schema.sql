-- Consolidated Supabase Schema
-- Designed for easy copy-pasting into a fresh Supabase project

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

-- 2. TABLES
-- Create tables FIRST so functions and triggers can reference them

-- Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    email text,
    display_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    description text,
    display_surname text DEFAULT ''::text,
    profile_valid boolean NOT NULL DEFAULT false,
    invited_by_code text,
    CONSTRAINT profiles_pkey PRIMARY KEY (id)
);
COMMENT ON COLUMN public.profiles.profile_valid IS 'Indicates if user has entered a valid invite code';
COMMENT ON COLUMN public.profiles.invited_by_code IS 'The invite code used by this user to gain access';

-- Table: items
CREATE TABLE IF NOT EXISTS public.items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    name text,
    description text,
    image_url text,
    borrowed_by uuid,
    created_by uuid,
    owner_kind text NOT NULL DEFAULT 'operator'::text CHECK (owner_kind = ANY (ARRAY['operator'::text, 'profile'::text, 'free_text'::text])),
    owner_profile_id uuid,
    owner_label text,
    visibility_state text NOT NULL DEFAULT 'visible'::text CHECK (visibility_state = ANY (ARRAY['visible'::text, 'user_hidden'::text, 'admin_hidden'::text, 'pending_visible'::text, 'deleted_user_hidden'::text, 'archived'::text])),
    visibility_reason text,
    hidden_at timestamp with time zone,
    hidden_by uuid,
    deleted_at timestamp with time zone,
    deleted_by uuid,
    handoff_policy text NOT NULL DEFAULT 'return_to_owner'::text CHECK (handoff_policy = ANY (ARRAY['return_to_owner'::text, 'direct_handoff_allowed'::text])),
    status text DEFAULT 'inStock'::text CHECK (status = ANY (ARRAY['inStock'::text, 'borrowed'::text])),
    CONSTRAINT items_pkey PRIMARY KEY (id)
);

-- Table: borrow_history
CREATE TABLE IF NOT EXISTS public.borrow_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL,
    borrower_id uuid NOT NULL,
    borrowed_at timestamp with time zone DEFAULT now(),
    returned_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT borrow_history_pkey PRIMARY KEY (id)
);

-- Table: admins
CREATE TABLE IF NOT EXISTS public.admins (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    invite_code text NOT NULL DEFAULT gen_random_uuid()::text,
    profile_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT admins_pkey PRIMARY KEY (id),
    CONSTRAINT admins_profile_id_unique UNIQUE (profile_id),
    CONSTRAINT admins_invite_code_unique UNIQUE (invite_code)
);
COMMENT ON COLUMN public.admins.invite_code IS 'Unique invite code for this admin to share with users';

-- Table: item_sharing
CREATE TABLE IF NOT EXISTS public.item_sharing (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL,
    shared_with_user_id uuid NOT NULL,
    shared_at timestamp with time zone DEFAULT now(),
    permission text DEFAULT 'view'::text,
    CONSTRAINT item_sharing_pkey PRIMARY KEY (id)
);

-- Table: item_versions
CREATE TABLE IF NOT EXISTS public.item_versions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL,
    version_number integer NOT NULL,
    name text,
    description text,
    image_url text,
    owner_kind text NOT NULL DEFAULT 'operator'::text CHECK (owner_kind = ANY (ARRAY['operator'::text, 'profile'::text, 'free_text'::text])),
    owner_profile_id uuid,
    owner_label text,
    visibility_state text NOT NULL DEFAULT 'visible'::text CHECK (visibility_state = ANY (ARRAY['visible'::text, 'user_hidden'::text, 'admin_hidden'::text, 'pending_visible'::text, 'deleted_user_hidden'::text, 'archived'::text])),
    actor_id uuid,
    reason text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT item_versions_pkey PRIMARY KEY (id),
    CONSTRAINT item_versions_item_id_version_number_unique UNIQUE (item_id, version_number)
);

-- Table: item_images
CREATE TABLE IF NOT EXISTS public.item_images (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    item_id uuid NOT NULL,
    storage_bucket text NOT NULL DEFAULT 'items'::text,
    storage_path text NOT NULL,
    public_url text,
    uploaded_by uuid,
    caption text,
    alt_text text,
    sort_order integer NOT NULL DEFAULT 0,
    is_cover boolean NOT NULL DEFAULT false,
    moderation_state text NOT NULL DEFAULT 'accepted'::text CHECK (moderation_state = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'flagged'::text, 'deleted'::text])),
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT item_images_pkey PRIMARY KEY (id),
    CONSTRAINT item_images_storage_bucket_path_unique UNIQUE (storage_bucket, storage_path)
);

-- Table: account_deletion_requests
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'completed'::text, 'cancelled'::text])),
    user_note text,
    admin_note text,
    requested_at timestamp with time zone DEFAULT now(),
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT account_deletion_requests_pkey PRIMARY KEY (id)
);

-- Table: item_suggestions
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

-- Table: item_flags
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

-- Table: backup_runs
CREATE TABLE IF NOT EXISTS public.backup_runs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    started_at timestamp with time zone NOT NULL DEFAULT now(),
    finished_at timestamp with time zone NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'completed'::text CHECK (status = ANY (ARRAY['completed'::text, 'failed'::text])),
    table_count integer NOT NULL DEFAULT 0 CHECK (table_count >= 0),
    table_rows integer NOT NULL DEFAULT 0 CHECK (table_rows >= 0),
    storage_bucket_count integer NOT NULL DEFAULT 0 CHECK (storage_bucket_count >= 0),
    storage_object_count integer NOT NULL DEFAULT 0 CHECK (storage_object_count >= 0),
    storage_bytes bigint NOT NULL DEFAULT 0 CHECK (storage_bytes >= 0),
    auth_users_exported boolean NOT NULL DEFAULT false,
    auth_user_count integer CHECK (auth_user_count IS NULL OR auth_user_count >= 0),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT backup_runs_pkey PRIMARY KEY (id),
    CONSTRAINT backup_runs_time_order CHECK (finished_at >= started_at)
);

-- Table: notification_events
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

-- Table: notification_mutes
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

-- Storage bucket for item images.
-- Keep limits aligned with resolved deployment config media settings.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'items',
    'items',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;


-- 3. FOREIGN KEYS (Added after tables to ensure tables exist)
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.items ADD CONSTRAINT items_borrowed_by_fkey FOREIGN KEY (borrowed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.items ADD CONSTRAINT items_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.items ADD CONSTRAINT items_owner_profile_id_fkey FOREIGN KEY (owner_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.items ADD CONSTRAINT items_hidden_by_fkey FOREIGN KEY (hidden_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.items ADD CONSTRAINT items_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.borrow_history ADD CONSTRAINT borrow_history_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
ALTER TABLE public.borrow_history ADD CONSTRAINT borrow_history_borrower_id_fkey FOREIGN KEY (borrower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.admins ADD CONSTRAINT admins_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.item_sharing ADD CONSTRAINT item_sharing_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
ALTER TABLE public.item_sharing ADD CONSTRAINT item_sharing_shared_with_user_id_fkey FOREIGN KEY (shared_with_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.item_versions ADD CONSTRAINT item_versions_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
ALTER TABLE public.item_versions ADD CONSTRAINT item_versions_owner_profile_id_fkey FOREIGN KEY (owner_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.item_versions ADD CONSTRAINT item_versions_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.item_images ADD CONSTRAINT item_images_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
ALTER TABLE public.item_images ADD CONSTRAINT item_images_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.account_deletion_requests ADD CONSTRAINT account_deletion_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.account_deletion_requests ADD CONSTRAINT account_deletion_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.item_suggestions ADD CONSTRAINT item_suggestions_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
ALTER TABLE public.item_suggestions ADD CONSTRAINT item_suggestions_suggested_by_fkey FOREIGN KEY (suggested_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.item_suggestions ADD CONSTRAINT item_suggestions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.item_flags ADD CONSTRAINT item_flags_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.items(id) ON DELETE CASCADE;
ALTER TABLE public.item_flags ADD CONSTRAINT item_flags_flagged_by_fkey FOREIGN KEY (flagged_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.item_flags ADD CONSTRAINT item_flags_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.notification_events ADD CONSTRAINT notification_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.notification_events ADD CONSTRAINT notification_events_seen_by_fkey FOREIGN KEY (seen_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.notification_mutes ADD CONSTRAINT notification_mutes_subject_profile_id_fkey FOREIGN KEY (subject_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.notification_mutes ADD CONSTRAINT notification_mutes_muted_by_fkey FOREIGN KEY (muted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


-- 4. FUNCTIONS 
-- Created after tables are defined so they refer to existing schemas.

CREATE OR REPLACE FUNCTION public.update_updated_at() 
RETURNS trigger LANGUAGE plpgsql AS $$ 
BEGIN 
    NEW.updated_at = now(); 
    RETURN NEW; 
END; 
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ 
begin 
    insert into public.profiles (id, email, display_name, avatar_url) 
    values ( 
        new.id, 
        new.email, 
        new.raw_user_meta_data->>'display_name', 
        new.raw_user_meta_data->>'avatar_url' 
    ); 
    return new; 
end; 
$$;

-- RLS Helper Functions
CREATE OR REPLACE FUNCTION public.is_validated()
RETURNS boolean AS $$
    SELECT coalesce(
        (SELECT profile_valid FROM public.profiles WHERE id = auth.uid()),
        false
    );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admins WHERE profile_id = auth.uid()
    );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Verify and apply invite code (Fix K1 & K2)
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
        IF NOT public.is_validated()
           OR (
               current_item.created_by IS DISTINCT FROM auth.uid()
               AND current_item.owner_profile_id IS DISTINCT FROM auth.uid()
           ) THEN
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

CREATE OR REPLACE FUNCTION public.delete_item(item_id_input uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    item_creator uuid;
    deleted_count integer;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_validated() THEN
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

    DELETE FROM public.items
    WHERE id = item_id_input;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count = 1;
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

CREATE OR REPLACE FUNCTION public.set_item_visibility(
    item_id_input uuid,
    visibility_state_input text,
    reason_input text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    normalized_state text;
    normalized_reason text;
    version_reason text;
    new_version_id uuid;
    updated_count integer;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RETURN false;
    END IF;

    normalized_state := lower(NULLIF(btrim(coalesce(visibility_state_input, '')), ''));
    IF normalized_state IS NULL OR normalized_state <> ALL (ARRAY['visible', 'user_hidden', 'admin_hidden', 'pending_visible', 'deleted_user_hidden', 'archived']) THEN
        RETURN false;
    END IF;

    normalized_reason := NULLIF(btrim(coalesce(reason_input, '')), '');
    IF normalized_reason IS NULL THEN
        RETURN false;
    END IF;

    version_reason := 'visibility set to ' || normalized_state || ': ' || normalized_reason;

    UPDATE public.items
    SET
        visibility_state = normalized_state,
        visibility_reason = normalized_reason,
        hidden_at = CASE WHEN normalized_state = 'visible' THEN NULL ELSE now() END,
        hidden_by = CASE WHEN normalized_state = 'visible' THEN NULL ELSE auth.uid() END,
        deleted_at = CASE
            WHEN normalized_state = 'deleted_user_hidden' THEN coalesce(deleted_at, now())
            WHEN normalized_state = 'visible' THEN NULL
            ELSE deleted_at
        END,
        deleted_by = CASE
            WHEN normalized_state = 'deleted_user_hidden' THEN coalesce(deleted_by, auth.uid())
            WHEN normalized_state = 'visible' THEN NULL
            ELSE deleted_by
        END
    WHERE id = item_id_input;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count <> 1 THEN
        RETURN false;
    END IF;

    SELECT public.record_item_version(item_id_input, version_reason) INTO new_version_id;
    IF new_version_id IS NULL THEN
        RAISE EXCEPTION 'could not record item visibility version';
    END IF;

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_item_visibility(
    item_id_input uuid,
    visibility_state_input text,
    reason_input text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    selected_created_by uuid;
    selected_owner_profile_id uuid;
    selected_visibility_state text;
    normalized_state text;
    normalized_reason text;
    version_reason text;
    new_version_id uuid;
    updated_count integer;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_validated() THEN
        RETURN false;
    END IF;

    normalized_state := lower(NULLIF(btrim(coalesce(visibility_state_input, '')), ''));
    IF normalized_state IS NULL OR normalized_state <> ALL (ARRAY['user_hidden', 'pending_visible']) THEN
        RETURN false;
    END IF;

    normalized_reason := NULLIF(btrim(coalesce(reason_input, '')), '');
    IF normalized_reason IS NULL OR length(normalized_reason) < 3 THEN
        RETURN false;
    END IF;

    SELECT created_by, owner_profile_id, visibility_state
    INTO selected_created_by, selected_owner_profile_id, selected_visibility_state
    FROM public.items
    WHERE id = item_id_input
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    IF selected_created_by IS DISTINCT FROM auth.uid()
       AND selected_owner_profile_id IS DISTINCT FROM auth.uid() THEN
        RETURN false;
    END IF;

    IF selected_visibility_state = ANY (ARRAY['deleted_user_hidden', 'archived']) THEN
        RETURN false;
    END IF;

    IF normalized_state = 'user_hidden'
       AND selected_visibility_state = 'admin_hidden' THEN
        RETURN false;
    END IF;

    IF normalized_state = 'pending_visible'
       AND selected_visibility_state = 'visible' THEN
        RETURN false;
    END IF;

    version_reason := 'visibility requested as ' || normalized_state || ': ' || normalized_reason;

    UPDATE public.items
    SET
        visibility_state = normalized_state,
        visibility_reason = normalized_reason,
        hidden_at = now(),
        hidden_by = auth.uid()
    WHERE id = item_id_input;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count <> 1 THEN
        RETURN false;
    END IF;

    SELECT public.record_item_version(item_id_input, version_reason) INTO new_version_id;
    IF new_version_id IS NULL THEN
        RAISE EXCEPTION 'could not record item visibility request version';
    END IF;

    RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_item_visibility(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_item_visibility(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.promote_admin(profile_id_input uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RETURN false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = profile_id_input) THEN
        RETURN false;
    END IF;

    INSERT INTO public.admins (profile_id)
    VALUES (profile_id_input)
    ON CONFLICT (profile_id) DO NOTHING;

    RETURN EXISTS (SELECT 1 FROM public.admins WHERE profile_id = profile_id_input);
END;
$$;

CREATE OR REPLACE FUNCTION public.demote_admin(profile_id_input uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    deleted_count integer;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RETURN false;
    END IF;

    IF profile_id_input = auth.uid() THEN
        RETURN false;
    END IF;

    DELETE FROM public.admins
    WHERE profile_id = profile_id_input;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count = 1;
END;
$$;

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

CREATE OR REPLACE FUNCTION public.review_item_suggestion(
    suggestion_id_input uuid,
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
    IF normalized_status IS NULL OR normalized_status <> ALL (ARRAY['reviewing', 'accepted', 'rejected', 'closed']) THEN
        RETURN false;
    END IF;

    normalized_note := NULLIF(btrim(coalesce(admin_note_input, '')), '');

    UPDATE public.item_suggestions
    SET
        status = normalized_status,
        admin_note = coalesce(normalized_note, admin_note),
        reviewed_at = now(),
        reviewed_by = auth.uid()
    WHERE id = suggestion_id_input;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_item_suggestion(
    suggestion_id_input uuid,
    name_input text,
    description_input text DEFAULT NULL,
    image_url_input text DEFAULT NULL,
    admin_note_input text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    selected_item_id uuid;
    normalized_name text;
    normalized_description text;
    normalized_image_url text;
    normalized_note text;
    new_version_id uuid;
    updated_count integer;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RETURN false;
    END IF;

    normalized_name := NULLIF(btrim(coalesce(name_input, '')), '');
    IF normalized_name IS NULL THEN
        RETURN false;
    END IF;

    normalized_note := NULLIF(btrim(coalesce(admin_note_input, '')), '');
    IF normalized_note IS NULL OR length(normalized_note) < 3 THEN
        RETURN false;
    END IF;

    normalized_description := NULLIF(btrim(coalesce(description_input, '')), '');
    normalized_image_url := NULLIF(btrim(coalesce(image_url_input, '')), '');

    SELECT item_id
    INTO selected_item_id
    FROM public.item_suggestions
    WHERE id = suggestion_id_input
      AND status = ANY (ARRAY['pending'::text, 'reviewing'::text])
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    UPDATE public.items
    SET
        name = normalized_name,
        description = normalized_description,
        image_url = normalized_image_url
    WHERE id = selected_item_id;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count <> 1 THEN
        RETURN false;
    END IF;

    SELECT public.record_item_version(selected_item_id, 'accepted suggestion') INTO new_version_id;
    IF new_version_id IS NULL THEN
        RAISE EXCEPTION 'could not record accepted suggestion item version';
    END IF;

    UPDATE public.item_suggestions
    SET
        status = 'accepted',
        admin_note = normalized_note,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    WHERE id = suggestion_id_input
      AND status = ANY (ARRAY['pending'::text, 'reviewing'::text]);

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count = 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_item_suggestion(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_item_suggestion(uuid, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_item_image_suggestion(
    suggestion_id_input uuid,
    storage_bucket_input text DEFAULT 'items',
    storage_path_input text DEFAULT NULL,
    public_url_input text DEFAULT NULL,
    caption_input text DEFAULT NULL,
    alt_text_input text DEFAULT NULL,
    is_cover_input boolean DEFAULT false,
    admin_note_input text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    selected_item_id uuid;
    existing_image_item_id uuid;
    normalized_bucket text;
    normalized_path text;
    normalized_public_url text;
    normalized_caption text;
    normalized_alt_text text;
    normalized_note text;
    new_version_id uuid;
    updated_count integer;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RETURN false;
    END IF;

    normalized_bucket := NULLIF(btrim(coalesce(storage_bucket_input, 'items')), '');
    normalized_path := NULLIF(btrim(coalesce(storage_path_input, '')), '');
    normalized_public_url := NULLIF(btrim(coalesce(public_url_input, '')), '');
    normalized_caption := NULLIF(btrim(coalesce(caption_input, '')), '');
    normalized_alt_text := NULLIF(btrim(coalesce(alt_text_input, '')), '');
    normalized_note := NULLIF(btrim(coalesce(admin_note_input, '')), '');

    IF normalized_bucket IS NULL
       OR normalized_path IS NULL
       OR normalized_path LIKE '/%' OR normalized_path LIKE '%..%'
       OR normalized_alt_text IS NULL OR length(normalized_alt_text) < 3
       OR normalized_note IS NULL OR length(normalized_note) < 3 THEN
        RETURN false;
    END IF;

    SELECT item_id
    INTO selected_item_id
    FROM public.item_suggestions
    WHERE id = suggestion_id_input
      AND suggestion_type = 'image'
      AND status = ANY (ARRAY['pending'::text, 'reviewing'::text])
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    SELECT item_id
    INTO existing_image_item_id
    FROM public.item_images
    WHERE storage_bucket = normalized_bucket
      AND storage_path = normalized_path
    FOR UPDATE;

    IF FOUND AND existing_image_item_id IS DISTINCT FROM selected_item_id THEN
        RETURN false;
    END IF;

    IF is_cover_input THEN
        UPDATE public.item_images
        SET is_cover = false
        WHERE item_id = selected_item_id;
    END IF;

    INSERT INTO public.item_images (
        item_id,
        storage_bucket,
        storage_path,
        public_url,
        uploaded_by,
        caption,
        alt_text,
        is_cover,
        moderation_state,
        deleted_at
    )
    VALUES (
        selected_item_id,
        normalized_bucket,
        normalized_path,
        normalized_public_url,
        auth.uid(),
        normalized_caption,
        normalized_alt_text,
        is_cover_input,
        'accepted',
        NULL
    )
    ON CONFLICT (storage_bucket, storage_path) DO UPDATE
    SET
        item_id = EXCLUDED.item_id,
        public_url = EXCLUDED.public_url,
        uploaded_by = EXCLUDED.uploaded_by,
        caption = EXCLUDED.caption,
        alt_text = EXCLUDED.alt_text,
        is_cover = EXCLUDED.is_cover,
        moderation_state = 'accepted',
        deleted_at = NULL;

    IF is_cover_input THEN
        UPDATE public.items
        SET image_url = coalesce(normalized_public_url, image_url)
        WHERE id = selected_item_id;
    END IF;

    SELECT public.record_item_version(selected_item_id, 'accepted image suggestion') INTO new_version_id;
    IF new_version_id IS NULL THEN
        RAISE EXCEPTION 'could not record accepted image suggestion item version';
    END IF;

    UPDATE public.item_suggestions
    SET
        status = 'accepted',
        admin_note = normalized_note,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    WHERE id = suggestion_id_input
      AND status = ANY (ARRAY['pending'::text, 'reviewing'::text]);

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count = 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_item_image_suggestion(uuid, text, text, text, text, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_item_image_suggestion(uuid, text, text, text, text, text, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_owner_item_suggestion(
    suggestion_id_input uuid,
    owner_kind_input text,
    owner_profile_id_input uuid DEFAULT NULL,
    owner_label_input text DEFAULT NULL,
    admin_note_input text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    selected_item_id uuid;
    normalized_kind text;
    normalized_label text;
    normalized_note text;
    selected_owner_profile_id uuid;
    selected_owner_label text;
    new_version_id uuid;
    updated_count integer;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_admin() THEN
        RETURN false;
    END IF;

    normalized_kind := lower(NULLIF(btrim(coalesce(owner_kind_input, '')), ''));
    IF normalized_kind IS NULL OR normalized_kind <> ALL (ARRAY['operator', 'profile', 'free_text']) THEN
        RETURN false;
    END IF;

    normalized_note := NULLIF(btrim(coalesce(admin_note_input, '')), '');
    IF normalized_note IS NULL OR length(normalized_note) < 3 THEN
        RETURN false;
    END IF;

    normalized_label := NULLIF(btrim(coalesce(owner_label_input, '')), '');

    IF normalized_kind = 'profile' THEN
        IF owner_profile_id_input IS NULL THEN
            RETURN false;
        END IF;

        PERFORM 1 FROM public.profiles WHERE id = owner_profile_id_input;
        IF NOT FOUND THEN
            RETURN false;
        END IF;

        selected_owner_profile_id := owner_profile_id_input;
        selected_owner_label := NULL;
    ELSIF normalized_kind = 'free_text' THEN
        IF normalized_label IS NULL THEN
            RETURN false;
        END IF;

        selected_owner_profile_id := NULL;
        selected_owner_label := normalized_label;
    ELSE
        selected_owner_profile_id := NULL;
        selected_owner_label := normalized_label;
    END IF;

    SELECT item_id
    INTO selected_item_id
    FROM public.item_suggestions
    WHERE id = suggestion_id_input
      AND suggestion_type = 'owner'
      AND status = ANY (ARRAY['pending'::text, 'reviewing'::text])
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    UPDATE public.items
    SET
        owner_kind = normalized_kind,
        owner_profile_id = selected_owner_profile_id,
        owner_label = selected_owner_label
    WHERE id = selected_item_id;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count <> 1 THEN
        RETURN false;
    END IF;

    SELECT public.record_item_version(selected_item_id, 'accepted owner suggestion') INTO new_version_id;
    IF new_version_id IS NULL THEN
        RAISE EXCEPTION 'could not record accepted owner suggestion item version';
    END IF;

    UPDATE public.item_suggestions
    SET
        status = 'accepted',
        admin_note = normalized_note,
        reviewed_at = now(),
        reviewed_by = auth.uid()
    WHERE id = suggestion_id_input
      AND status = ANY (ARRAY['pending'::text, 'reviewing'::text]);

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count = 1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_owner_item_suggestion(uuid, text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_owner_item_suggestion(uuid, text, uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_item_flag(
    flag_id_input uuid,
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
    IF normalized_status IS NULL OR normalized_status <> ALL (ARRAY['reviewing', 'resolved', 'dismissed']) THEN
        RETURN false;
    END IF;

    normalized_note := NULLIF(btrim(coalesce(admin_note_input, '')), '');

    UPDATE public.item_flags
    SET
        status = normalized_status,
        admin_note = coalesce(normalized_note, admin_note),
        reviewed_at = now(),
        reviewed_by = auth.uid()
    WHERE id = flag_id_input;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count = 1;
END;
$$;

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

-- Prevent user from escalating profile privileges directly (Fix K1)
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

-- Webhook Trigger Functions 
-- (Implemented via pg_net to bypass need for unsupported extensions)
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

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_profile_valid ON public.profiles(profile_valid);
CREATE INDEX IF NOT EXISTS idx_items_visibility_state ON public.items(visibility_state);
CREATE INDEX IF NOT EXISTS idx_items_owner_profile_id ON public.items(owner_profile_id);
CREATE INDEX IF NOT EXISTS idx_item_versions_item_id ON public.item_versions(item_id);
CREATE INDEX IF NOT EXISTS idx_item_images_item_id ON public.item_images(item_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_images_one_cover_per_item ON public.item_images(item_id) WHERE is_cover;
CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_id ON public.account_deletion_requests(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_account_deletion_requests_one_active_per_user ON public.account_deletion_requests(user_id) WHERE status = ANY (ARRAY['pending'::text, 'reviewing'::text]);
CREATE INDEX IF NOT EXISTS idx_item_suggestions_item_id ON public.item_suggestions(item_id);
CREATE INDEX IF NOT EXISTS idx_item_suggestions_status_created_at ON public.item_suggestions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_item_suggestions_suggested_by ON public.item_suggestions(suggested_by);
CREATE INDEX IF NOT EXISTS idx_item_flags_item_id ON public.item_flags(item_id);
CREATE INDEX IF NOT EXISTS idx_item_flags_status_created_at ON public.item_flags(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_item_flags_flagged_by ON public.item_flags(flagged_by);
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_flags_one_pending_reason_per_user ON public.item_flags(item_id, flagged_by, reason) WHERE status = 'pending' AND flagged_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_backup_runs_finished_at ON public.backup_runs(finished_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_events_status_created_at ON public.notification_events(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_events_actor_id ON public.notification_events(actor_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_events_unseen_dedupe ON public.notification_events(channel, audience, dedupe_key) WHERE seen_at IS NULL AND status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text]);
CREATE INDEX IF NOT EXISTS idx_notification_mutes_subject_profile_id ON public.notification_mutes(subject_profile_id);

-- 6. RLS POLICIES
-- profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- items
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Validated users can view items" ON public.items;
CREATE POLICY "Validated users can view items" ON public.items FOR SELECT USING (
    public.is_admin() OR (
        public.is_validated() AND (
            visibility_state = 'visible'
            OR created_by = auth.uid()
            OR borrowed_by = auth.uid()
            OR owner_profile_id = auth.uid()
        )
    )
);
DROP POLICY IF EXISTS "Validated users can insert items" ON public.items;
CREATE POLICY "No direct item inserts" ON public.items FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS "Admins and creators can update items" ON public.items;
CREATE POLICY "No direct item updates" ON public.items FOR UPDATE USING (false);
DROP POLICY IF EXISTS "Admins and creators can delete items" ON public.items;
CREATE POLICY "No direct item deletes" ON public.items FOR DELETE USING (false);

-- borrow_history
ALTER TABLE public.borrow_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read borrow history" ON public.borrow_history;
DROP POLICY IF EXISTS "borrow_history_select_all" ON public.borrow_history;
DROP POLICY IF EXISTS "Admins can view history" ON public.borrow_history;
CREATE POLICY "Admins can view history" ON public.borrow_history FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Authenticated users can insert borrow history" ON public.borrow_history;
DROP POLICY IF EXISTS "Validated users can insert history" ON public.borrow_history;
DROP POLICY IF EXISTS "borrow_history_insert_authenticated" ON public.borrow_history;
DROP POLICY IF EXISTS "No direct history inserts" ON public.borrow_history;
CREATE POLICY "No direct history inserts" ON public.borrow_history FOR INSERT WITH CHECK (false);

-- admins
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
-- Fix K2: Normal users can no longer view invite codes directly
DROP POLICY IF EXISTS "Anyone can select invite codes for verification" ON public.admins;
DROP POLICY IF EXISTS "Admins have full access to admins table" ON public.admins;
CREATE POLICY "Admins have full access to admins table" ON public.admins FOR ALL USING (public.is_admin());

-- item_sharing
ALTER TABLE public.item_sharing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view shared items" ON public.item_sharing;
CREATE POLICY "Users can view shared items" ON public.item_sharing FOR SELECT USING (shared_with_user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "Users can share own items" ON public.item_sharing;
CREATE POLICY "Users can share own items" ON public.item_sharing FOR ALL USING (
    EXISTS (SELECT 1 FROM public.items WHERE items.id = item_sharing.item_id AND items.created_by = auth.uid()) OR public.is_admin()
);

-- item_versions
ALTER TABLE public.item_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view item versions" ON public.item_versions;
CREATE POLICY "Admins can view item versions" ON public.item_versions FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "No direct item version inserts" ON public.item_versions;
CREATE POLICY "No direct item version inserts" ON public.item_versions FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS "No direct item version updates" ON public.item_versions;
CREATE POLICY "No direct item version updates" ON public.item_versions FOR UPDATE USING (false);
DROP POLICY IF EXISTS "No direct item version deletes" ON public.item_versions;
CREATE POLICY "No direct item version deletes" ON public.item_versions FOR DELETE USING (false);

-- item_images
ALTER TABLE public.item_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Validated users can view accepted item images" ON public.item_images;
CREATE POLICY "Validated users can view accepted item images" ON public.item_images FOR SELECT USING (public.is_validated() AND moderation_state = 'accepted');
DROP POLICY IF EXISTS "No direct item image inserts" ON public.item_images;
CREATE POLICY "No direct item image inserts" ON public.item_images FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS "No direct item image updates" ON public.item_images;
CREATE POLICY "No direct item image updates" ON public.item_images FOR UPDATE USING (false);
DROP POLICY IF EXISTS "No direct item image deletes" ON public.item_images;
CREATE POLICY "No direct item image deletes" ON public.item_images FOR DELETE USING (false);

-- account_deletion_requests
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Users can view own deletion requests" ON public.account_deletion_requests FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins can view deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Admins can view deletion requests" ON public.account_deletion_requests FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "No direct deletion request inserts" ON public.account_deletion_requests;
CREATE POLICY "No direct deletion request inserts" ON public.account_deletion_requests FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS "No direct deletion request updates" ON public.account_deletion_requests;
CREATE POLICY "No direct deletion request updates" ON public.account_deletion_requests FOR UPDATE USING (false);
DROP POLICY IF EXISTS "No direct deletion request deletes" ON public.account_deletion_requests;
CREATE POLICY "No direct deletion request deletes" ON public.account_deletion_requests FOR DELETE USING (false);

-- item_suggestions
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

-- item_flags
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

-- backup_runs
ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view backup runs" ON public.backup_runs;
CREATE POLICY "Admins can view backup runs" ON public.backup_runs FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "No direct backup run inserts" ON public.backup_runs;
CREATE POLICY "No direct backup run inserts" ON public.backup_runs FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS "No direct backup run updates" ON public.backup_runs;
CREATE POLICY "No direct backup run updates" ON public.backup_runs FOR UPDATE USING (false);
DROP POLICY IF EXISTS "No direct backup run deletes" ON public.backup_runs;
CREATE POLICY "No direct backup run deletes" ON public.backup_runs FOR DELETE USING (false);

-- notification_events
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view notification events" ON public.notification_events;
CREATE POLICY "Admins can view notification events" ON public.notification_events FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "No direct notification event inserts" ON public.notification_events;
CREATE POLICY "No direct notification event inserts" ON public.notification_events FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS "No direct notification event updates" ON public.notification_events;
CREATE POLICY "No direct notification event updates" ON public.notification_events FOR UPDATE USING (false);
DROP POLICY IF EXISTS "No direct notification event deletes" ON public.notification_events;
CREATE POLICY "No direct notification event deletes" ON public.notification_events FOR DELETE USING (false);

-- notification_mutes
ALTER TABLE public.notification_mutes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view notification mutes" ON public.notification_mutes;
CREATE POLICY "Admins can view notification mutes" ON public.notification_mutes FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "No direct notification mute inserts" ON public.notification_mutes;
CREATE POLICY "No direct notification mute inserts" ON public.notification_mutes FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS "No direct notification mute updates" ON public.notification_mutes;
CREATE POLICY "No direct notification mute updates" ON public.notification_mutes FOR UPDATE USING (false);
DROP POLICY IF EXISTS "No direct notification mute deletes" ON public.notification_mutes;
CREATE POLICY "No direct notification mute deletes" ON public.notification_mutes FOR DELETE USING (false);

-- storage.objects
DROP POLICY IF EXISTS "Validated users can upload item images" ON storage.objects;
CREATE POLICY "Validated users can upload item images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'items'
    AND public.is_validated()
);

-- 7. TRIGGERS
DROP TRIGGER IF EXISTS profiles_updated_at_trigger ON public.profiles;
CREATE TRIGGER profiles_updated_at_trigger BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS tr_prevent_profile_escalation ON public.profiles;
CREATE TRIGGER tr_prevent_profile_escalation BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_escalation();

-- TELEGRAM TRIGGERS
DROP TRIGGER IF EXISTS notify_item_bot_telegram ON public.items;
CREATE TRIGGER notify_item_bot_telegram 
AFTER INSERT OR UPDATE ON public.items 
FOR EACH ROW EXECUTE FUNCTION public.send_item_webhook();

DROP TRIGGER IF EXISTS notify_user_bot_telegram ON public.profiles;
CREATE TRIGGER notify_user_bot_telegram 
AFTER INSERT OR UPDATE ON public.profiles 
FOR EACH ROW EXECUTE FUNCTION public.send_user_webhook();

REVOKE EXECUTE ON FUNCTION public.enqueue_telegram_notification(text, text, uuid, uuid, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_telegram_muted(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_notification_seen(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_telegram_mute(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_notification_delivery(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notification_seen(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_telegram_mute(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_notification_delivery(uuid, text, text) TO service_role;
