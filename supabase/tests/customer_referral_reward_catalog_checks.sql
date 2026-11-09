-- Read-only catalog acceptance checks for Referral & Reward schema (TEST 2).
-- These checks do not insert customer data and do not simulate a real JWT.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in ('referral_codes','referral_invitations','referral_reward_ledger')
order by c.relname;

select tablename, policyname, cmd, roles
from pg_policies
where schemaname='public' and tablename in
 ('referral_codes','referral_invitations','referral_reward_ledger')
order by tablename, policyname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and table_name in ('referral_codes','referral_invitations','referral_reward_ledger')
  and grantee in ('anon','authenticated')
order by table_name, grantee, privilege_type;

-- Expected:
-- * RLS is true on all three tables.
-- * anon has no table privileges.
-- * authenticated has SELECT/INSERT; UPDATE only on referral_codes and referral_invitations.
-- * referral_reward_ledger has no UPDATE or DELETE privilege.
-- Real JWT tests are still required for row-level allow/deny behavior.
