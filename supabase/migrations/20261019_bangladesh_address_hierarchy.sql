-- Muhaimin Dairy: Bangladesh address hierarchy for branches and farmers
-- Apply this migration to the TEST Supabase project first. It does not modify existing rows.
begin;

alter table public.branches
  add column if not exists country text not null default 'বাংলাদেশ',
  add column if not exists division text,
  add column if not exists district text,
  add column if not exists upazila text,
  add column if not exists union_name text,
  add column if not exists village_name text;

alter table public.farmers
  add column if not exists country text not null default 'বাংলাদেশ',
  add column if not exists division text,
  add column if not exists district text,
  add column if not exists upazila text,
  add column if not exists union_name text,
  add column if not exists village_name text;

-- Preserve legacy farmer address values without overwriting any existing data.
update public.farmers
set village_name = coalesce(nullif(village_name, ''), nullif(village, ''))
where village_name is null and village is not null and village <> '';

commit;
