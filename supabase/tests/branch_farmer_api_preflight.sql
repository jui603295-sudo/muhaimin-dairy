-- TEST 2 only: read-only Branch/Farmer API implementation preflight.
-- This is a schema/security assertion, not a CRUD test. No DDL or DML.
-- Run with a privileged database connection against TEST 2 only.

do $$
declare
  v_missing text[] := array[]::text[];
  v_table text;
  v_col text;
begin
  foreach v_table in array array['branches','farmers','app_user_roles'] loop
    if to_regclass(format('public.%I', v_table)) is null then
      v_missing := array_append(v_missing, 'public.' || v_table);
    end if;
  end loop;
  if cardinality(v_missing) > 0 then
    raise exception 'FAIL: required tables missing: %', v_missing;
  end if;

  foreach v_col in array array['id','name','target_liters','status','latitude','longitude','location_accuracy_m','location_captured_at','photo_path'] loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='branches' and column_name=v_col
    ) then
      raise exception 'FAIL: public.branches.% missing', v_col;
    end if;
  end loop;

  foreach v_col in array array['id','name','mobile','branch_id','expected_liters','status','latitude','longitude','location_accuracy','location_captured_at','photo_path'] loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='farmers' and column_name=v_col
    ) then
      raise exception 'FAIL: public.farmers.% missing', v_col;
    end if;
  end loop;

  if not exists (
    select 1 from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public' and t.relname='farmers'
      and c.contype='f'
      and pg_get_constraintdef(c.oid) ilike '%branch_id%'
      and pg_get_constraintdef(c.oid) ilike '%branches%'
  ) then
    raise exception 'FAIL: farmer -> branch foreign key not found';
  end if;

  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='branches' and c.relrowsecurity
  ) then
    raise exception 'FAIL: branches RLS is disabled';
  end if;
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='farmers' and c.relrowsecurity
  ) then
    raise exception 'FAIL: farmers RLS is disabled';
  end if;

  if not exists (
    select 1 from private.tenants t
    join private.tenant_memberships m on m.tenant_id=t.id
    where t.slug='muhaimin-dairy-test2'
      and t.status='pending'
      and m.role='owner'
      and m.status='active'
  ) then
    raise exception 'FAIL: expected pending TEST 2 tenant and active owner membership not found';
  end if;
end;
$$;

select
  'PASS: Branch/Farmer API schema preflight; tenant remains pending' as result,
  (select count(*) from public.branches) as branch_rows,
  (select count(*) from public.farmers) as farmer_rows;
