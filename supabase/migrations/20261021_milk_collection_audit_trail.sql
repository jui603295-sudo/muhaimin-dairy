-- Muhaimin Dairy: server-side audit trail for milk collection changes.
-- Apply on the restored TEST Supabase project only, after the role helper migration.
-- This records INSERT/UPDATE/DELETE events; it does not change existing milk rows.

begin;

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id text,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  actor_user_id uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);

create index if not exists audit_events_changed_at_idx
  on public.audit_events(changed_at desc);
create index if not exists audit_events_table_record_idx
  on public.audit_events(table_name, record_id, changed_at desc);
create index if not exists audit_events_actor_idx
  on public.audit_events(actor_user_id, changed_at desc);

alter table public.audit_events enable row level security;
revoke all on table public.audit_events from anon;
grant select on table public.audit_events to authenticated;

drop policy if exists audit_events_main_admin_read on public.audit_events;
create policy audit_events_main_admin_read
  on public.audit_events
  for select to authenticated
  using (public.has_app_role('main_admin'));

create or replace function public.log_milk_collection_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  row_data jsonb;
  record_key text;
begin
  if TG_OP = 'INSERT' then
    row_data := to_jsonb(NEW);
    record_key := row_data ->> 'id';
    insert into public.audit_events(table_name, record_id, action, actor_user_id, new_data)
    values ('milk_collections', record_key, TG_OP, auth.uid(), row_data);
    return NEW;
  elsif TG_OP = 'UPDATE' then
    row_data := to_jsonb(NEW);
    record_key := row_data ->> 'id';
    insert into public.audit_events(table_name, record_id, action, actor_user_id, old_data, new_data)
    values ('milk_collections', record_key, TG_OP, auth.uid(), to_jsonb(OLD), row_data);
    return NEW;
  elsif TG_OP = 'DELETE' then
    row_data := to_jsonb(OLD);
    record_key := row_data ->> 'id';
    insert into public.audit_events(table_name, record_id, action, actor_user_id, old_data)
    values ('milk_collections', record_key, TG_OP, auth.uid(), row_data);
    return OLD;
  end if;
  return null;
end;
$function$;

revoke all on function public.log_milk_collection_change() from public;
drop trigger if exists milk_collections_audit_trg on public.milk_collections;
create trigger milk_collections_audit_trg
  after insert or update or delete on public.milk_collections
  for each row execute function public.log_milk_collection_change();

commit;

-- TEST checks:
-- 1. Insert/update/delete one TEST milk collection and verify an audit_events row per action.
-- 2. Confirm the event actor_user_id equals auth.uid() for an authenticated user.
-- 3. Confirm non-admin users cannot select audit_events.
-- 4. Do not apply to production before the full RLS/JWT test suite passes.
