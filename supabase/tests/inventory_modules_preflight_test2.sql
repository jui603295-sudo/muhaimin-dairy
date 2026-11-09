-- Muhaimin Dairy TEST 2 only — read-only Feed/Agro/Veterinary preflight
-- Safe to run repeatedly. This script contains SELECT statements only.
-- It does not change schema, data, policies, triggers, or tenant status.

with expected_tables(table_name) as (
  values
    ('feed_products'),('feed_purchases'),('feed_sales'),
    ('agro_products'),('agro_purchases'),('agro_sales'),
    ('vet_companies'),('vet_products'),('vet_purchases'),('vet_sales')
),
expected_columns(table_name,column_name,reason) as (
  values
    ('feed_purchases','purchase_time','transaction timestamp parity'),
    ('feed_purchases','batch_number','lot-level traceability'),
    ('feed_purchases','expiry_date','lot-level expiry'),
    ('feed_purchases','note','transaction notes'),
    ('feed_purchases','total_amount','required purchase amount'),
    ('feed_purchases','due_amount','required purchase balance'),
    ('feed_sales','sale_time','transaction timestamp parity'),
    ('feed_sales','note','transaction notes'),
    ('feed_sales','total_amount','required sale amount'),
    ('feed_sales','due_amount','required sale balance'),
    ('agro_purchases','purchase_time','transaction timestamp parity'),
    ('agro_purchases','batch_number','lot-level traceability'),
    ('agro_purchases','expiry_date','lot-level expiry where applicable'),
    ('agro_purchases','note','transaction notes'),
    ('agro_purchases','total_amount','required purchase amount'),
    ('agro_purchases','due_amount','required purchase balance'),
    ('agro_sales','sale_time','transaction timestamp parity'),
    ('agro_sales','note','transaction notes'),
    ('agro_sales','total_amount','required sale amount'),
    ('agro_sales','due_amount','required sale balance'),
    ('vet_purchases','purchase_time','transaction timestamp parity'),
    ('vet_purchases','batch_no','lot-level traceability'),
    ('vet_purchases','expiry_date','lot-level expiry'),
    ('vet_purchases','note','transaction notes'),
    ('vet_purchases','total_amount','required purchase amount'),
    ('vet_purchases','due_amount','required purchase balance'),
    ('vet_sales','sale_time','transaction timestamp parity'),
    ('vet_sales','note','transaction notes'),
    ('vet_sales','total_amount','required sale amount'),
    ('vet_sales','due_amount','required sale balance')
),
table_checks as (
  select 'table'::text as check_type, e.table_name as object_name,
         case when to_regclass('public.'||e.table_name) is null then 'missing' else 'present' end as observed,
         case when to_regclass('public.'||e.table_name) is null then 'FAIL' else 'PASS' end as status
  from expected_tables e
),
security_checks as (
  select 'rls'::text, e.table_name,
         case when c.oid is null then 'table missing'
              when c.relrowsecurity then 'enabled'
              else 'disabled' end,
         case when c.oid is not null and c.relrowsecurity then 'PASS' else 'FAIL' end
  from expected_tables e
  left join pg_class c on c.oid=to_regclass('public.'||e.table_name)
),
tenant_checks as (
  select 'tenant_binding'::text, e.table_name,
         case when exists (
           select 1 from information_schema.columns c
           where c.table_schema='public' and c.table_name=e.table_name and c.column_name='tenant_id'
         ) then 'tenant_id present' else 'tenant_id absent — tenant isolation not implemented' end,
         'INFO'::text
  from expected_tables e
),
branch_checks as (
  select 'branch_binding'::text, e.table_name,
         case when exists (
           select 1 from information_schema.columns c
           where c.table_schema='public' and c.table_name=e.table_name and c.column_name='branch_id'
         ) then 'branch_id present' else 'branch_id absent — branch stock scope not implemented' end,
         'INFO'::text
  from expected_tables e
),
column_checks as (
  select 'required_or_planned_column'::text,
         e.table_name||'.'||e.column_name,
         case when exists (
           select 1 from information_schema.columns c
           where c.table_schema='public' and c.table_name=e.table_name and c.column_name=e.column_name
         ) then 'present'
         else 'missing — '||e.reason end,
         case when exists (
           select 1 from information_schema.columns c
           where c.table_schema='public' and c.table_name=e.table_name and c.column_name=e.column_name
         ) then 'PASS' else 'GAP' end
  from expected_columns e
),
policy_checks as (
  select 'rls_policy'::text, e.table_name,
         coalesce(string_agg(p.policyname||' ['||p.cmd||']', ', ' order by p.policyname),'no policy found'),
         case when count(p.policyname)>0 then 'INFO' else 'GAP' end
  from expected_tables e
  left join pg_policies p on p.schemaname='public' and p.tablename=e.table_name
  group by e.table_name
),
trigger_checks as (
  select 'before_insert_trigger'::text, e.table_name,
         coalesce(string_agg(t.trigger_name, ', '),'none'),
         'INFO'::text
  from expected_tables e
  left join information_schema.triggers t
    on t.event_object_schema='public'
   and t.event_object_table=e.table_name
   and t.action_timing='BEFORE'
   and t.event_manipulation='INSERT'
  group by e.table_name
)
select * from table_checks
union all select * from security_checks
union all select * from tenant_checks
union all select * from branch_checks
union all select * from column_checks
union all select * from policy_checks
union all select * from trigger_checks
order by check_type, object_name;
