-- Milk Collection V2 integrity: ticket uniqueness and reviewer identity.
-- Apply to the restored TEST Supabase project only.
-- Preflight duplicate check before creating the index:
-- select branch_id, collection_date, lower(btrim(scale_ticket_no)) as ticket, count(*)
-- from public.milk_collections
-- where collection_method = 'Weighing Scale'
--   and nullif(btrim(scale_ticket_no), '') is not null
-- group by branch_id, collection_date, lower(btrim(scale_ticket_no))
-- having count(*) > 1;
-- Resolve any duplicates in TEST before applying this migration.

begin;

alter table public.milk_collections
  add column if not exists quality_reviewer_user_id uuid
  references auth.users(id) on delete set null;

create index if not exists milk_collections_quality_reviewer_idx
  on public.milk_collections(quality_reviewer_user_id);

create unique index if not exists milk_collections_unique_scale_ticket
  on public.milk_collections (
    branch_id,
    collection_date,
    lower(btrim(scale_ticket_no))
  )
  where collection_method = 'Weighing Scale'
    and nullif(btrim(scale_ticket_no), '') is not null;

commit;

-- TEST acceptance criteria:
-- 1. Same scale ticket can exist on different dates/branches.
-- 2. Duplicate ticket on same branch/date is rejected by PostgreSQL, even for concurrent requests.
-- 3. Quality review saves quality_reviewer_user_id from auth.uid().
-- 4. Existing records remain readable and no live database is modified by this file.
