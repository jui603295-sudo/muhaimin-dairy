-- Read-only catalog checks for TEST 2 referral lifecycle.
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('referral_codes','referral_invitations','referral_reward_ledger') order by 1;
select tablename,policyname,cmd,roles from pg_policies where schemaname='public' and tablename like 'referral_%' order by 1,2;
select grantee,table_name,privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name like 'referral_%' and grantee in ('anon','authenticated') order by 2,1,3;
select routine_name,grantee,privilege_type from information_schema.routine_privileges
where routine_schema='public' and routine_name like 'referral_%' and grantee in ('anon','authenticated') order by 1,2,3;
select trigger_name,event_manipulation,event_object_table from information_schema.triggers
where trigger_schema='public' and event_object_table='referral_reward_ledger';
-- Expected: all RLS true; no anon table/function privileges; customer mutations are RPC-only;
-- reward ledger has no UPDATE/DELETE grant and an immutable UPDATE/DELETE trigger.
-- JWT-level allow/deny and full browser E2E remain separate required tests.