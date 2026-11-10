-- Muhaimin Dairy TEST 2 only
-- Customer Profile foundation v1
-- Apply only after reviewing this migration against the current TEST 2 schema.
-- This migration does not create Auth users, assign roles, or grant operational access.

begin;

create table if not exists public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint customer_profiles_full_name_length
    check (char_length(pg_catalog.btrim(full_name)) between 1 and 120),
  constraint customer_profiles_phone_length
    check (phone is null or char_length(phone) <= 32)
);

create or replace function public.set_customer_profiles_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

drop trigger if exists customer_profiles_set_updated_at on public.customer_profiles;
create trigger customer_profiles_set_updated_at
before update on public.customer_profiles
for each row execute function public.set_customer_profiles_updated_at();

alter table public.customer_profiles enable row level security;

revoke all on table public.customer_profiles from public, anon;
grant select, insert, update on table public.customer_profiles to authenticated;

drop policy if exists customer_profiles_select_own on public.customer_profiles;
create policy customer_profiles_select_own
on public.customer_profiles
for select to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.app_user_roles r
    where r.user_id = auth.uid() and r.role = 'customer'
  )
);

drop policy if exists customer_profiles_insert_own on public.customer_profiles;
create policy customer_profiles_insert_own
on public.customer_profiles
for insert to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.app_user_roles r
    where r.user_id = auth.uid() and r.role = 'customer'
  )
);

drop policy if exists customer_profiles_update_own on public.customer_profiles;
create policy customer_profiles_update_own
on public.customer_profiles
for update to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.app_user_roles r
    where r.user_id = auth.uid() and r.role = 'customer'
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.app_user_roles r
    where r.user_id = auth.uid() and r.role = 'customer'
  )
);

commit;

-- Intentionally no DELETE policy.
-- Required verification after applying in TEST 2:
-- 1. Customer A can SELECT/INSERT/UPDATE only their own profile.
-- 2. Customer A cannot SELECT/UPDATE Customer B's profile.
-- 3. Main Admin does not gain customer-profile writes from this migration.
-- 4. anon cannot access the table.
-- 5. Existing Main Admin operational routes still pass.
