-- Muhaimin Dairy: isolated, versioned, Main Admin-controlled Milk Collection settings.
-- TEST PROJECT ONLY until restore, JWT/RLS and regression tests pass. Never run on production directly.
begin;

do $precheck$
begin
  if to_regprocedure('public.has_app_role(text)') is null then
    raise exception 'public.has_app_role(text) is missing; verify role-security migration in TEST first.';
  end if;
end;
$precheck$;

create table if not exists public.milk_collection_settings (
  setting_key text primary key default 'default' check (setting_key = 'default'),
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  schema_version integer not null default 1 check (schema_version >= 1),
  revision bigint not null default 1 check (revision >= 1),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.milk_collection_settings
  add column if not exists schema_version integer not null default 1,
  add column if not exists revision bigint not null default 1;

alter table public.milk_collection_settings enable row level security;
revoke all on table public.milk_collection_settings from anon;
grant select, insert, update, delete on table public.milk_collection_settings to authenticated;

drop policy if exists milk_collection_settings_main_admin_only on public.milk_collection_settings;
create policy milk_collection_settings_main_admin_only
  on public.milk_collection_settings for all to authenticated
  using (public.has_app_role('main_admin'))
  with check (public.has_app_role('main_admin'));

create table if not exists public.milk_collection_settings_audit (
  id bigint generated always as identity primary key,
  setting_key text not null default 'default' check (setting_key = 'default'),
  previous_settings jsonb not null default '{}'::jsonb,
  new_settings jsonb not null check (jsonb_typeof(new_settings) = 'object'),
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);
alter table public.milk_collection_settings_audit enable row level security;
revoke all on table public.milk_collection_settings_audit from anon;
grant select, insert on table public.milk_collection_settings_audit to authenticated;
drop policy if exists milk_collection_settings_audit_main_admin_only on public.milk_collection_settings_audit;
create policy milk_collection_settings_audit_main_admin_only
  on public.milk_collection_settings_audit for all to authenticated
  using (public.has_app_role('main_admin'))
  with check (public.has_app_role('main_admin'));

insert into public.milk_collection_settings (setting_key, settings)
values ('default', '{
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
}'::jsonb)
on conflict (setting_key) do nothing;

-- Atomic merge: future keys are retained when older UI versions save known settings.
-- Validation is performed in the database as well as the browser.
create or replace function public.save_milk_collection_settings(p_settings jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
declare
  v_old jsonb;
  v_new jsonb;
begin
  if auth.uid() is null or not public.has_app_role('main_admin') then
    raise exception 'Main Admin role required to change Milk Collection settings'
      using errcode = '42501';
  end if;
  if p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    raise exception 'Settings patch must be a JSON object' using errcode = '22023';
  end if;
  if p_settings ? 'default_purchase_rate' then
    if jsonb_typeof(p_settings->'default_purchase_rate') <> 'number'
      or (p_settings->>'default_purchase_rate')::numeric <= 0
      or (p_settings->>'default_purchase_rate')::numeric > 100000 then
      raise exception 'default_purchase_rate is out of range' using errcode = '22023';
    end if;
  end if;
  if p_settings ? 'clr_min' and
    (jsonb_typeof(p_settings->'clr_min') <> 'number'
      or (p_settings->>'clr_min')::numeric < 0
      or (p_settings->>'clr_min')::numeric > 50) then
    raise exception 'clr_min is out of range' using errcode = '22023';
  end if;
  if p_settings ? 'clr_max' and
    (jsonb_typeof(p_settings->'clr_max') <> 'number'
      or (p_settings->>'clr_max')::numeric < 0
      or (p_settings->>'clr_max')::numeric > 50) then
    raise exception 'clr_max is out of range' using errcode = '22023';
  end if;
  if p_settings ? 'clr_min' and p_settings ? 'clr_max'
    and (p_settings->>'clr_min')::numeric > (p_settings->>'clr_max')::numeric then
    raise exception 'clr_min cannot exceed clr_max' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_each(p_settings) e
    where e.key in ('quality_review_required','quality_reason_required','offline_queue_enabled',
                    'barcode_scanner_enabled','sample_photo_required','scale_integration_enabled',
                    'receipt_print_enabled','receipt_share_enabled')
      and jsonb_typeof(e.value) <> 'boolean'
  ) then
    raise exception 'Boolean setting has invalid type' using errcode = '22023';
  end if;

  select settings into v_old
  from public.milk_collection_settings
  where setting_key = 'default'
  for update;
  v_old := coalesce(v_old, '{}'::jsonb);

  insert into public.milk_collection_settings (setting_key, settings, schema_version, revision, updated_by, updated_at)
  values ('default', v_old || p_settings, 1, 1, auth.uid(), now())
  on conflict (setting_key) do update
    set settings = public.milk_collection_settings.settings || excluded.settings,
        revision = public.milk_collection_settings.revision + 1,
        updated_by = auth.uid(),
        updated_at = now()
  returning settings into v_new;

  insert into public.milk_collection_settings_audit
    (setting_key, previous_settings, new_settings, changed_by)
  values ('default', v_old, v_new, auth.uid());

  return v_new;
end;
$function$;

revoke all on function public.save_milk_collection_settings(jsonb) from public, anon;
grant execute on function public.save_milk_collection_settings(jsonb) to authenticated;

commit;

-- TEST only: verify Main Admin can read/save, other roles and anon cannot read/save,
-- unknown JSON keys survive saves from older UI, revision increments, audit rows are created,
-- and invalid rates/CLR/types are rejected. Use real signed-in JWTs; SET ROLE alone is insufficient.
