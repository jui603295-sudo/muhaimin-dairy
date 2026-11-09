create or replace function private.referral_accept_invitation(p_code text)
returns table(invitation_id uuid,status text) language plpgsql security definer
set search_path=pg_catalog,public,private,auth as $$
declare v_uid uuid:=auth.uid();v_phone text;v_confirmed boolean;v_inv public.referral_invitations%rowtype;v_created timestamptz;
begin
 if v_uid is null then raise exception 'Authentication required';end if;
 if private.current_app_role()<>'customer' then raise exception 'Customer account required';end if;
 select (email_confirmed_at is not null or phone_confirmed_at is not null),created_at into v_confirmed,v_created from auth.users where id=v_uid;
 if not coalesce(v_confirmed,false) then raise exception 'Verify your email or phone before accepting an invitation';end if;
 select public.referral_normalize_phone(phone) into v_phone from public.customer_profiles where user_id=v_uid;
 if v_phone is null or length(v_phone) not between 10 and 11 then raise exception 'Complete your customer profile with the invited phone number first';end if;
 select i.* into v_inv from public.referral_invitations i join public.referral_codes c on c.id=i.referral_code_id
 where c.code=upper(trim(p_code)) and i.invitee_phone=v_phone and i.status='invited' for update of i;
 if v_inv.id is null then raise exception 'No matching pending invitation was found';end if;
 if v_inv.inviter_user_id=v_uid then raise exception 'Self-referral is not allowed';end if;
 if v_created<=v_inv.invited_at then raise exception 'Only customers registered after the invitation can accept this referral';end if;
 update public.referral_invitations set invitee_user_id=v_uid,status='accepted',accepted_at=now() where id=v_inv.id;
 invitation_id:=v_inv.id;status:='accepted';return next;
end $$;
