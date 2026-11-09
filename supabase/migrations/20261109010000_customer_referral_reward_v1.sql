-- Muhaimin Dairy: customer referral + invitation + immutable reward ledger.
-- Target: isolated TEST 2 only. Do not apply to Production without separate approval.
create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint referral_codes_code_format check (code ~ '^[A-Z0-9]{6,20}$')
);
create unique index if not exists referral_codes_one_per_owner on public.referral_codes(owner_user_id);

create table if not exists public.referral_invitations (
  id uuid primary key default gen_random_uuid(),
  referral_code_id uuid not null references public.referral_codes(id) on delete restrict,
  inviter_user_id uuid not null references auth.users(id) on delete restrict,
  invitee_phone text not null,
  invitee_user_id uuid references auth.users(id) on delete restrict,
  status text not null default 'invited',
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete restrict,
  notes text,
  constraint referral_invitations_status_check check (status in ('invited','accepted','verified','rejected','expired')),
  constraint referral_invitations_phone_check check (length(regexp_replace(invitee_phone, '[^0-9]', '', 'g')) between 10 and 15),
  constraint referral_invitations_verification_check check (status <> 'verified' or (verified_at is not null and verified_by is not null))
);
create index if not exists referral_invitations_inviter_idx on public.referral_invitations(inviter_user_id, invited_at desc);
create index if not exists referral_invitations_invitee_idx on public.referral_invitations(invitee_user_id);
create index if not exists referral_invitations_code_idx on public.referral_invitations(referral_code_id);
create unique index if not exists referral_invitations_one_phone_per_code on public.referral_invitations(referral_code_id, invitee_phone);

create table if not exists public.referral_reward_ledger (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid not null references public.referral_invitations(id) on delete restrict,
  beneficiary_user_id uuid not null references auth.users(id) on delete restrict,
  entry_type text not null,
  amount numeric(12,2) not null,
  currency text not null default 'BDT',
  description text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint referral_reward_entry_type_check check (entry_type in ('credit','payout','reversal')),
  constraint referral_reward_amount_check check (amount > 0),
  constraint referral_reward_currency_check check (currency = 'BDT')
);
create index if not exists referral_reward_beneficiary_idx on public.referral_reward_ledger(beneficiary_user_id, created_at desc);
create index if not exists referral_reward_invitation_idx on public.referral_reward_ledger(invitation_id);

alter table public.referral_codes enable row level security;
alter table public.referral_invitations enable row level security;
alter table public.referral_reward_ledger enable row level security;

revoke all on public.referral_codes, public.referral_invitations, public.referral_reward_ledger from anon, authenticated;
grant select, insert on public.referral_codes to authenticated;
grant select, insert on public.referral_invitations to authenticated;
grant select, insert on public.referral_reward_ledger to authenticated;
grant update on public.referral_codes, public.referral_invitations to authenticated;

drop policy if exists referral_codes_admin_all on public.referral_codes;
create policy referral_codes_admin_all on public.referral_codes for all to authenticated
using ((select private.current_app_role()) = 'main_admin')
with check ((select private.current_app_role()) = 'main_admin');
drop policy if exists referral_codes_owner_select on public.referral_codes;
create policy referral_codes_owner_select on public.referral_codes for select to authenticated
using (owner_user_id = (select auth.uid()));
drop policy if exists referral_codes_customer_insert_own on public.referral_codes;
create policy referral_codes_customer_insert_own on public.referral_codes for insert to authenticated
with check (owner_user_id = (select auth.uid()) and (select private.current_app_role()) = 'customer');

drop policy if exists referral_invitations_admin_all on public.referral_invitations;
create policy referral_invitations_admin_all on public.referral_invitations for all to authenticated
using ((select private.current_app_role()) = 'main_admin')
with check ((select private.current_app_role()) = 'main_admin');
drop policy if exists referral_invitations_inviter_select on public.referral_invitations;
create policy referral_invitations_inviter_select on public.referral_invitations for select to authenticated
using (inviter_user_id = (select auth.uid()));
drop policy if exists referral_invitations_invitee_select on public.referral_invitations;
create policy referral_invitations_invitee_select on public.referral_invitations for select to authenticated
using (invitee_user_id = (select auth.uid()));
drop policy if exists referral_invitations_customer_insert_own on public.referral_invitations;
create policy referral_invitations_customer_insert_own on public.referral_invitations for insert to authenticated
with check (
  inviter_user_id = (select auth.uid()) and invitee_user_id is null and status = 'invited'
  and (select private.current_app_role()) = 'customer'
  and exists (select 1 from public.referral_codes rc where rc.id = referral_code_id
    and rc.owner_user_id = (select auth.uid()) and rc.is_active = true)
);

drop policy if exists referral_reward_admin_select on public.referral_reward_ledger;
create policy referral_reward_admin_select on public.referral_reward_ledger for select to authenticated
using ((select private.current_app_role()) = 'main_admin');
drop policy if exists referral_reward_admin_insert on public.referral_reward_ledger;
create policy referral_reward_admin_insert on public.referral_reward_ledger for insert to authenticated
with check ((select private.current_app_role()) = 'main_admin' and created_by = (select auth.uid()));
drop policy if exists referral_reward_owner_select on public.referral_reward_ledger;
create policy referral_reward_owner_select on public.referral_reward_ledger for select to authenticated
using (beneficiary_user_id = (select auth.uid()));

comment on table public.referral_codes is 'Customer-owned referral codes; QR/share URL is derived from code, not stored as trusted authority.';
comment on table public.referral_invitations is 'Invitation lifecycle; only Main Admin can verify and link the invited Auth user.';
comment on table public.referral_reward_ledger is 'Append-only BDT reward ledger. Corrections use new reversal entries; no UPDATE/DELETE grants or policies.';
