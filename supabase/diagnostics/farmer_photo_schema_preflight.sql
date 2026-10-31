-- TEST-only, read-only preflight. Confirm the SQL editor is connected to the isolated TEST project.
-- This script performs SELECTs only. It does not create tables, alter columns, or write data.
-- Do not run against Production.

-- 1) Inspect farmer photo and related profile columns, including exact PostgreSQL types.
select
  c.column_name,
  c.data_type,
  c.udt_name,
  c.character_maximum_length,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name = 'farmers'
  and c.column_name in (
    'photo_data_url',
    'photo_path',
    'photo_storage_path',
    'latitude',
    'longitude',
    'location_accuracy',
    'location_captured_at',
    'registered_at'
  )
order by c.ordinal_position;

-- 2) Report whether the farmers table exists, whether RLS is enabled/forced,
-- and whether the photo column is present with the text type expected by current UI code.
select
  to_regclass('public.farmers') is not null as farmers_table_exists,
  coalesce(cls.relrowsecurity, false) as rls_enabled,
  coalesce(cls.relforcerowsecurity, false) as rls_forced,
  exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'farmers'
      and c.column_name = 'photo_data_url'
      and c.data_type = 'text'
  ) as photo_data_url_text_column_exists,
  exists (
    select 1
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'farmers'
      and c.column_name in ('photo_path', 'photo_storage_path')
  ) as storage_path_column_exists
from (select 1) seed
left join pg_class cls on cls.oid = to_regclass('public.farmers');

-- 3) Inspect existing policies; this is inventory only, not proof of JWT authorization.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'farmers'
order by policyname;

-- 4) Inspect existing constraints and indexes relevant to farmer photo/profile data.
select
  con.conname,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
where con.conrelid = to_regclass('public.farmers')
order by con.conname;

select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'farmers'
order by indexname;

-- Decision rule:
-- If photo_data_url is absent, the current farmer INSERT payload cannot persist it.
-- If present as text, confirm actual row insert/readback and practical row-size behavior in TEST.
-- Do not add a column or storage bucket until the TEST schema, existing storage setup,
-- RLS policies, backup/restore plan, and migration history have been reviewed.


-- 5) Compare every photo/GPS/registration payload column with the live TEST schema.
-- Missing columns and type/default mismatches are reported; this query is read-only.
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
  expected.column_name,
  expected.expected_data_type,
  actual.data_type as actual_data_type,
  actual.is_nullable,
  actual.column_default,
  (actual.column_name is not null) as column_exists,
  (actual.data_type = expected.expected_data_type) as type_matches
from expected
left join information_schema.columns actual
  on actual.table_schema = 'public'
 and actual.table_name = 'farmers'
 and actual.column_name = expected.column_name
order by expected.column_name;

-- 6) Show whether each Farmer profile constraint is validated for existing rows.
-- NOT VALID constraints still protect new inserts/updates; convalidated=false means
-- historical rows have not been scanned by PostgreSQL for that constraint.
select
  con.conname,
  con.convalidated,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
where con.conrelid = to_regclass('public.farmers')
  and con.conname in (
    'farmers_latitude_range_check',
    'farmers_longitude_range_check',
    'farmers_location_pair_check',
    'farmers_photo_data_url_size_check'
  )
order by con.conname;
