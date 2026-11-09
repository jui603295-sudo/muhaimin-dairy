-- Move SECURITY DEFINER business functions and append-only trigger helper out of exposed public schema.
-- Keep only SECURITY INVOKER wrappers in public for authenticated PostgREST RPC access.
alter function public.referral_ensure_code() set schema private;
alter function public.referral_create_invitation(text,text) set schema private;
alter function public.referral_accept_invitation(text) set schema private;
alter function public.referral_admin_verify(uuid) set schema private;
alter function public.referral_admin_set_code_active(uuid,boolean) set schema private;
alter function public.referral_admin_post_reward(uuid,text,numeric,text) set schema private;
grant usage on schema private to authenticated;
revoke all on function private.referral_ensure_code() from public,anon;
revoke all on function private.referral_create_invitation(text,text) from public,anon;
revoke all on function private.referral_accept_invitation(text) from public,anon;
revoke all on function private.referral_admin_verify(uuid) from public,anon;
revoke all on function private.referral_admin_set_code_active(uuid,boolean) from public,anon;
revoke all on function private.referral_admin_post_reward(uuid,text,numeric,text) from public,anon;
grant execute on function private.referral_ensure_code() to authenticated;
grant execute on function private.referral_create_invitation(text,text) to authenticated;
grant execute on function private.referral_accept_invitation(text) to authenticated;
grant execute on function private.referral_admin_verify(uuid) to authenticated;
grant execute on function private.referral_admin_set_code_active(uuid,boolean) to authenticated;
grant execute on function private.referral_admin_post_reward(uuid,text,numeric,text) to authenticated;
alter function public.referral_reward_ledger_immutable() set schema private;
revoke all on function private.referral_reward_ledger_immutable() from public,anon,authenticated;
create or replace function public.referral_ensure_code() returns table(referral_code_id uuid,code text)
language sql security invoker set search_path=pg_catalog,public,private,auth as $$ select * from private.referral_ensure_code() $$;
create or replace function public.referral_create_invitation(p_code text,p_invitee_phone text) returns table(invitation_id uuid,status text)
language sql security invoker set search_path=pg_catalog,public,private,auth as $$ select * from private.referral_create_invitation(p_code,p_invitee_phone) $$;
create or replace function public.referral_accept_invitation(p_code text) returns table(invitation_id uuid,status text)
language sql security invoker set search_path=pg_catalog,public,private,auth as $$ select * from private.referral_accept_invitation(p_code) $$;
create or replace function public.referral_admin_verify(p_invitation_id uuid) returns public.referral_invitations
language sql security invoker set search_path=pg_catalog,public,private,auth as $$ select private.referral_admin_verify(p_invitation_id) $$;
create or replace function public.referral_admin_set_code_active(p_code_id uuid,p_active boolean) returns boolean
language sql security invoker set search_path=pg_catalog,public,private,auth as $$ select private.referral_admin_set_code_active(p_code_id,p_active) $$;
create or replace function public.referral_admin_post_reward(p_invitation_id uuid,p_entry_type text,p_amount numeric,p_description text default null) returns uuid
language sql security invoker set search_path=pg_catalog,public,private,auth as $$ select private.referral_admin_post_reward(p_invitation_id,p_entry_type,p_amount,p_description) $$;
revoke all on function public.referral_ensure_code() from public,anon;
revoke all on function public.referral_create_invitation(text,text) from public,anon;
revoke all on function public.referral_accept_invitation(text) from public,anon;
revoke all on function public.referral_admin_verify(uuid) from public,anon;
revoke all on function public.referral_admin_set_code_active(uuid,boolean) from public,anon;
revoke all on function public.referral_admin_post_reward(uuid,text,numeric,text) from public,anon;
grant execute on function public.referral_ensure_code() to authenticated;
grant execute on function public.referral_create_invitation(text,text) to authenticated;
grant execute on function public.referral_accept_invitation(text) to authenticated;
grant execute on function public.referral_admin_verify(uuid) to authenticated;
grant execute on function public.referral_admin_set_code_active(uuid,boolean) to authenticated;
grant execute on function public.referral_admin_post_reward(uuid,text,numeric,text) to authenticated;
