-- TEST-first migration: center photo and GPS metadata for Muhaimin Dairy.
-- Apply to TEST, verify RLS and image size, then separately approve any production migration.
alter table public.branches
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists photo_data_url text;
comment on column public.branches.latitude is 'Latitude captured with explicit user action and device permission.';
comment on column public.branches.longitude is 'Longitude captured with explicit user action and device permission.';
comment on column public.branches.photo_data_url is 'Compressed branch photo data URL; consider moving to Supabase Storage before large-scale use.';
