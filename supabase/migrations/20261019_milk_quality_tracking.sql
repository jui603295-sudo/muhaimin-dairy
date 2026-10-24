-- Muhaimin Dairy: milk quality tracking (test project first; not applied to production)
begin;

alter table public.milk_collections
  add column if not exists batch_id text,
  add column if not exists milk_temperature_c numeric(6,2),
  add column if not exists fat_percent numeric(5,2),
  add column if not exists snf_percent numeric(5,2),
  add column if not exists acidity_result text,
  add column if not exists lab_result text,
  add column if not exists quality_status text not null default 'Pending',
  add column if not exists quality_reason text,
  add column if not exists tester_id text,
  add column if not exists tested_at timestamptz,
  add column if not exists sample_photo_url text;

alter table public.milk_collections
  drop constraint if exists milk_collections_quality_status_check;

alter table public.milk_collections
  add constraint milk_collections_quality_status_check
  check (quality_status in ('Pending','Accepted','Retest Required','Quarantined','Rejected'));

create index if not exists milk_collections_batch_id_idx
  on public.milk_collections(batch_id);

create index if not exists milk_collections_quality_status_idx
  on public.milk_collections(quality_status);

commit;
