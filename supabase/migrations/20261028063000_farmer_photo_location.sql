-- Farmer profile media/location fields for the Farmers form.
-- Apply to TEST first; do not run against Production before release gates pass.
alter table public.farmers
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists photo_data_url text;

alter table public.farmers
  drop constraint if exists farmers_latitude_range_check,
  drop constraint if exists farmers_longitude_range_check;

alter table public.farmers
  add constraint farmers_latitude_range_check
    check (latitude is null or latitude between -90 and 90),
  add constraint farmers_longitude_range_check
    check (longitude is null or longitude between -180 and 180);
