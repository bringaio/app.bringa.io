-- Keep limits aligned with config/bringa.config.jsonc media settings.
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

DROP POLICY IF EXISTS "Validated users can upload item images" ON storage.objects;
CREATE POLICY "Validated users can upload item images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'items'
    AND public.is_validated()
);
