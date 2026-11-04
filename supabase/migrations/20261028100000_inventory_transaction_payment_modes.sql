-- Add consistent settlement fields to veterinary and agro inventory transactions.
-- Apply and verify in TEST first; do not run against Production without explicit approval.
begin;
alter table public.vet_purchases
  add column if not exists payment_method text not null default 'cash',
  add column if not exists due_amount numeric(12,2) not null default 0;
alter table public.vet_sales
  add column if not exists payment_method text not null default 'cash',
  add column if not exists due_amount numeric(12,2) not null default 0;
alter table public.agro_purchases
  add column if not exists payment_method text not null default 'cash',
  add column if not exists due_amount numeric(12,2) not null default 0;
alter table public.agro_sales
  add column if not exists payment_method text not null default 'cash',
  add column if not exists due_amount numeric(12,2) not null default 0;

alter table public.vet_purchases
  drop constraint if exists vet_purchases_payment_method_check,
  add constraint vet_purchases_payment_method_check check (payment_method in ('cash','credit','partial')),
  drop constraint if exists vet_purchases_due_amount_check,
  add constraint vet_purchases_due_amount_check check (due_amount >= 0);
alter table public.vet_sales
  drop constraint if exists vet_sales_payment_method_check,
  add constraint vet_sales_payment_method_check check (payment_method in ('cash','credit','partial')),
  drop constraint if exists vet_sales_due_amount_check,
  add constraint vet_sales_due_amount_check check (due_amount >= 0);
alter table public.agro_purchases
  drop constraint if exists agro_purchases_payment_method_check,
  add constraint agro_purchases_payment_method_check check (payment_method in ('cash','credit','partial')),
  drop constraint if exists agro_purchases_due_amount_check,
  add constraint agro_purchases_due_amount_check check (due_amount >= 0);
alter table public.agro_sales
  drop constraint if exists agro_sales_payment_method_check,
  add constraint agro_sales_payment_method_check check (payment_method in ('cash','credit','partial')),
  drop constraint if exists agro_sales_due_amount_check,
  add constraint agro_sales_due_amount_check check (due_amount >= 0);
commit;
