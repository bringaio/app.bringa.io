-- Add admin-visible backup run metadata for backup freshness checks.
-- The service role backup script writes these rows after a successful backup.

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

CREATE INDEX IF NOT EXISTS idx_backup_runs_finished_at ON public.backup_runs(finished_at DESC);

ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view backup runs" ON public.backup_runs;
CREATE POLICY "Admins can view backup runs" ON public.backup_runs
FOR SELECT
USING (public.is_admin());

DROP POLICY IF EXISTS "No direct backup run inserts" ON public.backup_runs;
CREATE POLICY "No direct backup run inserts" ON public.backup_runs
FOR INSERT
WITH CHECK (false);

DROP POLICY IF EXISTS "No direct backup run updates" ON public.backup_runs;
CREATE POLICY "No direct backup run updates" ON public.backup_runs
FOR UPDATE
USING (false);

DROP POLICY IF EXISTS "No direct backup run deletes" ON public.backup_runs;
CREATE POLICY "No direct backup run deletes" ON public.backup_runs
FOR DELETE
USING (false);
