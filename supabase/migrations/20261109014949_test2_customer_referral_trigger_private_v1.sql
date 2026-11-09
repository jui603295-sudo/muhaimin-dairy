alter function public.referral_reward_ledger_immutable() set schema private;
revoke all on function private.referral_reward_ledger_immutable() from public,anon,authenticated;
