-- Milk collection measurement traceability and first-line screening.
-- Apply to a restored TEST Supabase project first; do not apply directly to production.
begin;

alter table public.milk_collections
  add column if not exists collection_method text not null default 'Manual',
  add column if not exists scale_ticket_no text,
  add column if not exists can_count integer not null default 0,
  add column if not exists smell_check text not null default 'Not Tested',
  add column if not exists visual_check text not null default 'Not Tested',
  add column if not exists adulteration_test text not null default 'Not Tested',
  add column if not exists collector_user_id uuid references auth.users(id) on delete set null;

alter table public.milk_collections
  drop constraint if exists milk_collections_collection_method_check,
  drop constraint if exists milk_collections_can_count_check,
  drop constraint if exists milk_collections_smell_check_check,
  drop constraint if exists milk_collections_visual_check_check,
  drop constraint if exists milk_collections_adulteration_test_check;

alter table public.milk_collections
  add constraint milk_collections_collection_method_check
    check (collection_method in ('Manual','Weighing Scale','Flow Meter')),
  add constraint milk_collections_can_count_check
    check (can_count >= 0),
  add constraint milk_collections_smell_check_check
    check (smell_check in ('Not Tested','Normal','Abnormal')),
  add constraint milk_collections_visual_check_check
    check (visual_check in ('Not Tested','Normal','Abnormal')),
  add constraint milk_collections_adulteration_test_check
    check (adulteration_test in ('Not Tested','Pass','Fail'));

create index if not exists milk_collections_scale_ticket_idx
  on public.milk_collections(scale_ticket_no)
  where scale_ticket_no is not null;
create index if not exists milk_collections_collector_user_idx
  on public.milk_collections(collector_user_id)
  where collector_user_id is not null;
create index if not exists milk_collections_method_status_idx
  on public.milk_collections(collection_method, quality_status);

commit;

-- Notes:
-- These are recording/triage fields, not a certified laboratory or food-safety decision.
-- Screen results should be entered by trained staff using approved test procedures.
