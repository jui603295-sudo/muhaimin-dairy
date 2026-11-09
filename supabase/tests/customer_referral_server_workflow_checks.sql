-- TEST 2 Referral security catalog checks (read-only).
-- 1) RLS must be enabled on each exposed table.
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('referral_codes','referral_invitations','referral_reward_ledger') order by 1;
-- 2) Authenticated clients have SELECT only on ledger tables; no anon table grants.
select grantee,table_name,privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name like 'referral_%' and grantee in ('anon','authenticated') order by 2,1,3;
-- 3) Exposed public RPC wrappers must be SECURITY INVOKER.
select proname,prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and proname in ('referral_ensure_code','referral_create_invitation','referral_accept_invitation','referral_admin_verify','referral_admin_set_code_active','referral_admin_post_reward') order by 1;
-- 4) SECURITY DEFINER implementation must be in private schema only.
select proname,prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='private' and proname like 'referral_%' order by 1;
-- 5) Only authenticated can execute private business functions; no PUBLIC/anon execution.
select routine_name,grantee,privilege_type from information_schema.routine_privileges
where routine_schema='private' and routine_name like 'referral_%' order by 1,2,3;
-- 6) Reward ledger must reject UPDATE and DELETE at trigger level.
select trigger_name,event_manipulation,event_object_table from information_schema.triggers
where trigger_schema='public' and event_object_table='referral_reward_ledger' order by 1,2;
-- 7) Public mutation RPCs must not be executable by anon or PUBLIC.
select routine_name,grantee,privilege_type from information_schema.routine_privileges
where routine_schema='public' and routine_name like 'referral_%' and grantee in ('anon','PUBLIC') order by 1,2;
-- Catalog checks do not replace real JWT and browser tests.