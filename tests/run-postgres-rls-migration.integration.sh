#!/usr/bin/env bash
set -euo pipefail
: "\${PGHOST:=127.0.0.1}"
: "\${PGPORT:=5432}"
: "\${PGDATABASE:=muhaimin_test}"
: "\${PGUSER:=postgres}"
: "\${PGPASSWORD:=postgres}"
export PGHOST PGPORT PGDATABASE PGUSER PGPASSWORD
MIGRATION="supabase-role-security-migration-TARGETED-DRAFT.sql"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
ADMIN_ID="00000000-0000-4000-8000-000000000001"
CUSTOMER_ID="00000000-0000-4000-8000-000000000002"
NEW_USER_ID="00000000-0000-4000-8000-000000000003"
sed "s/REPLACE_WITH_MAIN_ADMIN_USER_UUID/$ADMIN_ID/g" "$MIGRATION" > "$TMP_DIR/migration.sql"

psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text UNIQUE);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
INSERT INTO auth.users (id, email) VALUES
 ('00000000-0000-4000-8000-000000000001','test-admin@example.invalid'),
 ('00000000-0000-4000-8000-000000000002','test-customer@example.invalid');
DO $$
DECLARE t text;
tables text[] := ARRAY[
 'agro_products','agro_purchases','agro_sales','app_settings','branches',
 'farmer_payments','farmers','feed_products','feed_purchases','feed_sales',
 'hub_payments','issues','milk_collections','products','targets',
 'vet_companies','vet_products','vet_purchases','vet_sales'
];
BEGIN
 FOREACH t IN ARRAY tables LOOP
  EXECUTE format('CREATE TABLE public.%I (id integer PRIMARY KEY, value text NOT NULL)',t);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated',t);
  EXECUTE format('CREATE POLICY legacy_allow_all ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)',t);
  EXECUTE format('INSERT INTO public.%I VALUES (1,%L)',t,'seed');
 END LOOP;
END $$;
SQL

psql -v ON_ERROR_STOP=1 -f "$TMP_DIR/migration.sql"
psql -v ON_ERROR_STOP=1 <<SQL
INSERT INTO auth.users VALUES ('$NEW_USER_ID','new-customer@example.invalid');
DO \$\$
BEGIN
 IF (SELECT role FROM public.app_user_roles WHERE user_id='$NEW_USER_ID') <> 'customer' THEN
  RAISE EXCEPTION 'New signup did not receive customer role';
 END IF;
 IF (SELECT count(*) FROM public.app_user_roles WHERE role='main_admin') <> 1 THEN
  RAISE EXCEPTION 'Expected exactly one Main Admin';
 END IF;
END \$\$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','$CUSTOMER_ID',false);
DO \$\$
DECLARE t text; n integer;
tables text[] := ARRAY[
 'agro_products','agro_purchases','agro_sales','app_settings','branches',
 'farmer_payments','farmers','feed_products','feed_purchases','feed_sales',
 'hub_payments','issues','milk_collections','products','targets',
 'vet_companies','vet_products','vet_purchases','vet_sales'
];
BEGIN
 IF (SELECT count(*) FROM public.app_user_roles WHERE user_id=auth.uid()) <> 1 THEN
  RAISE EXCEPTION 'Customer cannot read own role';
 END IF;
 IF (SELECT count(*) FROM public.app_user_roles WHERE role='main_admin') <> 0 THEN
  RAISE EXCEPTION 'Customer can read another role';
 END IF;
 FOREACH t IN ARRAY tables LOOP
  EXECUTE format('SELECT count(*) FROM public.%I',t) INTO n;
  IF n <> 0 THEN RAISE EXCEPTION 'Customer read business table %',t; END IF;
  BEGIN
   EXECUTE format('INSERT INTO public.%I VALUES (99,%L)',t,'blocked');
   RAISE EXCEPTION 'Customer wrote business table %',t;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
 END LOOP;
 BEGIN
  UPDATE public.app_user_roles SET role='main_admin' WHERE user_id=auth.uid();
  RAISE EXCEPTION 'Customer escalated own role';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END \$\$;
RESET ROLE;

SET ROLE anon;
SELECT set_config('request.jwt.claim.sub','',false);
DO \$\$
DECLARE t text; n integer;
tables text[] := ARRAY[
 'agro_products','agro_purchases','agro_sales','app_settings','branches',
 'farmer_payments','farmers','feed_products','feed_purchases','feed_sales',
 'hub_payments','issues','milk_collections','products','targets',
 'vet_companies','vet_products','vet_purchases','vet_sales'
];
BEGIN
 FOREACH t IN ARRAY tables LOOP
  EXECUTE format('SELECT count(*) FROM public.%I',t) INTO n;
  IF n <> 0 THEN RAISE EXCEPTION 'Anonymous read business table %',t; END IF;
  BEGIN
   EXECUTE format('INSERT INTO public.%I VALUES (99,%L)',t,'blocked');
   RAISE EXCEPTION 'Anonymous wrote business table %',t;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
 END LOOP;
END \$\$;
RESET ROLE;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','$ADMIN_ID',false);
DO \$\$
DECLARE t text; n integer;
tables text[] := ARRAY[
 'agro_products','agro_purchases','agro_sales','app_settings','branches',
 'farmer_payments','farmers','feed_products','feed_purchases','feed_sales',
 'hub_payments','issues','milk_collections','products','targets',
 'vet_companies','vet_products','vet_purchases','vet_sales'
];
BEGIN
 FOREACH t IN ARRAY tables LOOP
  EXECUTE format('SELECT count(*) FROM public.%I',t) INTO n;
  IF n <> 1 THEN RAISE EXCEPTION 'Admin expected seed row in %, got %',t,n; END IF;
  EXECUTE format('INSERT INTO public.%I VALUES (2,%L)',t,'admin-write');
  EXECUTE format('SELECT count(*) FROM public.%I',t) INTO n;
  IF n <> 2 THEN RAISE EXCEPTION 'Admin write/read failed on %',t; END IF;
 END LOOP;
END \$\$;
RESET ROLE;

DO \$\$
DECLARE t text; n integer;
tables text[] := ARRAY[
 'agro_products','agro_purchases','agro_sales','app_settings','branches',
 'farmer_payments','farmers','feed_products','feed_purchases','feed_sales',
 'hub_payments','issues','milk_collections','products','targets',
 'vet_companies','vet_products','vet_purchases','vet_sales'
];
BEGIN
 FOREACH t IN ARRAY tables LOOP
  SELECT count(*) INTO n FROM pg_policies WHERE schemaname='public' AND tablename=t;
  IF n <> 1 OR NOT EXISTS (
   SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname='main_admin_full_access'
  ) THEN RAISE EXCEPTION 'Unexpected policy set on % (count=%)',t,n; END IF;
 END LOOP;
END \$\$;
SELECT 'PASS: isolated PostgreSQL RLS migration checks passed for 19 business tables' AS result;
SQL
