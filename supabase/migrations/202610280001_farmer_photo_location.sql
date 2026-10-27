-- TEST-first migration: nullable farmer profile metadata; no existing farmer rows are rewritten.
-- Apply only to the isolated TEST project and verify before any Production use.
alter table public.farmers
  add column if not exists photo_data_url text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists location_accuracy double precision,
  add column if not exists location_captured_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'farmers_latitude_range_check') then
    alter table public.farmers add constraint farmers_latitude_range_check
      check (latitude is null or latitude between -90 and 90) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'farmers_longitude_range_check') then
    alter table public.farmers add constraint farmers_longitude_range_check
      check (longitude is null or longitude between -180 and 180) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'farmers_location_pair_check') then
    alter table public.farmers add constraint farmers_location_pair_check
      check ((latitude is null and longitude is null) or (latitude is not null and longitude is not null)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'farmers_photo_data_url_size_check') then
    alter table public.farmers add constraint farmers_photo_data_url_size_check
      check (photo_data_url is null or (length(photo_data_url) <= 650000 and photo_data_url like 'data:image/%;base64,%')) not valid;
  end if;
end $$;

comment on column public.farmers.photo_data_url is 'Optional compressed farmer photo data URL; access inherits farmers table RLS.';
comment on column public.farmers.location_captured_at is 'Timestamp when the farmer GPS coordinates were explicitly captured by the user.';
