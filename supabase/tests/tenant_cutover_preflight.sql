-- TEST 2 only: read-only gate before operational tenant_id migration.
-- Run with a privileged database connection in TEST 2.
-- This script intentionally expects the current pre-cutover schema.
-- It performs no INSERT/UPDATE/DELETE/DDL operations.

do $$
declare
  v_table text;
  v_missing text[] := array[]::text[];
  v_rls_off text[] := array[]::text[];
  v_has_tenant_id text[] := array[]::text[];
begin
  foreach v_table in array array[
    'app_settings','branches','farmers','milk_collections','farmer_payments',
    'feed_products','feed_purchases','feed_sales',
    'vet_companies','vet_products','vet_purchases','vet_sales',
    'agro_products','agro_purchases','agro_sales','audit_log','audit_events'
  ] loop
    if to_regclass(format('public.%I', v_table)) is null then
      v_missing := array_append(v_missing, v_table);
    else
      if not exists (
        select 1
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relname = v_table
          and c.relrowsecurity
      ) then
        v_rls_off := array_append(v_rls_off, v_table);
      end if;

      if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = v_table
          and column_name = 'tenant_id'
      ) then
        v_has_tenant_id := array_append(v_has_tenant_id, v_table);
      end if;
    end if;
  end loop;

  if cardinality(v_missing) > 0 then
    raise exception 'FAIL: expected operational tables missing: %', v_missing;
  end if;
  if cardinality(v_rls_off) > 0 then
    raise exception 'FAIL: RLS disabled on operational tables: %', v_rls_off;
  end if;
  if cardinality(v_has_tenant_id) > 0 then
    raise exception 'STOP: this is a pre-cutover check; tenant_id already exists on: %', v_has_tenant_id;
  end if;

  if not exists (
    select 1
    from private.tenants t
    join private.tenant_memberships m on m.tenant_id = t.id
    join public.app_user_roles r on r.user_id = m.user_id
    where t.slug = 'muhaimin-dairy-test2'
      and t.status = 'pending'
      and m.role = 'owner'
      and m.status = 'active'
      and r.role = 'main_admin'
  ) then
    raise exception 'FAIL: expected pending TEST 2 tenant and active Main Admin owner membership not found';
  end if;

  if exists (
    select 1 from public.farmers f
    left join public.branches b on b.id = f.branch_id
    where f.branch_id is not null and b.id is null
  ) then
    raise exception 'FAIL: orphan farmer branch reference detected';
  end if;

  if exists (
    select 1 from public.milk_collections m
    left join public.branches b on b.id = m.branch_id
    where b.id is null
  ) then
    raise exception 'FAIL: orphan milk collection branch reference detected';
  end if;

  if exists (
    select 1 from public.milk_collections m
    left join public.farmers f on f.id = m.farmer_id
    where m.farmer_id is not null and f.id is null
  ) then
    raise exception 'FAIL: orphan milk collection farmer reference detected';
  end if;

  if exists (
    select 1 from public.farmer_payments p
    left join public.farmers f on f.id = p.farmer_id
    where f.id is null
  ) then
    raise exception 'FAIL: orphan farmer payment reference detected';
  end if;
end;
$$;

select
  'PASS: operational schema is intact and remains pre-tenant-cutover' as result,
  (select count(*) from public.branches) as branches,
  (select count(*) from public.farmers) as farmers,
  (select count(*) from public.milk_collections) as milk_collections,
  (select count(*) from public.farmer_payments) as farmer_payments,
  (select count(*) from public.app_settings) as app_settings;
