-- Matches TEST 2 migration 20261109014306.
-- Admin-only row policies gate these UPDATE privileges; customer rows remain protected.
grant update on public.referral_codes, public.referral_invitations to authenticated;
