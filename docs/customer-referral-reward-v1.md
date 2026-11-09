# Muhaimin Dairy — Customer Referral & Reward System v1

## Scope and integration
A separate Referral/Reward domain connected to Customer Management by Supabase Auth user IDs. It does not expose Main Admin operational dairy data to customer accounts. TEST 2 already contains `customer_profiles(user_id, full_name, phone, created_at, updated_at)`, customer-role assignment on Auth user creation, and customer-owned profile RLS.

## Customer workflow now implemented in the TEST 2 portal
- Customer registration/login through Supabase Auth.
- Customer profile completion with full name and phone.
- One referral code per customer, created through a server-side RPC.
- Share URL and QR code generated from the same TEST 2 referral URL.
- Manual invite by phone number; no automatic contact-book access.
- Invitee opens the referral link, registers/logs in, verifies email or phone, saves the matching phone in their customer profile, and accepts the invitation.
- Customer sees only their own invitations and reward ledger through RLS.

Portal: `referral.html?backend=test2`. It uses the TEST 2 project URL and publishable key only; it does not use the Production project.

## Main Admin workflow now implemented
- Admin-only invitation review, verification, and rejection.
- Admin-only referral-code activation/deactivation.
- Admin-only manual BDT ledger entry: credit, payout, reversal.
- Reward policy amount is intentionally not automated or preconfigured. Main Admin must decide the reward policy before issuing entries.

## Database and security
Tables: `referral_codes`, `referral_invitations`, `referral_reward_ledger`. All have RLS enabled. Customer row visibility is scoped to their own records; Main Admin has system-wide visibility. Public RPC endpoints are SECURITY INVOKER wrappers. Their SECURITY DEFINER implementations live in the non-API `private` schema, use fixed search paths, and perform explicit customer/Main Admin role checks. The reward ledger has no client INSERT/UPDATE/DELETE grants and has a private UPDATE/DELETE rejection trigger. Supabase Security Advisor no longer reports the referral RPCs as exposed SECURITY DEFINER functions. Corrections use new reversal entries. Anonymous users have no intended table or RPC access.

Phone matching normalizes Bangladesh-style local/international representations to the last 11 digits. A customer must have a verified Auth email or phone and a matching customer profile phone before accepting an invitation. The Main Admin verification action requires an explicit confirmation that invitee phone ownership was independently checked. Main Admin must perform that check before proceeding. Accounts created before the invitation, self-referrals, duplicate active invitations for the same phone, and duplicate acceptance by the same Auth user are rejected. Each customer is limited to 20 invitations per rolling 24 hours. Main Admin can reject a pending/accepted invitation to release its phone for a new referral.

## TEST 2 evidence so far
- Referral schema migrations applied successfully.
- RLS enabled on all three tables.
- RPC functions are present and marked SECURITY DEFINER.
- Append-only trigger exists for UPDATE and DELETE.
- Portal file added to the feature branch.
- This is catalog-level evidence only; a real customer JWT/browser flow has not yet been completed.

## Remaining acceptance gates
- Real customer registration, email verification, profile save/reload, code generation, invitation creation, QR scan and invite acceptance on Android.
- Two-customer isolation: customer A cannot read customer B's invitations or ledger.
- Main Admin JWT: verify accepted invitation, deactivate a code, post a reward; non-admin cannot perform those actions.
- Confirm no anonymous RPC/table access and no reward ledger UPDATE/DELETE.
- Confirm referral links preserve the referral code across Supabase email verification redirect.
- Confirm GitHub Actions CI is green and test the portal against the TEST 2 URL.

## Release status
The database foundation and initial customer/admin portal code are in TEST 2 feature work. The system is NOT production-ready and must not be advertised as operational until all JWT and end-to-end gates pass. No Production database changes, PR merge, or Production deployment have been made. Production activation remains a separate release gate.
