-- Muhaimin Dairy: Main Admin-controlled Milk Collection future settings.
-- Apply to the restored TEST Supabase project first. Do NOT apply directly to production.
begin;

do $precheck$
begin
  if to_regprocedure('public.has_app_role(text)') is null then
    raise exception 'public.has_app_role(text) is missing; apply and verify the TEST role-security migration first.';
  end if;
end;
$precheck$;

create table if not exists public.milk_collection_settings (
  setting_key text primary key default 'default' check (setting_key = 'default'),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.milk_collection_settings enable row level security;
revoke all on table public.milk_collection_settings from anon;
grant select, insert, update, delete on table public.milk_collection_settings to authenticated;

drop policy if exists milk_collection_settings_main_admin_only on public.milk_collection_settings;
create policy milk_collection_settings_main_admin_only
  on public.milk_collection_settings
  for all
  to authenticated
  using (public.has_app_role('main_admin'))
  with check (public.has_app_role('main_admin'));

insert into public.milk_collection_settings (setting_key, settings)
values (
  'default',
  '{
    "default_purchase_rate": 50,
    "clr_min": 0,
    "clr_max": 50,
    "quality_review_required": true,
    "quality_reason_required": true,
    "offline_queue_enabled": true,
    "barcode_scanner_enabled": true,
    "sample_photo_required": false,
    "scale_integration_enabled": false,
    "receipt_print_enabled": true,
    "receipt_share_enabled": true
  }'::jsonb
)
on conflict (setting_key) do nothing;

commit;

-- TEST verification:
-- 1. Inspect table columns and RLS policy.
-- 2. With a real Main Admin JWT, read/update the default settings row.
-- 3. With a real customer/representative JWT and anon role, verify read/write is denied.
-- 4. Confirm settings persist after sign-out/sign-in and reload.
-- Do not use SET ROLE alone with auth.uid() = NULL as a substitute for JWT tests.
