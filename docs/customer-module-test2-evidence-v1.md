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

## 8. Read-only support / feature architecture schema audit

Performed a read-only catalog audit in TEST 2 (`wpomsmvzylrembojdsxd`) before planning support and feature-request storage.

### Findings
- Matching public tables found: `customer_profiles`, `audit_events`, and `audit_log`. No table names matching support, ticket, message, feature, or notification were found in the `public` or `private` schemas searched.
- `customer_profiles` contains `user_id`, `full_name`, `phone`, `created_at`, `updated_at`; RLS is enabled with customer-owner SELECT/INSERT/UPDATE policies.
- `audit_events` and `audit_log` have the same eight-column shape: `id`, `table_name`, `record_id`, `action`, `actor_user_id`, `changed_at`, `old_data`, `new_data`.
- Their authorization models differ: `audit_events` has a Main Admin SELECT policy; `audit_log` has a Main Admin ALL policy. Both tables have broad table-level grants to `authenticated`, but RLS remains an additional row-level gate.
- Existing trigger functions write to these audit tables: `log_milk_collection_change()` writes to `audit_events`; `write_audit_log()` writes to `audit_log`. Both are SECURITY DEFINER. Their existing behavior must be preserved and reviewed before reuse or modification.
- Existing private Storage buckets found are `muhaimin-branch-photos` and `muhaimin-farmer-photos`; no customer-support attachment bucket was found in the bucket inventory.
- TEST 2 migration history includes the two Customer Profile migrations applied earlier. No support/feature-request migration is present.
- Security Advisor returned one warning: Leaked Password Protection is disabled. This was not changed as part of this audit.

### Design consequences
- Do not repurpose either existing audit table as the ticket/message store. Support needs first-class ticket and message ownership, visibility boundaries, status lifecycle and attachment references.
- Do not assume `audit_log` is immutable: its current Main Admin ALL policy includes row-level mutation rights. Any future append-only support/feature audit design needs explicit INSERT-only server-side writing and no client UPDATE/DELETE/TRUNCATE path.
- Before any migration, trace all triggers attached to `audit_log` and `audit_events`, inspect function grants/search_path and confirm exact table coverage. Preserve current milk-collection audit behavior.
- The support attachment bucket, if approved later, must be private and use explicit per-ticket authorization. Do not upload support files to the existing branch/farmer buckets.
- No schema, policy, function, Storage bucket, Auth setting or data was changed by this read-only audit.

## 9. Audit limitations and next gate

- This was a targeted catalog inventory, not a complete application-wide security audit or real Customer browser/JWT test.
- Before writing migrations, inspect trigger attachment inventory, all relevant function grants and exact current support-related frontend routes. Then prepare a separate schema proposal with RLS matrix, migration/rollback plan and tests.
- No support UI, Support Inbox, feature activation UI/API, or notification delivery has been implemented or tested by this audit.

## 10. Audit trigger and function permission follow-up

A follow-up read-only catalog query inspected all non-internal triggers whose source tables or trigger functions are audit-related, plus EXECUTE privileges for the two existing audit writers.

Verified in TEST 2:
- `write_audit_log()` is attached to 16 existing source tables: `agro_products`, `agro_purchases`, `agro_sales`, `app_settings`, `app_users`, `branches`, `farmer_payments`, `farmers`, `feed_products`, `feed_purchases`, `feed_sales`, `milk_collections`, `vet_companies`, `vet_products`, `vet_purchases`, and `vet_sales`.
- `write_audit_log()` is owned by `postgres`, is SECURITY DEFINER, and has `search_path=public, pg_temp`. EXECUTE is granted to `postgres` and `service_role`; `anon` and `authenticated` do not have EXECUTE.
- `log_milk_collection_change()` is owned by `postgres`, is SECURITY DEFINER, and has an empty search_path setting. EXECUTE is granted to `postgres` and `service_role`; `anon` and `authenticated` do not have EXECUTE.
- The first narrowly filtered trigger query returned no rows because the existing audit writer triggers are attached to business source tables, not to the audit destination tables themselves. The broader query above identified the actual trigger coverage.

Design consequence:
- These audit functions are privileged infrastructure and must not be casually changed or called directly from customer clients.
- Any future extension must preserve existing source-table trigger behavior and re-run the existing Branch/Farmer/Milk Collection/Agro/Feed/Veterinary audit regression checks.
- This follow-up was read-only. No function, trigger, grant, table, policy, Storage bucket, Auth setting or data was changed.

## 11. Next implementation gate

The logical support/feature schema and RLS matrix are now documented in the architecture specification as a proposal only. Before any TEST 2 migration, the next work is to review current frontend route/API patterns and the exact existing role/permission helpers, then prepare a migration-by-migration implementation plan with test cases and rollback steps. No schema migration has been applied for Support, Feature Requests or Notifications.

## 12. Auth troubleshooting and Customer Profile RLS performance follow-up

### Auth evidence
- TEST 2 Auth logs show two `POST /auth/v1/token?grant_type=password` responses with HTTP 400 and `x_sb_error_code=invalid_credentials`.
- The same log window shows an older password-recovery verification request whose redirect destination was `http://localhost:3000`. The token itself is intentionally not copied into this evidence.
- The PR #79 test client source explicitly calls `resetPasswordForEmail(email, { redirectTo: location.origin })` and `signUp(... emailRedirectTo: location.origin)`. Therefore, a fresh recovery request initiated from the current PR #79 Vercel preview should request that preview origin, provided the exact preview origin remains in the Auth Redirect URLs allow list.
- The old localhost recovery event is not proof that the current PR #79 client still sends users to localhost. The Site URL is only the fallback when no explicit redirectTo is supplied.
- Main Admin role verification: the existing Auth user ID has `app_user_roles.role = 'main_admin'`. This does not verify the user's current password or a live browser JWT.
- A previous SQLSTATE 42501 event was traced to an audit/simulation SQL statement calling `public.current_app_role()` even though the operational policies call `private.current_app_role()`. This was a permission error in the diagnostic SQL, not evidence of a user-facing login failure. No privileges were broadened to silence it.

### RLS performance correction applied in TEST 2
- The initial Performance Advisor reported three `auth_rls_initplan` warnings for `customer_profiles_select_own`, `customer_profiles_insert_own`, and `customer_profiles_update_own`.
- Applied TEST 2 migration `20261108215313_customer_profile_rls_initplan_optimization_v1`. It preserves the exact owner + customer-role predicates and wraps `auth.uid()` in scalar subqueries.
- Re-read `pg_policies` after the migration: all three policies contain the optimized scalar-subquery form.
- Re-ran Performance Advisor: the three `auth_rls_initplan` warnings are gone. Seventeen unused-index informational notices remain; indexes were not dropped because current low usage is not evidence that they are unnecessary for future workloads.
- The same migration is committed to the PR #84 branch at `supabase/migrations/20261108215313_customer_profile_rls_initplan_optimization_v1.sql`.

### Remaining Auth gate
- A fresh recovery request from the PR #79 preview and successful password reset have not yet been observed in logs.
- A real Main Admin browser session/JWT and successful post-reset login are still required.
- The dashboard Site URL field was not changed through an API; no available connected Supabase action exposes that Auth URL setting. The current app client supplies an explicit `redirectTo`, so the exact allow-listed preview origin is the relevant setting for this preview test.
