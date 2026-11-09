# Muhaimin Dairy — Customer Referral & Reward System v1

## Scope and integration
This is a separate Referral/Reward domain connected to Customer Management by Supabase Auth user IDs. It does not create or edit customer profiles automatically. The current TEST 2 schema already has `customer_profiles(user_id, full_name, phone, created_at, updated_at)` and a least-privilege `customer` app role.

## User journey
1. A signed-in customer creates one unique referral code.
2. The app builds a share URL from the canonical app origin and code. A QR encodes that same URL; the QR is a transport format, never proof of eligibility.
3. The inviter selects/enters a contact and sends an invitation. The server stores only the normalized phone needed to reconcile acceptance; contact-book access is never automatic.
4. A new customer follows the link, signs up/signs in, verifies their account through the configured Auth channel, and submits an acceptance request.
5. Main Admin verifies the invitation and binds it to the authenticated customer account. Self-referral, duplicate phone/code use, already-registered users, and inviter/invitee identity collisions must be rejected.
6. The inviter sees invitation status and their own reward ledger only. Main Admin sees system-wide referral operations.
7. Main Admin posts immutable credit/payout/reversal ledger entries. No customer or staff UI may edit or delete ledger rows.

## Database implemented in TEST 2
- `referral_codes`: one code per owner; unique code; active flag.
- `referral_invitations`: inviter, invitee phone/user, lifecycle status and verification audit fields.
- `referral_reward_ledger`: append-only BDT entries with credit/payout/reversal types.
- All three tables have RLS enabled. `anon` has no table privileges. Authenticated users have only SELECT/INSERT table grants; row policies restrict customers to their own rows and Main Admin to admin operations. Reward rows have no UPDATE/DELETE grants or policies.

## Reward policy is intentionally not hard-coded
No monetary amount, eligibility threshold, expiry, or payout schedule is enabled by this foundation. Main Admin must configure and approve a written reward policy before rewards can be issued. AI or automated logic cannot authorize payments.

## Current release status
Database foundation is applied to TEST 2 and represented by a migration in this feature branch. The following are NOT complete yet: customer-facing screen, Main Admin referral console, QR rendering, invitation acceptance/verification workflow, server-side duplicate/self-referral checks, real JWT allow/deny tests, and end-to-end Android tests. Therefore Referral is NOT live and must not be advertised as operational.

## Required next implementation gates
- Add a customer route that does not expose Main Admin business modules.
- Add a Main Admin-only console for invitation review and immutable ledger posting.
- Implement trusted server-side acceptance/verification, with no client-controlled identity binding.
- Test anonymous deny; customer own-row allow/other-customer deny; Main Admin system-wide allow; no ledger UPDATE/DELETE; duplicate/self-referral rejection.
- Test referral link + QR on Android, sign-up/verification, invite acceptance, admin verification, reward posting, reload and audit trail.
- Keep TEST 2 only until all evidence is reviewed. Production activation requires separate explicit approval.
