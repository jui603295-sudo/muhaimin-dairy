-- Manual TEST 2 tenant foundation security smoke test.
-- Run with a privileged database connection in TEST 2 only.
-- Expected result: PASS row. This script does not mutate data.

do $$
begin
  if has_schema_privilege('anon','private','USAGE') then
    raise exception 'FAIL: anon has private schema usage';
  end if;
  if has_schema_privilege('authenticated','private','USAGE') then
    raise exception 'FAIL: authenticated has private schema usage';
  end if;
  if has_table_privilege('anon','private.tenants','SELECT')
     or has_table_privilege('authenticated','private.tenants','SELECT') then
    raise exception 'FAIL: browser role can select tenant registry';
  end if;
  if not has_table_privilege('service_role','private.tenants','SELECT') then
    raise exception 'FAIL: service_role lacks backend select';
  end if;
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='private' and c.relname='tenants'
      and c.relrowsecurity and c.relforcerowsecurity
  ) then
    raise exception 'FAIL: tenants RLS is not enabled and forced';
  end if;
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='private' and c.relname='tenant_memberships'
      and c.relrowsecurity and c.relforcerowsecurity
  ) then
    raise exception 'FAIL: tenant_memberships RLS is not enabled and forced';
  end if;
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='private' and c.relname='tenant_invitations'
      and c.relrowsecurity and c.relforcerowsecurity
  ) then
    raise exception 'FAIL: tenant_invitations RLS is not enabled and forced';
  end if;
  if (select role from public.app_user_roles limit 1) <> 'main_admin' then
    raise exception 'FAIL: platform Main Admin role changed';
  end if;
  if not exists (
    select 1 from private.tenants t
    join private.tenant_memberships m on m.tenant_id=t.id
    join public.app_user_roles r on r.user_id=m.user_id
    where t.slug='muhaimin-dairy-test2'
      and t.status='pending'
      and m.role='owner'
      and m.status='active'
      and r.role='main_admin'
  ) then
    raise exception 'FAIL: initial tenant owner bootstrap mismatch';
  end if;
end;
$$;

select 'PASS: private tenant foundation access and bootstrap assertions' as result;
