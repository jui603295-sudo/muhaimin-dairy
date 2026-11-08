-- TEST 2 only: backend tenant context resolver ACL and behavior smoke test.
-- Run using a privileged SQL session. Does not alter data.

do $$
declare
  v_user_id uuid;
  v_context jsonb;
  v_function record;
begin
  if has_function_privilege('anon', 'public.resolve_tenant_context_for_user(uuid)', 'EXECUTE') then
    raise exception 'FAIL: anon can execute tenant resolver';
  end if;
  if has_function_privilege('authenticated', 'public.resolve_tenant_context_for_user(uuid)', 'EXECUTE') then
    raise exception 'FAIL: authenticated can execute tenant resolver';
  end if;
  if not has_function_privilege('service_role', 'public.resolve_tenant_context_for_user(uuid)', 'EXECUTE') then
    raise exception 'FAIL: service_role cannot execute tenant resolver';
  end if;

  select m.user_id into v_user_id
  from private.tenant_memberships m
  join private.tenants t on t.id = m.tenant_id
  where t.slug = 'muhaimin-dairy-test2'
    and m.status = 'active'
    and m.role = 'owner'
  limit 1;

  if v_user_id is null then
    raise exception 'FAIL: TEST 2 owner membership not found';
  end if;

  v_context := public.resolve_tenant_context_for_user(v_user_id);

  if v_context->>'user_id' is distinct from v_user_id::text then
    raise exception 'FAIL: resolver user identity mismatch';
  end if;
  if v_context->>'platform_role' is distinct from 'main_admin' then
    raise exception 'FAIL: platform role mismatch';
  end if;
  if jsonb_array_length(v_context->'memberships') <> 1 then
    raise exception 'FAIL: unexpected TEST 2 membership count';
  end if;
  if v_context->'memberships'->0->>'tenant_status' is distinct from 'pending' then
    raise exception 'FAIL: TEST 2 tenant status unexpectedly changed';
  end if;
  if (v_context->'memberships'->0->>'can_operate')::boolean is distinct from false then
    raise exception 'FAIL: pending tenant was incorrectly marked operational';
  end if;

  select p.prosecdef, p.proconfig into v_function
  from pg_proc p
  where p.oid = 'public.resolve_tenant_context_for_user(uuid)'::regprocedure;

  if not v_function.prosecdef then
    raise exception 'FAIL: resolver is not SECURITY DEFINER';
  end if;
  if not ('search_path=pg_catalog, public, private' = any(v_function.proconfig)) then
    raise exception 'FAIL: resolver search_path is not pinned';
  end if;

  if (select count(*) from pg_policies where schemaname = 'public') <> 22 then
    raise exception 'FAIL: public RLS policy count changed';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name in ('branches','farmers','milk_collections')
      and column_name='tenant_id'
  ) then
    raise exception 'FAIL: operational tenant cutover was applied prematurely';
  end if;
end;
$$;

select 'PASS: tenant resolver ACL, pending-state behavior and cutover guard' as result;
