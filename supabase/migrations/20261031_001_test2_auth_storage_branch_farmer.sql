-- Muhaimin Dairy TEST 2: Auth/JWT + Main Admin + Branch/Farmer metadata + private photo buckets
-- Migration: 20261031_001
-- Apply ONLY to isolated TEST 2 after review. Never run on Production as part of this task.
-- Existing records are preserved. No Auth user is promoted automatically.
-- Every newly registered Auth user receives the least-privilege "customer" role.

BEGIN;

-- 1) Fields required by the existing Branch/Farmer forms and GPS/readback work.
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS division text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS upazila text,
  ADD COLUMN IF NOT EXISTS union_name text,
  ADD COLUMN IF NOT EXISTS village_name text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS location_accuracy_m double precision,
  ADD COLUMN IF NOT EXISTS location_captured_at timestamptz,
  ADD COLUMN IF NOT EXISTS registered_at timestamptz,
  ADD COLUMN IF NOT EXISTS photo_path text;

ALTER TABLE public.farmers
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS division text,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS upazila text,
  ADD COLUMN IF NOT EXISTS union_name text,
  ADD COLUMN IF NOT EXISTS village_name text,
  ADD COLUMN IF NOT EXISTS photo_data_url text,
  ADD COLUMN IF NOT EXISTS photo_path text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS location_accuracy double precision,
  ADD COLUMN IF NOT EXISTS location_captured_at timestamptz,
  ADD COLUMN IF NOT EXISTS registered_at timestamptz;

-- Validate coordinate ranges and paired coordinates. NOT VALID protects legacy rows
-- while enforcing the rules for all new/updated rows; validation is a separate gate.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='branches_latitude_range_check' AND conrelid='public.branches'::regclass) THEN
    ALTER TABLE public.branches ADD CONSTRAINT branches_latitude_range_check
      CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='branches_longitude_range_check' AND conrelid='public.branches'::regclass) THEN
    ALTER TABLE public.branches ADD CONSTRAINT branches_longitude_range_check
      CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='branches_location_pair_check' AND conrelid='public.branches'::regclass) THEN
    ALTER TABLE public.branches ADD CONSTRAINT branches_location_pair_check
      CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL)) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='farmers_latitude_range_check' AND conrelid='public.farmers'::regclass) THEN
    ALTER TABLE public.farmers ADD CONSTRAINT farmers_latitude_range_check
      CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='farmers_longitude_range_check' AND conrelid='public.farmers'::regclass) THEN
    ALTER TABLE public.farmers ADD CONSTRAINT farmers_longitude_range_check
      CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='farmers_location_pair_check' AND conrelid='public.farmers'::regclass) THEN
    ALTER TABLE public.farmers ADD CONSTRAINT farmers_location_pair_check
      CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL)) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='farmers_location_accuracy_check' AND conrelid='public.farmers'::regclass) THEN
    ALTER TABLE public.farmers ADD CONSTRAINT farmers_location_accuracy_check
      CHECK (location_accuracy IS NULL OR location_accuracy BETWEEN 0 AND 150) NOT VALID;
  END IF;
END $$;

-- 2) Application role table expected by the frontend. No client-side role escalation.
CREATE TABLE IF NOT EXISTS public.app_user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'customer'
    CHECK (role IN ('main_admin', 'customer')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "muhaimin_read_own_role" ON public.app_user_roles;
CREATE POLICY "muhaimin_read_own_role"
  ON public.app_user_roles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT r.role
  FROM public.app_user_roles AS r
  WHERE r.user_id = (SELECT auth.uid())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_app_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;

-- Existing Auth users default to Customer. New signups also receive Customer only.
INSERT INTO public.app_user_roles (user_id, role)
SELECT u.id, 'customer'
FROM auth.users AS u
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.assign_default_customer_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.app_user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_default_customer_role() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS muhaimin_assign_customer_role ON auth.users;
CREATE TRIGGER muhaimin_assign_customer_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.assign_default_customer_role();

-- 3) Main-Admin-only access to business tables. Customer accounts can read their own
-- role only; they cannot read, insert, update, or delete business records.
DO $$
DECLARE
  t record;
  p record;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public'
      AND c.relkind IN ('r','p')
      AND c.relname <> 'app_user_roles'
  LOOP
    FOR p IN
      SELECT polname FROM pg_policy WHERE polrelid=format('public.%I',t.relname)::regclass
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',p.polname,t.relname);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.current_app_role() = %L) WITH CHECK (public.current_app_role() = %L)',
      'muhaimin_main_admin_only', t.relname, 'main_admin', 'main_admin'
    );
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t.relname);
  END LOOP;
END $$;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.app_user_roles FROM authenticated;
GRANT SELECT ON public.app_user_roles TO authenticated;

REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 4) Private photo storage. Only Main Admin can list/read/write/delete these objects.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('muhaimin-farmer-photos','muhaimin-farmer-photos',false,5242880,ARRAY['image/jpeg','image/png','image/webp']),
  ('muhaimin-branch-photos','muhaimin-branch-photos',false,5242880,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE
SET public=false,
    file_size_limit=EXCLUDED.file_size_limit,
    allowed_mime_types=EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "muhaimin_main_admin_photo_read" ON storage.objects;
CREATE POLICY "muhaimin_main_admin_photo_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('muhaimin-farmer-photos','muhaimin-branch-photos')
         AND public.current_app_role()='main_admin');

DROP POLICY IF EXISTS "muhaimin_main_admin_photo_insert" ON storage.objects;
CREATE POLICY "muhaimin_main_admin_photo_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('muhaimin-farmer-photos','muhaimin-branch-photos')
              AND public.current_app_role()='main_admin');

DROP POLICY IF EXISTS "muhaimin_main_admin_photo_update" ON storage.objects;
CREATE POLICY "muhaimin_main_admin_photo_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('muhaimin-farmer-photos','muhaimin-branch-photos')
         AND public.current_app_role()='main_admin')
  WITH CHECK (bucket_id IN ('muhaimin-farmer-photos','muhaimin-branch-photos')
              AND public.current_app_role()='main_admin');

DROP POLICY IF EXISTS "muhaimin_main_admin_photo_delete" ON storage.objects;
CREATE POLICY "muhaimin_main_admin_photo_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('muhaimin-farmer-photos','muhaimin-branch-photos')
         AND public.current_app_role()='main_admin');

COMMIT;

-- MAIN ADMIN ACTIVATION (run separately after creating the trusted Auth user in TEST 2):
-- Find the exact user UUID in Supabase Dashboard > Authentication > Users.
-- Then run this one-row update in TEST 2 SQL Editor, replacing only the UUID:
-- UPDATE public.app_user_roles
-- SET role='main_admin'
-- WHERE user_id='REPLACE_WITH_AUTH_USER_UUID'::uuid;
-- Confirm exactly one row was updated. Never grant main_admin through user metadata or signup.
--
-- POST-MIGRATION CHECKS (read-only):
-- 1) Verify app_user_roles has one row per Auth user and no unexpected main_admin.
-- 2) Verify all public business tables have RLS enabled and only muhaimin_main_admin_only.
-- 3) Verify both Storage buckets are private and have all four Main Admin policies.
-- 4) Validate the NOT VALID coordinate constraints after checking legacy data.
-- 5) Test anon deny, customer deny, and Main Admin allow using real JWTs.
-- This migration does not create Auth users and does not upload any photo.
