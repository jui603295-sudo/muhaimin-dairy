-- Muhaimin Dairy TEST 2 only
-- Customer Profile RLS InitPlan optimization v1
-- Preserves the existing owner + customer-role authorization predicates.
-- Wrap auth.uid() in scalar subqueries so PostgreSQL can evaluate it once per
-- statement rather than once per row where the planner can use an InitPlan.

begin;

drop policy if exists customer_profiles_select_own on public.customer_profiles;
create policy customer_profiles_select_own
on public.customer_profiles
for select to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.app_user_roles r
    where r.user_id = (select auth.uid())
      and r.role = 'customer'
  )
);

drop policy if exists customer_profiles_insert_own on public.customer_profiles;
create policy customer_profiles_insert_own
on public.customer_profiles
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.app_user_roles r
    where r.user_id = (select auth.uid())
      and r.role = 'customer'
  )
);

drop policy if exists customer_profiles_update_own on public.customer_profiles;
create policy customer_profiles_update_own
on public.customer_profiles
for update to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.app_user_roles r
    where r.user_id = (select auth.uid())
      and r.role = 'customer'
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.app_user_roles r
    where r.user_id = (select auth.uid())
      and r.role = 'customer'
  )
);

commit;
