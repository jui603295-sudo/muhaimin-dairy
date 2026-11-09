-- Server-authoritative customer referral lifecycle. TEST 2 only.
revoke insert, update, delete on public.referral_codes from authenticated;
revoke insert, update, delete on public.referral_invitations from authenticated;
revoke insert, update, delete on public.referral_reward_ledger from authenticated;
drop policy if exists referral_codes_customer_insert_own on public.referral_codes;
drop policy if exists referral_invitations_customer_insert_own on public.referral_invitations;
create or replace function public.referral_normalize_phone(p_phone text) returns text
language sql immutable set search_path=pg_catalog as $$
 select case when length(regexp_replace(coalesce(p_phone,''),'[^0-9]','','g'))>=11
 then right(regexp_replace(coalesce(p_phone,''),'[^0-9]','','g'),11)
 else regexp_replace(coalesce(p_phone,''),'[^0-9]','','g') end $$;
create or replace function public.referral_ensure_code()
returns table(referral_code_id uuid,code text) language plpgsql security definer
set search_path=pg_catalog,public,private,auth as $$
declare v_uid uuid:=auth.uid();v_id uuid;v_code text;
begin
 if v_uid is null then raise exception 'Authentication required';end if;
 if private.current_app_role()<>'customer' then raise exception 'Customer account required';end if;
 select id,rc.code into v_id,v_code from public.referral_codes rc where owner_user_id=v_uid;
 if v_id is null then
  v_code:=upper(substr(encode(gen_random_bytes(8),'hex'),1,12));
  insert into public.referral_codes(owner_user_id,code) values(v_uid,v_code)
  on conflict(owner_user_id) do nothing returning id,public.referral_codes.code into v_id,v_code;
  if v_id is null then select id,rc.code into v_id,v_code from public.referral_codes rc where owner_user_id=v_uid;end if;
 end if;
 return query select v_id,v_code;
end $$;
create or replace function public.referral_create_invitation(p_code text,p_invitee_phone text)
returns table(invitation_id uuid,status text) language plpgsql security definer
set search_path=pg_catalog,public,private,auth as $$
declare v_uid uuid:=auth.uid();v_code public.referral_codes%rowtype;v_phone text;v_own_phone text;v_id uuid;v_status text;
begin
 if v_uid is null then raise exception 'Authentication required';end if;
 if private.current_app_role()<>'customer' then raise exception 'Customer account required';end if;
 v_phone:=public.referral_normalize_phone(p_invitee_phone);
 if length(v_phone) not between 10 and 11 then raise exception 'Enter a valid phone number';end if;
 select * into v_code from public.referral_codes where code=upper(trim(p_code)) and owner_user_id=v_uid and is_active=true;
 if v_code.id is null then raise exception 'Active referral code not found';end if;
 select public.referral_normalize_phone(phone) into v_own_phone from public.customer_profiles where user_id=v_uid;
 if v_own_phone is not null and v_own_phone=v_phone then raise exception 'Self-referral is not allowed';end if;
 insert into public.referral_invitations(referral_code_id,inviter_user_id,invitee_phone,status)
 values(v_code.id,v_uid,v_phone,'invited') on conflict(referral_code_id,invitee_phone) do nothing
 returning id,referral_invitations.status into v_id,v_status;
 if v_id is null then raise exception 'This phone has already been invited with this code';end if;
 invitation_id:=v_id;status:=v_status;return next;
end $$;
create or replace function public.referral_accept_invitation(p_code text)
returns table(invitation_id uuid,status text) language plpgsql security definer
set search_path=pg_catalog,public,private,auth as $$
declare v_uid uuid:=auth.uid();v_phone text;v_confirmed boolean;v_inv public.referral_invitations%rowtype;
begin
 if v_uid is null then raise exception 'Authentication required';end if;
 if private.current_app_role()<>'customer' then raise exception 'Customer account required';end if;
 select (email_confirmed_at is not null or phone_confirmed_at is not null) into v_confirmed from auth.users where id=v_uid;
 if not coalesce(v_confirmed,false) then raise exception 'Verify your email or phone before accepting an invitation';end if;
 select public.referral_normalize_phone(phone) into v_phone from public.customer_profiles where user_id=v_uid;
 if v_phone is null or length(v_phone) not between 10 and 11 then raise exception 'Complete your customer profile with the invited phone number first';end if;
 select i.* into v_inv from public.referral_invitations i join public.referral_codes c on c.id=i.referral_code_id
 where c.code=upper(trim(p_code)) and i.invitee_phone=v_phone and i.status='invited' for update of i;
 if v_inv.id is null then raise exception 'No matching pending invitation was found';end if;
 if v_inv.inviter_user_id=v_uid then raise exception 'Self-referral is not allowed';end if;
 update public.referral_invitations set invitee_user_id=v_uid,status='accepted',accepted_at=now() where id=v_inv.id;
 invitation_id:=v_inv.id;status:='accepted';return next;
end $$;
create or replace function public.referral_admin_verify(p_invitation_id uuid)
returns public.referral_invitations language plpgsql security definer set search_path=pg_catalog,public,private,auth as $$
declare v_row public.referral_invitations%rowtype;
begin
 if auth.uid() is null or private.current_app_role()<>'main_admin' then raise exception 'Main Admin only';end if;
 update public.referral_invitations set status='verified',verified_at=now(),verified_by=auth.uid()
 where id=p_invitation_id and status='accepted' returning * into v_row;
 if v_row.id is null then raise exception 'Only accepted invitations can be verified';end if;return v_row;
end $$;
create or replace function public.referral_admin_set_code_active(p_code_id uuid,p_active boolean)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,private,auth as $$
begin
 if auth.uid() is null or private.current_app_role()<>'main_admin' then raise exception 'Main Admin only';end if;
 update public.referral_codes set is_active=p_active where id=p_code_id;
 if not found then raise exception 'Referral code not found';end if;return true;
end $$;
create or replace function public.referral_admin_post_reward(p_invitation_id uuid,p_entry_type text,p_amount numeric,p_description text default null)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,private,auth as $$
declare v_inv public.referral_invitations%rowtype;v_id uuid;
begin
 if auth.uid() is null or private.current_app_role()<>'main_admin' then raise exception 'Main Admin only';end if;
 if p_entry_type not in ('credit','payout','reversal') then raise exception 'Invalid ledger entry type';end if;
 if p_amount is null or p_amount<=0 or p_amount>100000000 then raise exception 'Invalid reward amount';end if;
 select * into v_inv from public.referral_invitations where id=p_invitation_id and status='verified';
 if v_inv.id is null then raise exception 'Invitation must be verified before reward posting';end if;
 insert into public.referral_reward_ledger(invitation_id,beneficiary_user_id,entry_type,amount,currency,description,created_by)
 values(v_inv.id,v_inv.inviter_user_id,p_entry_type,p_amount,'BDT',nullif(trim(p_description),''),auth.uid()) returning id into v_id;
 return v_id;
end $$;
create or replace function public.referral_reward_ledger_immutable()
returns trigger language plpgsql set search_path=pg_catalog,public as $$
begin raise exception 'Reward ledger is append-only; add a reversal entry instead';end $$;
drop trigger if exists referral_reward_ledger_no_mutation on public.referral_reward_ledger;
create trigger referral_reward_ledger_no_mutation before update or delete on public.referral_reward_ledger
for each row execute function public.referral_reward_ledger_immutable();
revoke all on function public.referral_normalize_phone(text) from public,anon,authenticated;
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
