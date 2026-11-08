# Customer Portal — TEST 2 verification evidence v1

Date: 2026-11-09
Environment: Supabase TEST 2 project `wpomsmvzylrembojdsxd`
Code branch: `feat/customer-portal-foundation-v1`
Pull request: #84 (Draft; not merged)

## 1. Database migration

Applied in TEST 2:
- `customer_profile_foundation_v1`
- `customer_profile_privilege_hardening_v1`

Verified:
- `public.customer_profiles` exists with `user_id`, `full_name`, `phone`, `created_at`, `updated_at`.
- RLS is enabled.
- Owner-scoped SELECT, INSERT, UPDATE policies require `auth.uid() = user_id` and `app_user_roles.role = 'customer'`.
- `customer_profiles_set_updated_at` trigger exists.
- Authenticated table grants: SELECT/INSERT/UPDATE only.
- Authenticated DELETE and TRUNCATE privileges are false.
- Anonymous SELECT and INSERT privileges are false; an anon-role SELECT attempt returned PostgreSQL permission denied.
- No DELETE policy exists.

## 2. Role and RLS checks

- The existing Auth user inventory contains one user, assigned `main_admin`; there are currently no Customer test accounts.
- The `auth.users` trigger `muhaimin_assign_customer_role` is present and invokes `assign_default_customer_role`.
- Simulated a request as PostgreSQL role `authenticated` with the existing Main Admin user ID in the JWT subject claim. Querying `customer_profiles` returned zero rows, as expected because the Main Admin is not a Customer.
- This is a database role/RLS simulation, not a real browser session or independently signed Customer JWT.

## 3. Frontend source checks

Reviewed the PR branch source:
- Customer Portal is mounted only when the verified role is `customer`.
- Customer route is handled before the Main Admin fallback.
- The Customer route hides the operational app and returns before the Main Admin `loadAll()` call.
- Profile read is filtered by the authenticated user's ID.
- Profile upsert uses the authenticated user's ID and database RLS remains the enforcement boundary.
- The catalogue contains 15 future feature areas, all marked OFF and without activation/transaction handlers.
- The existing login UI includes email/password registration; the Auth trigger assigns the default customer role to newly registered users.

## 4. CI / preview

- GitHub combined status for the current PR head reports Vercel: success.
- This is a deployment status only. No interactive browser test has been performed by this verification.

## 5. Remaining tests — required before calling Customer Portal verified

1. Register/verify Customer A and Customer B using the TEST 2 preview only.
2. Sign in as Customer A; confirm Customer Portal opens and Main Admin operational pages/data are absent.
3. Save profile A, reload the page, and confirm profile A persists.
4. Attempt to query/update Customer B's profile while signed in as A; expect no row/denial and no data change.
5. Sign in as Customer B; confirm B can access only B's profile.
6. Sign out and test anon API access; expect denial.
7. Sign in as Main Admin; confirm the existing operational workspace still loads and works.
8. Repeat after a clean browser reload.

## 6. Safety boundaries

- No Production SQL, data, Auth users, Storage objects, or settings were changed.
- No Customer test users were created by this verification.
- No PR merge or Production deployment was performed.
- Orders, payments, subscriptions, AI, KYC and all other future business features remain OFF.

## 7. Support and feature-request architecture status

- Customer Support & Communication System is specified as a first-class portal capability with a Main Admin Support Inbox, customer-owned tickets, customer-visible replies, internal-only notes, controlled attachments, notification adapters and audit events.
- Customer-requested feature activation is specified as a separate review/approval/configuration workflow. A support ticket or feature request never activates a capability by itself.
- These are architecture decisions only. No support ticket schema, feature-request schema, Admin Settings controls, inbox UI, notification workflow or activation endpoint is asserted to exist or to have been tested by this evidence record.
- All future capabilities remain OFF until the full server-side authorization, configuration, audit and TEST 2 acceptance gates are implemented and verified.