-- Muhaimin Dairy — role registry bootstrap (V1 draft)
-- TEST ONLY: apply first to a separate Supabase project restored from backup.
-- Do not run on production until restore, access tests, and app checks pass.
-- This file establishes roles only; it does not yet change business-table policies.
-- Customer/representative operational access must remain disabled until separately tested.

BEGIN;

CREATE TABLE IF NOT EXISTS public.app_user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('main_admin', 'customer', 'representative')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_app_role(required_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_user_roles AS r
    WHERE r.user_id = auth.uid()
      AND r.role = required_role
  );
$function$;

DO $bootstrap$
DECLARE
  admin_user_id uuid;
BEGIN
  SELECT u.id INTO admin_user_id
  FROM auth.users AS u
  WHERE lower(u.email) = lower('jui603295@gmail.com')
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION
      'Expected Main Admin account was not found in auth.users; transaction cancelled.';
  END IF;

  INSERT INTO public.app_user_roles (user_id, role)
  VALUES (admin_user_id, 'main_admin')
  ON CONFLICT (user_id)
  DO UPDATE SET role = EXCLUDED.role, updated_at = now();
END;
$bootstrap$;

CREATE UNIQUE INDEX IF NOT EXISTS app_user_roles_one_main_admin
  ON public.app_user_roles ((role))
  WHERE role = 'main_admin';

DO $policies$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_user_roles'
      AND policyname = 'app_user_roles_read_self_or_admin'
  ) THEN
    CREATE POLICY app_user_roles_read_self_or_admin
      ON public.app_user_roles
      FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR public.has_app_role('main_admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'app_user_roles'
      AND policyname = 'app_user_roles_admin_manage'
  ) THEN
    CREATE POLICY app_user_roles_admin_manage
      ON public.app_user_roles
      FOR ALL TO authenticated
      USING (public.has_app_role('main_admin'))
      WITH CHECK (public.has_app_role('main_admin'));
  END IF;
END;
$policies$;

COMMIT;

-- This is only the role-registry stage. Do not consider the database secured yet.
-- Next migration must remove/review broad existing policies and add role-scoped
-- policies for each business table, then test anon/customer/representative/admin.
