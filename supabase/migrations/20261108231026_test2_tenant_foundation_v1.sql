-- TEST 2 only: initial tenant/business foundation.
-- Internal schema is not exposed through the Supabase Data API.
-- Existing public operational tables and policies are intentionally unchanged.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$'),
  status text not null default 'pending'
    check (status in ('pending','active','suspended','closed')),
  country_code char(2) not null default 'BD',
  default_locale text not null default 'bn-BD',
  default_currency char(3) not null default 'BDT',
  timezone text not null default 'Asia/Dhaka',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_currency_format check (default_currency ~ '^[A-Z]{3}$'),
  constraint tenants_country_format check (country_code ~ '^[A-Z]{2}$')
);

create table if not exists private.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references private.tenants(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('owner','admin','manager','staff','cashier','viewer','customer','farmer')),
  status text not null default 'invited'
    check (status in ('invited','active','suspended','revoked')),
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id,user_id)
);

create index if not exists tenant_memberships_user_status_idx
  on private.tenant_memberships(user_id,status);
create index if not exists tenant_memberships_tenant_status_role_idx
  on private.tenant_memberships(tenant_id,status,role);

create table if not exists private.tenant_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references private.tenants(id) on delete restrict,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  intended_role text not null check (intended_role in ('admin','manager','staff','cashier','viewer','customer','farmer')),
  status text not null default 'active'
    check (status in ('active','exhausted','expired','revoked')),
  max_uses integer not null default 1 check (max_uses between 1 and 10000),
  uses_count integer not null default 0 check (uses_count >= 0 and uses_count <= max_uses),
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint tenant_invitation_revocation_consistency
    check ((status = 'revoked') = (revoked_at is not null))
);

create index if not exists tenant_invitations_tenant_status_expiry_idx
  on private.tenant_invitations(tenant_id,status,expires_at);

alter table private.tenants enable row level security;
alter table private.tenants force row level security;
alter table private.tenant_memberships enable row level security;
alter table private.tenant_memberships force row level security;
alter table private.tenant_invitations enable row level security;
alter table private.tenant_invitations force row level security;

revoke all on private.tenants, private.tenant_memberships, private.tenant_invitations
  from public, anon, authenticated;
grant select, insert, update, delete on private.tenants,
  private.tenant_memberships, private.tenant_invitations to service_role;

comment on schema private is
  'Internal application data. Not exposed through Supabase Data API; access only through reviewed server-side functions.';
comment on table private.tenants is
  'Business tenant registry. Platform roles remain separate in public.app_user_roles.';
comment on table private.tenant_memberships is
  'Tenant-scoped memberships; role is meaningful only inside tenant_id.';
comment on table private.tenant_invitations is
  'Single-use or bounded tenant invitations. Stores SHA-256 token hashes only; never store raw invitation tokens.';

-- Create a pending TEST 2 tenant from the existing platform Main Admin.
-- Do not activate it or alter the platform role as part of this bootstrap.
insert into private.tenants
  (name,slug,status,country_code,default_locale,default_currency,timezone,created_by)
select
  'মুহাইমিন ডেইরি','muhaimin-dairy-test2','pending','BD','bn-BD','BDT','Asia/Dhaka',r.user_id
from public.app_user_roles r
where r.role = 'main_admin'
order by r.created_at
limit 1
on conflict (slug) do nothing;

insert into private.tenant_memberships
  (tenant_id,user_id,role,status,invited_by,joined_at)
select t.id,r.user_id,'owner','active',r.user_id,now()
from private.tenants t
cross join lateral (
  select user_id from public.app_user_roles
  where role='main_admin'
  order by created_at
  limit 1
) r
where t.slug='muhaimin-dairy-test2'
on conflict (tenant_id,user_id) do nothing;

commit;
