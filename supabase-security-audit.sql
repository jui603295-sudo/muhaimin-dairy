-- Read-only security audit for Muhaimin Dairy.
-- Run in Supabase SQL Editor. These queries inspect metadata only; they do not alter data or policies.

-- 1) RLS status for public tables.
SELECT n.nspname AS schema_name,
       c.relname AS table_name,
       c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r','p')
ORDER BY c.relname;

-- 2) Every policy in public schema (roles, commands, USING and WITH CHECK).
SELECT schemaname, tablename, policyname, permissive, roles,
       cmd, qual AS using_expression, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3) Tables/columns that may already support user profiles or roles.
SELECT table_schema, table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name ILIKE '%role%'
       OR table_name ILIKE '%profile%'
       OR column_name ILIKE '%user_id%'
       OR column_name ILIKE '%role%'
       OR column_name ILIKE '%auth%')
ORDER BY table_name, ordinal_position;

-- 4) Table-level grants to anon/authenticated/public. This is metadata only.
SELECT table_schema, table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'PUBLIC')
ORDER BY table_name, grantee, privilege_type;

-- IMPORTANT: Review the results before designing a role migration.
-- Do not replace existing policies wholesale: preserve the Main Admin path and
-- test all new policies against a separate/non-production project first.
