-- Muhaimin Dairy: initial fail-closed business-table access lockdown.
-- TEST PROJECT ONLY. Apply after supabase-security-v1.sql and after taking/restoring
-- a verified backup. Do not run on production until every role is tested with JWTs.
--
-- This stage intentionally permits only Main Admin access to public business tables.
-- Customer/representative permissions must be designed and tested in a later migration.
-- It removes pre-existing permissive policies (including broad authenticated ALL and
-- public product-read policies) so they cannot override the role check.

begin;

do $precheck$
begin
  if to_regclass('public.app_user_roles') is null then
    raise exception 'public.app_user_roles is missing; apply supabase-security-v1.sql first.';
  end if;
  if to_regprocedure('public.has_app_role(text)') is null then
    raise exception 'public.has_app_role(text) is missing; apply supabase-security-v1.sql first.';
  end if;
end;
$precheck$;

do $lockdown$
declare
  tbl record;
  pol record;
begin
  for tbl in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r','p')
      and c.relname <> 'app_user_roles'
    order by c.relname
  loop
    execute format('alter table public.%I enable row level security', tbl.relname);

    for pol in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = tbl.relname
    loop
      execute format('drop policy %I on public.%I', pol.policyname, tbl.relname);
    end loop;

    execute format(
      'create policy main_admin_only_access on public.%I
       for all to authenticated
       using (public.has_app_role(''main_admin''))
       with check (public.has_app_role(''main_admin''))',
      tbl.relname
    );
  end loop;
end;
$lockdown$;

commit;

-- Verification (run in the TEST project's SQL Editor):
-- 1. Confirm every public base table except app_user_roles has RLS enabled.
-- 2. Confirm each has exactly the main_admin_only_access policy.
-- 3. Test anon, customer, representative, and main_admin using real signed-in JWTs.
-- 4. Until customer/representative policies are intentionally added, those roles must
--    receive no business-table access. The frontend must remain fail-closed.
