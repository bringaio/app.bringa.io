-- Enforce relational integrity required by the local Supabase contract checker.
-- Existing deployments with duplicate invite codes or orphan item references must clean those rows before applying this migration.

DO $$
BEGIN
    ALTER TABLE public.admins
        ADD CONSTRAINT admins_invite_code_unique UNIQUE (invite_code);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DROP INDEX IF EXISTS public.idx_admins_invite_code;

DO $$
BEGIN
    ALTER TABLE public.borrow_history
        ADD CONSTRAINT borrow_history_item_id_fkey
        FOREIGN KEY (item_id)
        REFERENCES public.items(id)
        ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE public.item_sharing
        ADD CONSTRAINT item_sharing_item_id_fkey
        FOREIGN KEY (item_id)
        REFERENCES public.items(id)
        ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
