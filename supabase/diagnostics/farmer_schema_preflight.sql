-- Muhaimin Dairy: READ-ONLY farmer schema preflight
-- Run against an isolated TEST database only. This script performs SELECTs only:
-- it does not create/alter tables, change RLS, insert data, or modify migration history.
-- Purpose: collect evidence before applying the farmer photo/GPS + registered_at migrations.

-- 1) Confirm the target table exists.
select
  to_regclass('public.farmers') as farmers_table,
  case when to_regclass('public.farmers') is null
       then 'BLOCKED: public.farmers does not exist'
       else 'OK: public.farmers exists'
  end as result;

-- 2) Check columns introduced by the two farmer migrations.
with expected(column_name, expected_data_type) as (
  values
    ('photo_data_url', 'text'),
    ('latitude', 'double precision'),
    ('longitude', 'double precision'),
    ('location_accuracy', 'double precision'),
    ('location_captured_at', 'timestamp with time zone'),
    ('registered_at', 'timestamp with time zone')
)
select
  e.column_name,
  e.expected_data_type,
  c.data_type as actual_data_type,
  c.udt_name as actual_udt_name,
  c.is_nullable,
  c.column_default,
  case
    when c.column_name is null then 'MISSING'
    when c.data_type <> e.expected_data_type then 'TYPE MISMATCH'
    else 'OK'
  end as result
from expected e
left join information_schema.columns c
  on c.table_schema = 'public'
 and c.table_name = 'farmers'
 and c.column_name = e.column_name
order by e.column_name;

-- 3) Inspect RLS state. Enabled is required before access-policy validation;
-- forced RLS is reported separately and is not assumed to be required here.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'farmers';

-- 4) List every policy on public.farmers for manual role/JWT review.
select
  p.policyname,
  p.permissive,
  p.roles,
  p.cmd,
  p.qual as using_expression,
  p.with_check as with_check_expression
from pg_policies p
where p.schemaname = 'public'
  and p.tablename = 'farmers'
order by p.policyname;

-- 5) Inspect validation constraints installed by the photo/GPS migration.
select
  con.conname as constraint_name,
  pg_get_constraintdef(con.oid) as definition,
  con.convalidated as validated
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace ns on ns.oid = rel.relnamespace
where ns.nspname = 'public'
  and rel.relname = 'farmers'
  and con.conname in (
    'farmers_latitude_range_check',
    'farmers_longitude_range_check',
    'farmers_location_pair_check',
    'farmers_photo_data_url_size_check'
  )
order by con.conname;

-- 6) Migration ledger evidence, if Supabase's migration history table exists.
select
  to_regclass('supabase_migrations.schema_migrations') as migration_ledger,
  case
    when to_regclass('supabase_migrations.schema_migrations') is null
      then 'Ledger not visible in this role/session; verify via Supabase migration tooling'
    else 'Ledger exists; query versions below if permitted'
  end as result;

select version
from supabase_migrations.schema_migrations
where to_regclass('supabase_migrations.schema_migrations') is not null
  and version in ('202610280001', '202610310001')
order by version;
