# Muhaimin Dairy — TEST Database Preflight SQL

**Read-only diagnostics unless a section is explicitly labelled otherwise.** Run these queries only after connecting to the separate TEST Supabase project. Do not paste credentials, access tokens, or connection strings into GitHub.

Before running anything, verify the Supabase project ref in the dashboard. The production project ref is `hhqshslzoznwyprhjzia`; stop immediately if the SQL editor is connected to that project.

## 1. Confirm target project context

Supabase SQL editor does not expose a universal project-ref function. Verify the project name and ref in the dashboard header before running queries. Record only the TEST project ref in the private test log.

## 2. Check required columns exist

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'milk_collections'
  and column_name in (
    'client_record_id',
    'branch_id',
    'collection_date',
    'collection_method',
    'scale_ticket_no',
    'quality_reviewer_user_id'
  )
order by column_name;
```

Expected after V2 and V3 migrations: all six columns appear. If any are missing, stop and inspect migration order; do not enable replay.

## 3. Check the indexes exist and are valid

```sql
select
  index_class.relname as index_name,
  index_data.indisunique as is_unique,
  index_data.indisvalid as is_valid,
  pg_get_indexdef(index_data.indexrelid) as index_definition
from pg_index index_data
join pg_class table_class on table_class.oid = index_data.indrelid
join pg_class index_class on index_class.oid = index_data.indexrelid
join pg_namespace ns on ns.oid = table_class.relnamespace
where ns.nspname = 'public'
  and table_class.relname = 'milk_collections'
  and index_class.relname in (
    'milk_collections_unique_scale_ticket',
    'milk_collections_client_record_id_uidx',
    'milk_collections_quality_reviewer_idx'
  )
order by index_class.relname;
```

Expected after the corresponding migrations: all three indexes exist and `is_valid = true`. Confirm the unique index definitions include their intended partial predicates.

## 4. Read-only duplicate checks

Check existing non-null idempotency keys:

```sql
select client_record_id, count(*) as row_count
from public.milk_collections
where client_record_id is not null
group by client_record_id
having count(*) > 1;
```

Expected: zero rows.

Check scale-ticket collisions before V2 migration (also useful after it):

```sql
select
  branch_id,
  collection_date,
  lower(btrim(scale_ticket_no)) as normalized_ticket,
  count(*) as row_count
from public.milk_collections
where collection_method = 'Weighing Scale'
  and nullif(btrim(scale_ticket_no), '') is not null
group by branch_id, collection_date, lower(btrim(scale_ticket_no))
having count(*) > 1;
```

Expected: zero rows. If rows appear before V2, resolve duplicates in TEST with a documented, reviewed plan; do not delete or rewrite records blindly.

## 5. Confirm legacy NULL keys are still permitted

```sql
select count(*) as legacy_rows_without_client_record_id
from public.milk_collections
where client_record_id is null;
```

This is informational. Existing legacy rows may legitimately have NULL keys. Do not backfill arbitrary IDs just to make this count zero.

## 6. RLS policy inventory (read-only)

```sql
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
  and tablename = 'milk_collections'
order by policyname;
```

Review these policies against the intended role matrix. This inventory alone does not prove security: use actual authenticated TEST JWTs for read/write attempts as described in `MILK_COLLECTION_V3_TEST_RUNBOOK.md`. Do not use a service-role token as a substitute for a user JWT.

## Stop conditions

Stop and do not enable queue replay if the target project is uncertain, required columns/indexes are missing or invalid, duplicate checks return rows, RLS intent is unclear, or any test is run with production credentials. These queries are diagnostics only; they do not prove real-JWT behavior and do not authorize production migration.
