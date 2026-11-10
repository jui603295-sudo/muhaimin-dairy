-- Muhaimin Dairy TEST 2 only
-- Explicitly remove inherited non-essential table privileges from authenticated.
-- RLS already has no DELETE policy; this also removes the table-level DELETE grant.

begin;
revoke delete, truncate, references, trigger on table public.customer_profiles from authenticated;
grant select, insert, update on table public.customer_profiles to authenticated;
revoke all on table public.customer_profiles from anon, public;
commit;
