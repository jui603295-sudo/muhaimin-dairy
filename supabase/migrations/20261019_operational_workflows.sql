-- Muhaimin Dairy operational workflows schema (V1)
-- Apply to the separate TEST Supabase project only after restoring the backup.
-- Intentionally creates no broad authenticated policies. Keep RLS deny-by-default
-- until role-scoped policies are reviewed and tested with real user JWTs.
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

alter table public.milk_collections drop constraint if exists milk_collections_quality_status_check;
alter table public.milk_collections add constraint milk_collections_quality_status_check
 check (quality_status in ('Pending','Accepted','Retest Required','Quarantined','Rejected'));



create table if not exists public.milk_batches (
 id uuid primary key default gen_random_uuid(),
 batch_id text not null unique,
 batch_date date not null,
 branch_id uuid not null references public.branches(id),
 quantity_liters numeric(12,2) not null check (quantity_liters >= 0),
 chiller_in_at timestamptz,
 chiller_out_at timestamptz,
 dispatched_liters numeric(12,2) not null default 0 check (dispatched_liters >= 0),
 buyer_accepted_liters numeric(12,2) not null default 0 check (buyer_accepted_liters >= 0),
 incident_notes text,
 created_at timestamptz not null default now(),
 check (buyer_accepted_liters <= dispatched_liters)
);

create table if not exists public.chiller_logs (
 id uuid primary key default gen_random_uuid(),
 branch_id uuid not null references public.branches(id),
 chiller_id text not null,
 temperature_c numeric(6,2) not null,
 recorded_at timestamptz not null,
 staff_id text not null,
 incident_type text not null default 'Routine',
 corrective_action text,
 created_at timestamptz not null default now()
);

create table if not exists public.milk_reconciliations (
 id uuid primary key default gen_random_uuid(),
 branch_id uuid not null references public.branches(id),
 recon_date date not null,
 opening_liters numeric(12,2) not null default 0 check (opening_liters >= 0),
 accepted_incoming_liters numeric(12,2) not null default 0 check (accepted_incoming_liters >= 0),
 transfers_in_liters numeric(12,2) not null default 0 check (transfers_in_liters >= 0),
 dispatch_liters numeric(12,2) not null default 0 check (dispatch_liters >= 0),
 approved_disposal_liters numeric(12,2) not null default 0 check (approved_disposal_liters >= 0),
 transfers_out_liters numeric(12,2) not null default 0 check (transfers_out_liters >= 0),
 physical_closing_liters numeric(12,2) not null default 0 check (physical_closing_liters >= 0),
 rejected_liters numeric(12,2) not null default 0 check (rejected_liters >= 0),
 expected_closing_liters numeric(12,2) not null,
 variance_liters numeric(12,2) not null,
 variance_category text not null default 'Pending Investigation' check (variance_category in ('Pending Investigation','Quality Rejection','Verified Physical Loss','Measurement Discrepancy','Documentation Error','Unexplained Variance')),
 approved_by text,
 reason text not null,
 created_at timestamptz not null default now(),
 unique(branch_id, recon_date)
);

create table if not exists public.operating_finance_entries (
 id uuid primary key default gen_random_uuid(),
 entry_date date not null,
 branch_id uuid references public.branches(id),
 entry_type text not null check (entry_type in ('Buyer Sale','Handling Fee','Transport Cost','Electricity/Chiller','Labor Cost','Maintenance','Verified Milk Loss','Rejected Milk Cost','Other Cost')),
 amount numeric(14,2) not null check (amount >= 0),
 cash_settled numeric(14,2) not null default 0 check (cash_settled >= 0 and cash_settled <= amount),
 reference text,
 counterparty text,
 due_date date,
 notes text,
 created_at timestamptz not null default now()
);

create index if not exists milk_batches_branch_date_idx on public.milk_batches(branch_id,batch_date);
create index if not exists chiller_logs_branch_recorded_idx on public.chiller_logs(branch_id,recorded_at desc);
create index if not exists milk_reconciliations_branch_date_idx on public.milk_reconciliations(branch_id,recon_date desc);
create index if not exists operating_finance_date_idx on public.operating_finance_entries(entry_date desc);

alter table public.milk_batches enable row level security;
alter table public.chiller_logs enable row level security;
alter table public.milk_reconciliations enable row level security;
alter table public.operating_finance_entries enable row level security;

commit;
