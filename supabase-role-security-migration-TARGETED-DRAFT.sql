-- DRAFT ONLY — targeted role migration for Muhaimin Dairy.
-- Review and test in a SEPARATE Supabase project first. Do not run on production until:
-- 1) a secure database backup is verified,
-- 2) this script has passed tests in a disposable test project,
-- 3) the app's fail-closed role gate is reviewed.
--
-- Scope: only the 19 known Muhaimin business tables listed below.
-- This script does NOT alter grants across the entire public schema.
-- Replace the Main Admin UUID placeholder locally; do not commit a real account UUID.

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'customer'
    CHECK (role IN ('main_admin', 'customer')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_user_roles ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.app_user_roles FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.app_user_roles TO authenticated;

DROP POLICY IF EXISTS "users can view own role" ON public.app_user_roles;
CREATE POLICY "users can view own role"
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

-- Existing Auth accounts are Customer by default.
INSERT INTO public.app_user_roles (user_id, role)
SELECT u.id, 'customer'
FROM auth.users AS u
ON CONFLICT (user_id) DO NOTHING;

-- Set the one explicitly trusted Main Admin. Replace locally with the UID
-- shown in Supabase Authentication > Users for the intended admin account.
DO $$
DECLARE
  admin_user_id_text text := 'REPLACE_WITH_MAIN_ADMIN_USER_UUID';
  admin_user_id uuid;
BEGIN
  IF admin_user_id_text = '' OR admin_user_id_text LIKE '%REPLACE_WITH_MAIN_ADMIN_USER_UUID%' THEN
    RAISE EXCEPTION 'Replace the Main Admin UUID placeholder before running this migration.';
  END IF;

  BEGIN
    admin_user_id := admin_user_id_text::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'The configured Main Admin UUID is not a valid UUID.';
  END;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = admin_user_id) THEN
    RAISE EXCEPTION 'No Supabase Auth user found for the configured Main Admin UUID. No changes committed.';
  END IF;

  -- Ensure there is only one Main Admin account after this migration.
  UPDATE public.app_user_roles SET role = 'customer';
  UPDATE public.app_user_roles SET role = 'main_admin' WHERE user_id = admin_user_id;
END;
$$;

-- New Auth registrations receive Customer role only.
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
DROP TRIGGER IF EXISTS assign_default_customer_role_after_signup ON auth.users;
CREATE TRIGGER assign_default_customer_role_after_signup
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.assign_default_customer_role();

-- Restrict policies only on the known Muhaimin business tables.
-- Customer accounts receive no access to these tables until a separate,
-- explicitly designed customer policy is added.
DO $$
DECLARE
  table_name text;
  policy_row record;
  business_tables text[] := ARRAY[
    'agro_products', 'agro_purchases', 'agro_sales', 'app_settings',
    'branches', 'farmer_payments', 'farmers', 'feed_products',
    'feed_purchases', 'feed_sales', 'hub_payments', 'issues',
    'milk_collections', 'products', 'targets', 'vet_companies',
    'vet_products', 'vet_purchases', 'vet_sales'
  ];
BEGIN
  FOREACH table_name IN ARRAY business_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      RAISE EXCEPTION 'Expected business table public.% is missing; transaction cancelled.', table_name;
    END IF;

    FOR policy_row IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = table_name
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', policy_row.policyname, table_name);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.current_app_role() = %L) WITH CHECK (public.current_app_role() = %L)',
      'main_admin_full_access', table_name, 'main_admin', 'main_admin'
    );
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END;
$$;

COMMIT;

-- Test ONLY in a separate test project first:
-- 1) Main Admin can load dashboard and perform expected business workflows.
-- 2) Customer can read their own role but cannot read/write any business table.
-- 3) Anonymous requests cannot read/write business data, including products.
-- 4) A new signup gets role='customer' and cannot promote itself.
-- 5) All 19 tables and reports/ledger continue working for Main Admin.
