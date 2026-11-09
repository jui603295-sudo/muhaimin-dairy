create or replace function public.referral_ensure_code()
returns table(referral_code_id uuid,code text) language plpgsql security definer
set search_path=pg_catalog,public,private,auth,extensions as $$
declare v_uid uuid:=auth.uid();v_id uuid;v_code text;
begin
 if v_uid is null then raise exception 'Authentication required';end if;
 if private.current_app_role()<>'customer' then raise exception 'Customer account required';end if;
 select id,rc.code into v_id,v_code from public.referral_codes rc where owner_user_id=v_uid;
 if v_id is null then
  v_code:=upper(substr(encode(extensions.gen_random_bytes(8),'hex'),1,12));
  insert into public.referral_codes(owner_user_id,code) values(v_uid,v_code)
  on conflict(owner_user_id) do nothing returning id,public.referral_codes.code into v_id,v_code;
  if v_id is null then select id,rc.code into v_id,v_code from public.referral_codes rc where owner_user_id=v_uid;end if;
 end if;
 return query select v_id,v_code;
end $$;
