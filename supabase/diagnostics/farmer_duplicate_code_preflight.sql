-- Muhaimin Dairy: READ-ONLY farmer-code uniqueness diagnostics
-- Run ONLY in an isolated TEST database after confirming public.farmers and
-- public.farmers.farmer_code exist with docs/farmer_schema_preflight.sql.
-- SELECT-only: no DDL, DML, RLS, grants, or migration-history changes.
-- Do not run against Production.

-- 1) Confirm the farmer_code column and its data type.
select
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'farmers'
  and column_name = 'farmer_code';

-- 2) Count NULL and blank/whitespace-only codes.
select
  count(*) filter (where farmer_code is null) as null_code_rows,
  count(*) filter (where farmer_code is not null and btrim(farmer_code::text) = '') as blank_code_rows,
  count(*) as total_farmer_rows
from public.farmers;

-- 3) Find duplicate codes using the application's case-insensitive,
-- whitespace-trimmed comparison rule. Resolve these rows before any unique index.
select
  upper(btrim(farmer_code::text)) as normalized_farmer_code,
  count(*) as duplicate_count
from public.farmers
where farmer_code is not null
  and btrim(farmer_code::text) <> ''
group by upper(btrim(farmer_code::text))
having count(*) > 1
order by duplicate_count desc, normalized_farmer_code;

-- 4) Inventory existing indexes and constraints that could already enforce
-- uniqueness. Review definitions; do not assume an index is equivalent unless
-- its expression/predicate matches the application's normalization rule.
select
  idx.indexname,
  idx.indexdef
from pg_indexes idx
where idx.schemaname = 'public'
  and idx.tablename = 'farmers'
order by idx.indexname;

select
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_get_constraintdef(con.oid) as definition,
  con.convalidated as validated
from pg_constraint con
join pg_class rel on rel.oid = con.conrelid
join pg_namespace ns on ns.oid = rel.relnamespace
where ns.nspname = 'public'
  and rel.relname = 'farmers'
order by con.conname;

-- 5) Decision rule:
-- - Do not add a unique constraint until duplicate and blank-code results are reviewed.
-- - Confirm whether codes are globally unique or scoped by branch/center.
-- - If globally unique is approved, a normalized unique index may be appropriate,
--   but prepare and test that migration separately in TEST first.
-- - If scoped, determine the exact scope columns and include them in the index.
-- - Client-side preflight is not atomic and cannot replace a database constraint.
