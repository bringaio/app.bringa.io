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
    CONSTRAINT admins_profile_id_unique UNIQUE (profile_id)
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
ALTER TABLE public.borrow_history ADD CONSTRAINT borrow_history_borrower_id_fkey FOREIGN KEY (borrower_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.admins ADD CONSTRAINT admins_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.item_sharing ADD CONSTRAINT item_sharing_shared_with_user_id_fkey FOREIGN KEY (shared_with_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


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

-- Prevent user from escalating profile privileges directly (Fix K1)
CREATE OR REPLACE FUNCTION public.prevent_profile_escalation() 
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF auth.role() = 'authenticated' THEN
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
  endpoint_url text;
BEGIN
  endpoint_url := NULLIF(current_setting('app.settings.telegram_item_webhook_url', true), '');
  IF endpoint_url IS NULL THEN
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW),
    'old_record', row_to_json(OLD)
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
  endpoint_url text;
BEGIN
  endpoint_url := NULLIF(current_setting('app.settings.telegram_user_webhook_url', true), '');
  IF endpoint_url IS NULL THEN
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW),
    'old_record', row_to_json(OLD)
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
CREATE INDEX IF NOT EXISTS idx_admins_invite_code ON public.admins(invite_code);

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
CREATE POLICY "Validated users can view items" ON public.items FOR SELECT USING (public.is_validated());
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
