# Operational Data Access Audit — TEST 2 Cutover Preparation

**Audit date:** 2026-11-09  
**Repository ref inspected:** `feat/referral-reward-architecture-test2`  
**Inspected source:** `index.html` blob `67329facc75d15cd2cfe730f365a533603c44c78`  
**Status:** Static source audit; no application code or database changed  
**Purpose:** Map current browser-to-Supabase access before designing tenant-safe server APIs. This is not a claim that runtime behavior has been tested.

## 1. Executive finding

The current Main Admin application is a browser-first Supabase client. It performs many operational reads and writes directly through `sb.from(...)`, with some existing RPC use for Milk Collection settings. Branch/Farmer CRUD uses shared direct-table helpers. Private photo operations are initiated from the browser through Supabase Storage.

The TEST 2 tenant-context endpoint is correctly isolated and read-only, but it is not yet the authorization boundary for existing business modules. The application has not yet adopted tenant context in its operational queries or writes.

**Cutover rule:** Do not add operational `tenant_id` columns, backfill ownership, change operational RLS policies, or activate a tenant until the required reads, writes, storage operations, audit and offline replay have been moved to trusted tenant-aware server boundaries and tested.

## 2. Current access map

| Area | Current source-level pattern | Cutover concern |
|---|---|---|
| Branch/Farmer lists and forms | Shared `queryRows`, `insertRow`, `updateRow` helpers use `sb.from(table)` | Browser directly addresses operational tables; no server-derived tenant context in the helper contract |
| Dashboard and module data | `loadAll()` reads Branch, Farmer, Collection, Payment, Feed, Veterinary and Agro tables | No explicit tenant filter in these browser queries; isolation currently depends on existing RLS |
| Main Admin role gate | `startApp()` reads `app_user_roles` for the current Auth user | Platform role check is client-side UI gating; database RLS remains the security boundary |
| Milk Collection creation | Browser builds payload and calls `sb.from("milk_collections").insert(payload)` | Collector ID is included in payload; server must independently derive actor and tenant |
| Milk quality review | Browser updates `milk_collections` directly after client-side validation | Quality rules and reviewer identity must be revalidated server-side; client validation is UX only |
| Farmer Payments and other forms | Shared direct `insertRow` helper | Financial/stock/service mutations need domain-specific transactional commands and idempotency |
| App Settings | Browser reads `app_settings` with `limit(1).maybeSingle()`, then direct update/insert | `limit(1)` does not define an organization/tenant scope or stable settings key |
| Milk Collection settings | Existing `save_milk_collection_settings` RPC; browser sends settings payload | This is a useful server-side pattern, but function authorization, tenant scope, validation and audit must be reviewed before reuse |
| Private photos | Browser Storage upload, signed URL and remove; path begins with Auth user ID and record ID | Storage policies currently protect Main Admin access; future tenant/record ownership checks need a server-trusted scope |
| Audit | Local `localStorage` activity log and direct read of `audit_events` | Local activity history is not a trusted audit trail; server-side critical-action audit must be authoritative |
| Offline cache | User-scoped localStorage snapshot | Cache can be stale and must not become authorization evidence |
| Milk offline queue | IndexedDB records include local user ID and payload; replay constant is currently `false` | Correctly fail-closed today; replay must not trust queued user/tenant values and must use server idempotency |

## 3. Verified source observations

### 3.1 Reads
- `queryRows(tableName)` builds a direct Supabase `select("*")` query.
- `loadAll()` directly loads the operational tables used by the existing dashboard/modules.
- `loadOperationalRecords()` directly selects batch, chiller, reconciliation and operating-finance records.
- `app_settings` uses `limit(1).maybeSingle()`; the source does not define a stable tenant/organization key in this query.
- The browser also directly reads the current user's `app_user_roles` row to decide which workspace to display.

### 3.2 Writes
- `insertRow(tableName, data, form)` performs direct table INSERT.
- `updateRow(tableName, id, data, form)` performs direct table UPDATE.
- Milk collection submission directly inserts a browser-built payload.
- Quality review directly updates the collection row after checking form values in JavaScript.
- App Settings directly inserts or updates a row.
- Milk Collection settings use an RPC and validate the returned shape before updating the UI.

### 3.3 Photo storage
- Upload uses the current Auth user ID and record ID in the object path, uploads JPEG, and sets `upsert:false`.
- Signed URLs are created for one hour.
- Photo removal is a direct Storage remove call.
- These are useful current safeguards, but the future policy must bind the object to the server-verified tenant and record owner, not only a client-composed path.

### 3.4 Offline behavior
- Milk Collection queue uses IndexedDB with a stable client record ID and a local user ID.
- The source explicitly sets `MILK_QUEUE_REPLAY_ENABLED = false`; the UI reports that automatic upload is disabled pending unique-index and real-JWT RLS verification.
- The dormant replay implementation inserts directly into `milk_collections` and performs a duplicate lookup using `client_record_id`.
- Do not enable this replay path as-is for multi-tenant operation.
- Offline snapshots are keyed by user ID and are a convenience cache, not an authorization source.

## 4. Security and architecture gaps to close

1. **No operational tenant context integration:** the verified read-only tenant bootstrap is not imported into the application startup path, and must not be treated as write authorization.
2. **Direct operational table access:** common read/write helpers bypass a shared API contract. RLS currently remains the database guard, but the app is not yet ready for tenant-aware cutover.
3. **Client-derived actor fields:** fields such as collector/reviewer identifiers are supplied by the browser. A trusted backend must derive the effective actor from the verified JWT.
4. **Client-only domain validation:** milk quality and other form rules must be repeated authoritatively by server-side commands and database constraints.
5. **Settings scope ambiguity:** `app_settings limit(1)` must become a deterministic tenant-scoped settings resolver; no arbitrary first-row selection.
6. **Storage ownership:** upload/read/delete must validate both tenant membership and relationship to the target Branch/Farmer record.
7. **Audit authority:** local activity logs cannot substitute for append-only server-side audit events on financial/security-sensitive operations.
8. **Offline replay trust:** queued values are untrusted input; actor, tenant, branch permission, state and idempotency must be revalidated at replay time.
9. **Stale offline authorization:** cached data may remain on a device after role or membership revocation; define expiry, cache clearing, device protection and offline access policy.

## 5. Target shared API contract

Use a small set of versioned server-side commands and queries, grouped by domain. Do not create one generic endpoint that accepts arbitrary table names or arbitrary SQL-like filters.

Every request should:
- Validate the Supabase JWT server-side.
- Derive `auth.uid()` from verified identity; ignore client actor IDs for authority.
- Resolve exactly one permitted tenant and branch context from server-side membership records, or require explicit tenant selection if multiple operational memberships exist.
- Validate action-level permission and record ownership.
- Validate payload schema, domain invariants and allowed state transitions.
- Use a transaction for related writes.
- Accept an idempotency/operation ID for retryable commands.
- Write an authoritative audit event for sensitive actions.
- Return a minimal typed result; do not expose privileged database details.
- Fail closed on missing tenant, suspended membership, stale session, ambiguous scope or policy failure.

Candidate first command/query groups:
- `branch.list / branch.create / branch.update`
- `farmer.list / farmer.create / farmer.update`
- `record-photo.upload-intent / record-photo.read-url / record-photo.delete`
- `milk-collection.create / milk-collection.list`
- `milk-quality.review`
- `settings.get / settings.update`

Each command must have a domain-specific schema and permission matrix. Financial commands should be separated from general CRUD.

## 6. Safe implementation sequence

### Phase A — contract and tests (no schema cutover)
- Document command schemas, actor derivation, tenant selection, branch scope and failure codes.
- Add unit tests for valid/invalid JWT context, no membership, pending/suspended tenant, multiple memberships, cross-tenant record IDs, branch access denial, duplicate operation IDs and invalid state transitions.
- Keep existing browser paths working while the server endpoints are developed behind a TEST-only feature flag.

### Phase B — Branch and Farmer vertical slice
- Implement tenant-aware list/create/update server operations in TEST 2.
- Derive actor and tenant on the server; do not accept them as authority from the client.
- Integrate private photo upload/readback/delete with record ownership checks.
- Verify Main Admin and restricted-user JWT cases, Save/Edit/Reload, and database before/after counts.
- Run existing Branch/Farmer GPS and edit regression tests.

### Phase C — Milk Collection and settings
- Move collection create and quality review to server commands.
- Keep client_record_id idempotency server-enforced with a unique constraint and transactional duplicate handling.
- Make settings resolution deterministic by tenant and stable key.
- Keep offline replay disabled until server command replay, duplicate delivery and revoked-membership cases pass.

### Phase D — tenant ownership and RLS cutover
- Only after A–C and full module inventory pass: propose additive tenant ownership columns, deterministic backfill mapping, integrity constraints and dual-safe RLS.
- Run preflight and postflight checks in TEST 2.
- Test cross-tenant and cross-branch denial with real JWTs.
- Do not activate or cut over Production without separate explicit authorization.

## 7. Acceptance evidence checklist

| Test | Required evidence | Current status from inspected records |
|---|---|---|
| Tenant context endpoint | Real TEST 2 JWT reaches Edge Function; response identity matches | PASS, recorded in PR #85 evidence |
| Main Admin dashboard smoke | Existing Main Admin dashboard still loads | PASS, user-observed; not automated E2E |
| Branch/Farmer edit navigation | Both forms open and controls render | PASS, UI only |
| Branch/Farmer Save/Edit/Reload | Real row persists and reopens with exact values | NOT TESTED |
| Private photo lifecycle | Upload, signed readback, replacement/delete and denial tests | NOT TESTED; bucket object count previously reported as zero |
| GPS persistence | Fresh capture, accuracy/freshness validation, save and reload | NOT TESTED end-to-end |
| Expired/revoked session | Browser and endpoint deny stale/revoked session | NOT TESTED |
| Cross-tenant access | Real JWT cannot read/write another tenant's records | NOT TESTED |
| Offline replay | Server-derived tenant/actor, idempotency, duplicate and revocation cases | NOT TESTED; automatic replay is disabled |
| Full module regression | All existing modules and key workflows | NOT TESTED |

## 8. Scope and safety statement

This audit is based on source inspection of the specified Git ref and the recorded TEST 2 evidence. It does not prove that the deployed Preview matches the inspected commit, nor that the inspected source has passed browser runtime tests.

No application code, schema, RLS policy, Auth setting, Storage object, TEST 2 business row or Production resource was changed during this audit. The next implementation work must remain on an isolated development branch and TEST 2.


## 9. TEST 2 live schema and RLS inspection — read-only

**Environment:** Supabase TEST 2 only (`wpomsmvzylrembojdsxd`)  
**Method:** Supabase table metadata plus read-only catalog queries against `information_schema`, `pg_policies` and `pg_indexes`.  
**No DDL/DML executed.**

### Current operational fixture and settings state
- `public.branches`: 1 row.
- `public.farmers`: 1 row.
- `public.milk_collections`: 2 rows.
- `public.farmer_payments`: 0 rows.
- `public.app_settings`: 0 rows.
- `public.app_user_roles`: primary key is `user_id`; the role lookup is uniquely keyed.
- `public.app_settings`: only the `id` primary key is present in the inspected indexes; no stable tenant/key uniqueness is defined.

### RLS policies observed on the inspected tables
- `branches`, `farmers`, `milk_collections`, `farmer_payments` and `app_settings`: one authenticated Main Admin-only `ALL` policy using `private.current_app_role() = 'main_admin'` for both `USING` and `WITH CHECK`.
- `app_user_roles`: authenticated users may SELECT only their own row.
- `audit_events`: Main Admin SELECT policy observed; no client write policy was present in the inspected policy result.
- This is the current single-platform Main Admin gate. It is not tenant/branch-scoped authorization and must not be described as multi-tenant isolation.

### Useful existing indexes and constraints
- `app_user_roles(user_id)`: primary-key unique index.
- `branches(id)`: primary key; `branches(code)`: unique index.
- `farmers(id)`: primary key; `farmers(farmer_code)`: unique index; `farmers(branch_id)`: lookup index.
- `milk_collections(id)`: primary key.
- `milk_collections(client_record_id)`: partial unique index for non-null values — the database uniqueness prerequisite for duplicate-safe client retry is present.
- `milk_collections(branch_id)` and `milk_collections(farmer_id)`: lookup indexes.
- `farmer_payments(farmer_id)`: lookup index.
- Milk Collection also has a unique scale-ticket index scoped by branch/date and normalized ticket value.

### Consequences
1. The existing Main Admin-only policies are a useful current security gate, but they cannot safely be loosened to tenant membership access until server-derived tenant context and row ownership are in place.
2. The existing unique `client_record_id` index is a positive prerequisite, but it does not make the dormant direct-browser queue replay tenant-safe. Replay remains disabled.
3. `app_settings` currently has zero rows and no deterministic tenant/key uniqueness. A tenant-aware settings migration must define canonical keys and conflict behavior before any operational write is moved.
4. The existing Branch/Farmer/Collection schema already contains useful foreign keys and lookup indexes; preserve these while designing additive tenant ownership and composite integrity constraints.
5. The live catalog inspection confirms the current TEST 2 schema shape only. It does not prove browser CRUD, Storage upload/readback, cross-tenant denial, or Production behavior.
