# Branch & Farmer Server API Contract — TEST 2 v1

**Status:** contract and preflight only; not a live operational API.  
**Target:** TEST 2 project `wpomsmvzylrembojdsxd`.  
**Base:** `feat/referral-reward-architecture-test2`.  
**Production:** out of scope. No production schema, data, settings, or deployment changes.

## 1. Why this boundary exists

The current browser application performs direct reads and writes against `public.branches` and `public.farmers`. TEST 2 currently protects operational tables with a platform Main Admin policy. The tenant registry is in the private schema, and the initial Muhaimin Dairy tenant is deliberately `pending`. A tenant-context resolver exists, but it is read-only and returns `write_authority: false`.

Therefore this contract does not change browser CRUD, operational RLS, tenant status, or operational table structure. A server API must not be wired into the UI until the database authorization layer and positive/negative tests exist.

## 2. Verified current schema (TEST 2)

### `public.branches`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| id | uuid | no | gen_random_uuid() |
| code | text | yes | — |
| name | text | no | — |
| target_liters | numeric | no | 0 |
| status | text | no | 'Active' |
| notes | text | yes | — |
| created_at | timestamptz | no | now() |
| country, division, district, upazila, union_name, village_name | text | yes | — |
| latitude, longitude, location_accuracy_m | double precision | yes | — |
| location_captured_at, registered_at | timestamptz | yes | — |
| photo_path, photo_data_url | text | yes | — |

### `public.farmers`

| Column | Type | Nullable | Default |
|---|---|---:|---|
| id | uuid | no | gen_random_uuid() |
| farmer_code | text | yes | — |
| name | text | no | — |
| mobile | text | no | — |
| village | text | yes | — |
| branch_id | uuid | yes | — |
| expected_liters | numeric | no | 0 |
| status | text | no | 'Active' |
| created_at | timestamptz | no | now() |
| country, division, district, upazila, union_name, village_name | text | yes | — |
| photo_data_url, photo_path | text | yes | — |
| latitude, longitude, location_accuracy | double precision | yes | — |
| location_captured_at, registered_at | timestamptz | yes | — |

The existing farmer-to-branch relationship is `farmers.branch_id -> branches.id`. Current table structures have no `tenant_id`; do not infer tenant ownership from a browser-supplied branch or tenant identifier.

## 3. API surface (domain-specific; no arbitrary table access)

Proposed Edge Function: `branch-farmer-api`.

Request envelope:
- `command`: one allowlisted operation name.
- `tenant_id`: optional selection hint only; never authority.
- `request_id`: client-generated UUID for idempotent mutation requests.
- `payload`: command-specific, allowlisted fields only.

Initial commands:
- `branch.list`
- `branch.create`
- `branch.update`
- `farmer.list`
- `farmer.create`
- `farmer.update`

No generic `table`, `column`, `filter`, raw SQL, or arbitrary RPC command is permitted.

## 4. Trust and authorization invariants

1. Require a valid Supabase user session. Verify the bearer token with Auth `getUser(token)`; never trust a user ID in JSON, query parameters, metadata, or headers.
2. Derive the actor exclusively from the verified Auth user.
3. Resolve the actor's tenant memberships server-side. A client tenant ID only selects among memberships already verified for that actor.
4. Fail closed for missing, ambiguous, invited, suspended, revoked, pending, or closed tenant/membership states. The current pending tenant must remain unable to perform operational writes.
5. The database command boundary must independently re-check actor, tenant status, active membership, tenant-scoped role, and branch scope in the same transaction as the mutation. Edge Function checks alone are not enough.
6. Never accept caller-supplied `created_by`, `actor_user_id`, role, approval state, tenant ownership, audit actor, or server-generated timestamps.
7. Use an allowlist per command; reject unknown fields rather than silently persisting them.
8. Use idempotency keys for create/retry operations. A replay must return the original result or a stable conflict, never duplicate a branch/farmer.
9. Write an audit event atomically with each successful mutation. Failed/denied commands must not leave partial business rows.
10. Keep service-role credentials server-only. Do not return them, database credentials, raw internal error text, or signed storage URLs with excessive lifetime.

## 5. Field validation baseline

- Names: trimmed, non-empty, bounded length; normalize whitespace without changing the user's intended spelling.
- Mobile: store as text; normalize Bangladesh numbers only through an explicit, tested normalization rule. Do not coerce to numeric.
- Expected litres and branch targets: finite non-negative decimal values; reject NaN, Infinity, negative values, and unreasonable precision.
- GPS: latitude in [-90, 90], longitude in [-180, 180], finite accuracy > 0; preserve capture timestamp and enforce the established 150 m accuracy / 10 minute freshness policy at the API boundary.
- Branch relationship: a farmer may only reference a branch the verified tenant is authorized to use.
- Status: allow only documented business states; do not let generic update commands change suspension, closure, payment holds, or other governance states.
- Photo: accept a validated storage object path from a separate upload flow, not arbitrary data URLs or external URLs. Verify bucket, tenant/record binding, uploader, MIME type, size, and object existence before attaching it.

## 6. Safe implementation sequence

1. Keep current UI and RLS behavior unchanged.
2. Add a database-side authorization/mutation contract using a reviewed internal schema design. Do not use a broad public SECURITY DEFINER function.
3. Add positive and negative SQL tests for membership, tenant state, branch scope, field validation, idempotency, and audit atomicity.
4. Add the Edge Function as a narrow authenticated adapter to those database commands.
5. Exercise it with a dedicated test-only tenant fixture and real Auth JWT. Do not activate the real pending tenant to make tests pass.
6. Run browser Save/Edit/Reload and private photo upload/readback regression.
7. Only after evidence, plan a dual-safe browser cutover. Keep old paths until the new path is proven; do not change operational RLS or add tenant columns as a side effect of this contract.

## 7. Explicit release gates

- [ ] Current pending tenant still cannot write.
- [ ] Invalid/expired JWT denied.
- [ ] User A cannot select or mutate User B's tenant.
- [ ] Suspended/revoked membership denied.
- [ ] Pending/suspended/closed tenant denied.
- [ ] Branch scope enforced for farmer create/update.
- [ ] Unknown fields and forged actor/tenant fields rejected.
- [ ] Duplicate request ID does not duplicate rows.
- [ ] Audit actor is server-derived and audit is atomic.
- [ ] Private photo read/write is tenant and record scoped.
- [ ] Main Admin browser Save/Edit/Reload regression passes.
- [ ] Non-admin and anonymous deny tests pass.

**Current result:** contract only. No operational API is live, no UI cutover occurred, no operational RLS or schema was changed, and no production resource was touched.
