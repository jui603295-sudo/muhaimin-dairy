-- DRAFT ONLY: reviewed fail-closed role migration for Muhaimin Dairy.
-- Do NOT run on production until the trusted Main Admin email placeholder is replaced,
-- a secure backup is available, and the app role-gate code in this branch is reviewed.
-- This migration intentionally gives Customer accounts NO access to business tables.
-- Apply first in a separate test Supabase project. It changes policies and grants.

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'customer'
    CHECK (role IN ('main_admin', 'customer')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_user_roles ENABLE ROW LEVEL SECURITY;

-- Only allow a logged-in user to read their own role; no client-side role assignment.
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

-- Existing Auth users default to Customer; new users are handled by the trigger below.
INSERT INTO public.app_user_roles (user_id, role)
SELECT u.id, 'customer'
FROM auth.users AS u
ON CONFLICT (user_id) DO NOTHING;

-- CHANGE THIS VALUE LOCALLY to the trusted Main Admin's exact Supabase Auth email.
-- Do not send the email or any password/service-role key in chat.
DO $$
DECLARE
  admin_email text := lower(trim('REPLACE_WITH_TRUSTED_MAIN_ADMIN_EMAIL'));
  admin_user_id uuid;
BEGIN
  IF admin_email = '' OR admin_email LIKE '%REPLACE_WITH_TRUSTED_MAIN_ADMIN_EMAIL%' THEN
    RAISE EXCEPTION 'Replace the Main Admin email placeholder before running this migration.';
  END IF;

  SELECT u.id
    INTO admin_user_id
  FROM auth.users AS u
  WHERE lower(u.email) = admin_email;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'No Supabase Auth user found for the configured Main Admin email. No changes committed.';
  END IF;

  UPDATE public.app_user_roles
  SET role = 'main_admin'
  WHERE user_id = admin_user_id;
END;
$$;

-- Future registrations receive Customer role automatically, never Main Admin.
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

-- Replace permissive business-table policies with Main-Admin-only access.
-- Customer accounts are denied access until a separate, explicitly scoped policy is designed.
DO $$
DECLARE
  t record;
  p record;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relname <> 'app_user_roles'
  LOOP
    FOR p IN
      SELECT polname
      FROM pg_policy
      WHERE polrelid = format('public.%I', t.relname)::regclass
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.polname, t.relname);
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.current_app_role() = %L) WITH CHECK (public.current_app_role() = %L)',
      'main_admin_full_access',
      t.relname,
      'main_admin',
      'main_admin'
    );
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.relname);
  END LOOP;
END;
$$;

-- Remove direct table grants from anonymous/public roles; RLS remains the enforcement layer.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Admin inserts may rely on sequences. Sequence access alone does not bypass table RLS.
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMIT;

-- After applying in a test project, verify:
-- 1) Main Admin can read/write expected business tables.
-- 2) Customer can read only their own role and cannot read/write any business table.
-- 3) Anonymous requests cannot read/write private business tables.
-- 4) Signup creates Customer only; client metadata cannot promote a user.
-- 5) Existing app workflows and all reports/ledger still work for Main Admin.
