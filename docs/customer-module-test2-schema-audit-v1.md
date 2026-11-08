# TEST 2 Customer Foundation — Read-only Schema Audit v1

**Audit date:** 2026-11-09  
**Project:** Muhaimin Dairy TEST 2 (`wpomsmvzylrembojdsxd`)  
**Scope:** Read-only inspection of the TEST 2 public schema, migration history, RLS policies, triggers and relevant role helper functions.  
**Production:** Not accessed or changed.  
**Writes performed in Supabase:** None.

## 1. Executive result

The current TEST 2 database has a customer role foundation but no customer-facing data model or portal schema. The first Customer implementation should therefore begin with a carefully scoped identity/profile foundation only after the role-model overlap is resolved and the current Auth flow is verified.

## 2. Existing schema observations

- `public.app_user_roles` exists with `user_id`, `role`, `created_at`; role constraint allows `main_admin` and `customer`; default role is `customer`.
- `public.app_users` also exists with a separate role vocabulary: `admin`, `manager`, `staff`, `cashier`, `viewer`; default role is `staff`; it also has `is_active`.
- TEST 2 inspection showed one row in `app_user_roles` and zero rows in `app_users`.
- An `auth.users` AFTER INSERT trigger named `muhaimin_assign_customer_role` calls `public.assign_default_customer_role()`.
- No customer-specific profile, address, consent, order, payment, notification or support tables were present in the inspected public schema.
- Existing operational tables include `branches`, `farmers`, `milk_collections`, `farmer_payments`, feed, veterinary, agro and audit tables.
- The inspected public tables had RLS enabled.
- The existing operational-table policies use `private.current_app_role() = 'main_admin'`; the `app_user_roles` policy allows an authenticated user to SELECT only their own role.
- Existing operational tables therefore remain Main Admin-only in the current policy model; no customer data access policy exists yet.

## 3. Role model overlap — blocker to resolve before implementation

There are two distinct role registries:
1. `app_user_roles`: `main_admin | customer`
2. `app_users`: `admin | manager | staff | cashier | viewer`, plus `is_active`

The helper `private.current_app_role()` reads `app_user_roles`. Existing Main Admin RLS policies depend on this helper. Other public helper functions `is_admin_app_user()` and `is_active_app_user()` read `app_users`.

Do not merge, rename, delete or silently synchronize these role systems as part of the first Customer feature. First map their callers, grants, function dependencies, app login logic and current TEST 2 Main Admin identity. Then propose one backward-compatible authorization contract with explicit migration and rollback tests.

## 4. Function and trigger observations

- `private.current_app_role()` is SECURITY DEFINER, uses an empty search_path, and reads the caller's `app_user_roles` row.
- `public.assign_default_customer_role()` is SECURITY DEFINER, uses an empty search_path, and inserts the `customer` role for a new Auth user with conflict-safe behavior.
- `public.current_app_role()` is SECURITY DEFINER and also reads `app_user_roles`.
- `public.is_admin_app_user()` and `public.is_active_app_user()` are SECURITY DEFINER and read `app_users`; their search_path is set to `public, auth`. Review these functions' grants, callers and hardening requirements before relying on them for new authorization logic.
- Existing audit and stock-guard triggers are present on operational tables. Preserve them.

## 5. Migration history observed

- `20261031102646_test2_auth_storage_branch_farmer_v1`
- `20261106095251_test2_milk_collection_schema_v2_v3_audit_branch_photo`
- `20261106095537_test2_private_role_helper_rls_hardening`
- `20261106095654_test2_branch_farmer_milk_fk_indexes`
- `20261107215515_test2_missing_fk_indexes_v1`

## 6. Required next investigations (read-only)

1. Inspect the TEST 2 frontend auth and route gate at the exact preview commit; identify every caller of both role systems.
2. Verify the current Main Admin Auth user maps to exactly one `app_user_roles` row and that the existing admin route still works.
3. Inspect grants/execute privileges for SECURITY DEFINER functions and the trigger function.
4. Inspect Storage policies and current bucket configuration without uploading or changing objects.
5. Verify whether the email signup trigger and email verification flow match the TEST 2 frontend.
6. Design customer-only route and profile ownership policies without granting access to Branch/Farmer/Milk Collection operational tables.

## 7. Safe implementation recommendation

The first runtime phase should be limited to:
- a customer-only application route separated from Main Admin operations;
- profile fields with strict ownership;
- email verification and account lifecycle handling;
- explicit consent/privacy preferences;
- RLS allow/deny tests using two distinct customer identities and the Main Admin identity.

Do not create orders, payments, KYC, biometric, passport or document storage tables in this first phase. Future identity verification remains OFF by default and requires separate legal, privacy, provider and security review.

## 8. Evidence and limitations

- Schema/table inventory: completed read-only against TEST 2.
- Migration inventory: completed read-only against TEST 2.
- RLS policy, trigger and relevant function definitions: inspected read-only.
- Browser JWT allow/deny: not performed in this audit.
- Customer signup/profile save/reload: not performed.
- Storage upload/readback: not performed.
- No SQL DDL/DML, Auth mutation, Storage mutation, Production access, merge or deployment occurred.
