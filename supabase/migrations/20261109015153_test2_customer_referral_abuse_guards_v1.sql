-- Prevent duplicate active invitations/acceptances and cap customer invitations at 20 per rolling 24 hours.
create unique index if not exists referral_invitations_one_active_invitee_phone
on public.referral_invitations(invitee_phone) where status in ('invited','accepted','verified');
create unique index if not exists referral_invitations_one_user_acceptance
on public.referral_invitations(invitee_user_id) where invitee_user_id is not null;
create or replace function private.referral_create_invitation(p_code text,p_invitee_phone text)
returns table(invitation_id uuid,status text) language plpgsql security definer
set search_path=pg_catalog,public,private,auth as $$
declare v_uid uuid:=auth.uid();v_code public.referral_codes%rowtype;v_phone text;v_own_phone text;v_id uuid;v_status text;v_daily_count integer;
begin
 if v_uid is null then raise exception 'Authentication required';end if;
 if private.current_app_role()<>'customer' then raise exception 'Customer account required';end if;
 v_phone:=public.referral_normalize_phone(p_invitee_phone);
 if length(v_phone) not between 10 and 11 then raise exception 'Enter a valid phone number';end if;
 select * into v_code from public.referral_codes where code=upper(trim(p_code)) and owner_user_id=v_uid and is_active=true;
 if v_code.id is null then raise exception 'Active referral code not found';end if;
 select public.referral_normalize_phone(phone) into v_own_phone from public.customer_profiles where user_id=v_uid;
 if v_own_phone is null then raise exception 'Complete your customer profile before inviting';end if;
 if v_own_phone=v_phone then raise exception 'Self-referral is not allowed';end if;
 select count(*) into v_daily_count from public.referral_invitations where inviter_user_id=v_uid and invited_at>now()-interval '24 hours';
 if v_daily_count>=20 then raise exception 'Daily invitation limit reached';end if;
 insert into public.referral_invitations(referral_code_id,inviter_user_id,invitee_phone,status)
 values(v_code.id,v_uid,v_phone,'invited') on conflict(referral_code_id,invitee_phone) do nothing
 returning id,referral_invitations.status into v_id,v_status;
 if v_id is null then raise exception 'This phone has already been invited';end if;
 invitation_id:=v_id;status:=v_status;return next;
end $$;
