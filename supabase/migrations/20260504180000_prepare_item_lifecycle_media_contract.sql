-- Prepare ownership, visibility, versioning, and multi-image contract surfaces.
-- This does not migrate the app UI away from the legacy single image_url field yet.

ALTER TABLE public.items
    ADD COLUMN IF NOT EXISTS owner_kind text NOT NULL DEFAULT 'operator'::text,
    ADD COLUMN IF NOT EXISTS owner_profile_id uuid,
    ADD COLUMN IF NOT EXISTS owner_label text,
    ADD COLUMN IF NOT EXISTS visibility_state text NOT NULL DEFAULT 'visible'::text,
    ADD COLUMN IF NOT EXISTS visibility_reason text,
    ADD COLUMN IF NOT EXISTS hidden_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS hidden_by uuid,
    ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS deleted_by uuid,
    ADD COLUMN IF NOT EXISTS handoff_policy text NOT NULL DEFAULT 'return_to_owner'::text;

DO $$
BEGIN
    ALTER TABLE public.items
        ADD CONSTRAINT items_owner_kind_check
        CHECK (owner_kind = ANY (ARRAY['operator'::text, 'profile'::text, 'free_text'::text]));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.items
        ADD CONSTRAINT items_visibility_state_check
        CHECK (visibility_state = ANY (ARRAY['visible'::text, 'user_hidden'::text, 'admin_hidden'::text, 'pending_visible'::text, 'deleted_user_hidden'::text, 'archived'::text]));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.items
        ADD CONSTRAINT items_handoff_policy_check
        CHECK (handoff_policy = ANY (ARRAY['return_to_owner'::text, 'direct_handoff_allowed'::text]));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.items
        ADD CONSTRAINT items_owner_profile_id_fkey
        FOREIGN KEY (owner_profile_id)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.items
        ADD CONSTRAINT items_hidden_by_fkey
        FOREIGN KEY (hidden_by)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.items
        ADD CONSTRAINT items_deleted_by_fkey
        FOREIGN KEY (deleted_by)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

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

DO $$
BEGIN
    ALTER TABLE public.item_versions
        ADD CONSTRAINT item_versions_item_id_fkey
        FOREIGN KEY (item_id)
        REFERENCES public.items(id)
        ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.item_versions
        ADD CONSTRAINT item_versions_actor_id_fkey
        FOREIGN KEY (actor_id)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.item_versions
        ADD CONSTRAINT item_versions_owner_profile_id_fkey
        FOREIGN KEY (owner_profile_id)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.item_images
        ADD CONSTRAINT item_images_item_id_fkey
        FOREIGN KEY (item_id)
        REFERENCES public.items(id)
        ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.item_images
        ADD CONSTRAINT item_images_uploaded_by_fkey
        FOREIGN KEY (uploaded_by)
        REFERENCES public.profiles(id)
        ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_items_visibility_state ON public.items(visibility_state);
CREATE INDEX IF NOT EXISTS idx_items_owner_profile_id ON public.items(owner_profile_id);
CREATE INDEX IF NOT EXISTS idx_item_versions_item_id ON public.item_versions(item_id);
CREATE INDEX IF NOT EXISTS idx_item_images_item_id ON public.item_images(item_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_images_one_cover_per_item ON public.item_images(item_id) WHERE is_cover;

ALTER TABLE public.item_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view item versions" ON public.item_versions;
CREATE POLICY "Admins can view item versions" ON public.item_versions FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "No direct item version inserts" ON public.item_versions;
CREATE POLICY "No direct item version inserts" ON public.item_versions FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS "No direct item version updates" ON public.item_versions;
CREATE POLICY "No direct item version updates" ON public.item_versions FOR UPDATE USING (false);
DROP POLICY IF EXISTS "No direct item version deletes" ON public.item_versions;
CREATE POLICY "No direct item version deletes" ON public.item_versions FOR DELETE USING (false);

ALTER TABLE public.item_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Validated users can view accepted item images" ON public.item_images;
CREATE POLICY "Validated users can view accepted item images" ON public.item_images FOR SELECT USING (public.is_validated() AND moderation_state = 'accepted');
DROP POLICY IF EXISTS "No direct item image inserts" ON public.item_images;
CREATE POLICY "No direct item image inserts" ON public.item_images FOR INSERT WITH CHECK (false);
DROP POLICY IF EXISTS "No direct item image updates" ON public.item_images;
CREATE POLICY "No direct item image updates" ON public.item_images FOR UPDATE USING (false);
DROP POLICY IF EXISTS "No direct item image deletes" ON public.item_images;
CREATE POLICY "No direct item image deletes" ON public.item_images FOR DELETE USING (false);
