-- TEST-first: explicit farmer registration timestamp.
-- Existing farmer rows are deliberately left unchanged (registered_at remains NULL).
-- New registrations receive a database default if a client omits the timestamp.
alter table public.farmers
  add column if not exists registered_at timestamptz;

alter table public.farmers
  alter column registered_at set default now();

comment on column public.farmers.registered_at is
  'Explicit farmer registration timestamp captured at form submission; legacy rows may remain NULL.';
