# Tenant Ownership Compatibility Map — TEST 2

**Purpose:** Define how the existing single-business schema will become tenant-aware without losing current features or weakening Main Admin security.

**Source of truth:** Read-only catalog inspection of TEST 2 project `wpomsmvzylrembojdsxd` on 2026-11-09, after the initial private tenant foundation migrations.

## 1. Current tenant foundation

The following internal objects now exist in the non-API `private` schema:

- `private.tenants`
- `private.tenant_memberships`
- `private.tenant_invitations`

One tenant `muhaimin-dairy-test2` is bootstrapped with status `pending`; the existing Main Admin has one active `owner` membership. The global platform role remains `main_admin`. No operational table has a `tenant_id` yet.

## 2. Operational table ownership map

| Existing table | Intended scope | Tenant migration approach | Notes |
|---|---|---|---|
| `app_settings` | Tenant-owned | Add nullable `tenant_id`, backfill one settings row per tenant, then unique tenant key | Current table has zero rows; create settings row only through a separate reviewed bootstrap step |
| `branches` | Tenant-owned | Add nullable `tenant_id`; backfill current branch to initial tenant | Parent scope for farmers and milk collection |
| `farmers` | Tenant-owned | Add nullable `tenant_id`; backfill and enforce branch/tenant consistency | Keep farmer ID and GPS/photo fields unchanged |
| `milk_collections` | Tenant-owned | Add nullable `tenant_id`; backfill; validate branch_id and farmer_id belong to same tenant | Keep idempotency UUID, quality and collection fields unchanged |
| `farmer_payments` | Tenant-owned | Add nullable `tenant_id`; backfill through farmer; enforce same-tenant farmer FK semantics | Financial history must not be silently rewritten |
| `feed_products` | Tenant-owned catalog | Add nullable `tenant_id`; backfill current catalog | Product codes/names become tenant-unique, not globally unique |
| `feed_purchases` | Tenant-owned transaction | Add nullable `tenant_id`; backfill through product where present | Supplier-only rows require explicit tenant assignment |
| `feed_sales` | Tenant-owned transaction | Add nullable `tenant_id`; backfill through product where present | Customer name remains tenant-private |
| `vet_companies` | Tenant-owned catalog | Add nullable `tenant_id`; backfill current companies | Do not assume companies are global across tenants |
| `vet_products` | Tenant-owned catalog | Add nullable `tenant_id`; backfill; validate company_id tenant | Keep batch/expiry tracking |
| `vet_purchases` | Tenant-owned transaction | Add nullable `tenant_id`; backfill through product | Preserve purchase/payment totals |
| `vet_sales` | Tenant-owned transaction | Add nullable `tenant_id`; backfill through product | Preserve customer and due data |
| `agro_products` | Tenant-owned catalog | Add nullable `tenant_id`; backfill current catalog | Product codes/names become tenant-unique |
| `agro_purchases` | Tenant-owned transaction | Add nullable `tenant_id`; backfill through product | Preserve supplier and accounting fields |
| `agro_sales` | Tenant-owned transaction | Add nullable `tenant_id`; backfill through product | Preserve customer and accounting fields |
| `audit_log` | Tenant-scoped audit | Add nullable `tenant_id`; backfill current audit rows; update audit trigger to derive tenant from affected record | Keep append-only behavior and old/new snapshots protected |
| `audit_events` | Tenant-scoped audit | Add nullable `tenant_id`; backfill current audit rows; update audit trigger to derive tenant from affected record | Preserve event metadata and actor |
| `app_users` | Legacy tenant membership compatibility | Do not use as new authorization source; map to `tenant_memberships` with an explicit reviewed migration | Keep table temporarily for old app versions; remove only after code cutover and regression |
| `app_user_roles` | Platform identity/role | Keep global and separate from tenant memberships | Do not add tenant role values here; retain Main Admin isolation |
| `customer_profiles` | User identity profile | Keep user-scoped; tenant-specific customer association belongs in memberships/customer relationship tables | Do not duplicate PII into tenant registry |

## 3. Cross-table integrity requirements

Before tenant RLS is enabled:

1. Branch, farmer, collection and payment records must have the same tenant ownership along every foreign-key path.
2. Product catalog and purchase/sale records must have matching tenant IDs, including nullable product links.
3. A branch or farmer ID from Tenant A must never be accepted in a Tenant B collection/payment write.
4. Unique constraints must be reviewed: globally unique farmer/product codes may need tenant-scoped unique indexes after collision analysis.
5. Existing generated columns, idempotency keys, GPS/photo columns, quality states, accounting fields and audit triggers must be preserved.
6. Audit trigger changes must derive tenant ownership from the source row inside the database, never from browser-supplied tenant IDs.
7. Existing Main Admin access must remain available during migration; tenant access is additive only after the new membership helper and real JWT tests pass.

## 4. Staged migration strategy

### T1 — Nullable ownership columns
Add nullable `tenant_id` columns and indexes only. No RLS policy changes and no NOT NULL constraints. Verify existing application reads/writes still work.

### T2 — Deterministic backfill
Assign existing TEST 2 operational records to `muhaimin-dairy-test2` using explicit relationships. Where a row cannot be mapped unambiguously, stop and report it; do not guess.

### T3 — Integrity validation
Run orphan, cross-tenant relationship, duplicate-code and audit coverage queries. Add composite unique/FK constraints only after validation.

### T4 — Authorization helper
Create narrowly scoped private helper functions for active membership and tenant role. Any SECURITY DEFINER function must have an empty/fixed search_path, minimal grants, explicit auth.uid() checks, and no client-controlled role/tenant escalation.

### T5 — Dual-safe RLS
Add tenant-aware policies while preserving Main Admin access. Test anonymous, authenticated non-member, tenant owner, tenant staff and cross-tenant actors using real JWTs. Do not turn on tenant access before tests pass.

### T6 — Application cutover
Update every query and write path to include tenant context, server-validated membership, and correct tenant IDs. Test mobile/PWA, offline queue and retry idempotency.

### T7 — Constraint hardening
Only after the new app is deployed and verified in TEST 2: make required tenant_id columns NOT NULL, remove legacy policy paths if proven unused, and retire `app_users` only after code and data compatibility checks.

## 5. Current verification and non-goals

- The initial private tenant foundation is isolated from the public operational tables.
- `anon` and `authenticated` have no schema USAGE on `private` and no table SELECT privilege.
- Existing public RLS policy count remains unchanged at 22.
- Existing TEST 2 operational fixture counts remained unchanged after foundation migration: 1 branch, 1 farmer, 2 milk collections.
- This document is a compatibility map, not permission to bulk-backfill, change existing RLS, or enable tenant UI.
- No live referral links, rewards, tenant invites, or AI services are created by this migration.

## 6. Application write-path cutover gate — verified 2026-11-09

The current application file on base branch `test/test2-main-admin-auth-client-v1` was inspected at blob `67329facc75d15cd2cfe730f365a533603c44c78`.

Observed behavior that blocks a safe operational tenant migration:

- The browser creates a Supabase client and performs direct table reads/writes.
- Shared `insertRow` and `updateRow` helpers write directly to operational tables.
- Milk Collection creates records with a browser-built payload that includes branch/farmer IDs but no tenant context.
- The offline queue replay path also inserts the queued payload directly into `milk_collections`; it does not resolve or validate tenant ownership at replay time.
- `loadAll` reads `app_settings` using `limit(1)`, which is not tenant-deterministic once more than one tenant exists.
- The current workspace gate checks the global `app_user_roles.role = main_admin`; it does not resolve an active tenant membership or tenant status.

**Decision:** Do not yet add operational `tenant_id` columns, backfill records, or change public RLS. Doing so before the browser and offline write paths become tenant-aware would create unscoped writes or risk breaking existing Main Admin operations.

### Required cutover order

1. Introduce a server-validated tenant context for the signed-in user; never trust a browser-supplied tenant ID or role.
2. Route operational create/update and milk-queue replay through a trusted backend boundary that derives tenant membership and verifies referenced branch/farmer/product ownership.
3. Make every read deterministic by active tenant; remove arbitrary `limit(1)` settings selection.
4. Add tenant context to offline queue records and revalidate it on replay; reject stale, revoked, suspended or cross-tenant queue entries.
5. Add nullable tenant ownership columns and indexes; backfill only after a relationship preflight passes.
6. Add cross-tenant integrity constraints and dual-safe RLS only after real JWT tests pass.
7. Retest existing Main Admin workflows and all branch/farmer/milk/payment/feed/vet/agro paths before tightening constraints.

### New read-only preflight

`supabase/tests/tenant_cutover_preflight.sql` checks the expected pre-cutover tables, RLS state, tenant bootstrap and key Branch/Farmer/Collection/Payment foreign-key integrity. It is a stop/go guard, not a migration; it performs no data or schema changes.
