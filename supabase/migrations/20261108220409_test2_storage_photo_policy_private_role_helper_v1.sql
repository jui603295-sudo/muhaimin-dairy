-- TEST 2 only: correct Storage policy helper resolution.
-- The previous policies called public.current_app_role(), for which
-- authenticated has no EXECUTE privilege. Use the hardened private helper
-- already used by the public-table RLS policies.
-- This migration preserves the existing Main Admin-only bucket restrictions.

BEGIN;

ALTER POLICY "muhaimin_main_admin_photo_delete"
ON storage.objects
USING (
  bucket_id = ANY (ARRAY[
    'muhaimin-farmer-photos'::text,
    'muhaimin-branch-photos'::text
  ])
  AND private.current_app_role() = 'main_admin'::text
);

ALTER POLICY "muhaimin_main_admin_photo_insert"
ON storage.objects
WITH CHECK (
  bucket_id = ANY (ARRAY[
    'muhaimin-farmer-photos'::text,
    'muhaimin-branch-photos'::text
  ])
  AND private.current_app_role() = 'main_admin'::text
);

ALTER POLICY "muhaimin_main_admin_photo_read"
ON storage.objects
USING (
  bucket_id = ANY (ARRAY[
    'muhaimin-farmer-photos'::text,
    'muhaimin-branch-photos'::text
  ])
  AND private.current_app_role() = 'main_admin'::text
);

ALTER POLICY "muhaimin_main_admin_photo_update"
ON storage.objects
USING (
  bucket_id = ANY (ARRAY[
    'muhaimin-farmer-photos'::text,
    'muhaimin-branch-photos'::text
  ])
  AND private.current_app_role() = 'main_admin'::text
)
WITH CHECK (
  bucket_id = ANY (ARRAY[
    'muhaimin-farmer-photos'::text,
    'muhaimin-branch-photos'::text
  ])
  AND private.current_app_role() = 'main_admin'::text
);

COMMIT;
