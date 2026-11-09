create or replace function private.referral_admin_reject(p_invitation_id uuid,p_reason text default null)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,private,auth as $$
begin
 if auth.uid() is null or private.current_app_role()<>'main_admin' then raise exception 'Main Admin only';end if;
 update public.referral_invitations set status='rejected',notes=nullif(trim(p_reason),'')
 where id=p_invitation_id and status in ('invited','accepted');
 if not found then raise exception 'Only pending or accepted invitations can be rejected';end if;
 return true;
end $$;
revoke all on function private.referral_admin_reject(uuid,text) from public,anon;
grant execute on function private.referral_admin_reject(uuid,text) to authenticated;
create or replace function public.referral_admin_reject(p_invitation_id uuid,p_reason text default null)
returns boolean language sql security invoker set search_path=pg_catalog,public,private,auth as $$ select private.referral_admin_reject(p_invitation_id,p_reason) $$;
revoke all on function public.referral_admin_reject(uuid,text) from public,anon;
grant execute on function public.referral_admin_reject(uuid,text) to authenticated;
