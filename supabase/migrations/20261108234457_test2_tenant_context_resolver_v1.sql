-- TEST 2 only: trusted backend resolver for tenant context.
-- Browser roles cannot execute this function. The Edge Function verifies the user's JWT
-- before invoking it with the authenticated user UUID using service_role.

create or replace function public.resolve_tenant_context_for_user(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select jsonb_build_object(
    'user_id', p_user_id,
    'platform_role', (
      select r.role
      from public.app_user_roles r
      where r.user_id = p_user_id
      limit 1
    ),
    'memberships', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'tenant_id', t.id,
          'tenant_slug', t.slug,
          'tenant_name', t.name,
          'tenant_status', t.status,
          'membership_role', m.role,
          'membership_status', m.status,
          'can_operate', (t.status = 'active' and m.status = 'active')
        )
        order by t.created_at, t.id
      )
      from private.tenant_memberships m
      join private.tenants t on t.id = m.tenant_id
      where m.user_id = p_user_id
        and m.status = 'active'
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.resolve_tenant_context_for_user(uuid) from public, anon, authenticated;
grant execute on function public.resolve_tenant_context_for_user(uuid) to service_role;

comment on function public.resolve_tenant_context_for_user(uuid) is
'Backend-only tenant context resolver. Call only after Edge Function validates the caller JWT. Does not grant operational access or write authority.';
