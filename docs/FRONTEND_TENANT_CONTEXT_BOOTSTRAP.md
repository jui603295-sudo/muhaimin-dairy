# Frontend Tenant Context Bootstrap — TEST 2

## Scope

This is a read-only adapter for the existing browser Supabase client. It is intentionally isolated from the current index.html startup path until a real authenticated TEST 2 HTTP/JWT acceptance test passes.

Files:
- src/tenant-context-bootstrap.js — browser ES module.
- tests/tenant-context-bootstrap.test.mjs — offline unit tests.
- Existing endpoint: tenant-context Edge Function, JWT verification enabled.

## Security behavior

1. Reads the current session with auth.getSession() only to check for a signed-in local session.
2. Calls supabase.functions.invoke('tenant-context', { body: {} }); the SDK attaches the session Authorization header. The browser never manually reads, copies, stores, or sends an access token.
3. The Edge Function independently validates the JWT and derives the user ID server-side.
4. Checks returned user ID and verifies the session user did not change during the request.
5. Rejects malformed membership data and any response where write_authority is not exactly false.
6. Does not write to Supabase or persist tenant context in localStorage/IndexedDB.
7. Selects a tenant automatically only when exactly one membership has can_operate=true. Multiple operational memberships require explicit selection.
8. A pending tenant or can_operate=false membership remains non-operational.

## Integration point (not yet enabled)

The current app creates one shared client in index.html. After that client is created, a future opt-in integration can dynamically import this adapter and call loadTenantContext(sb). The module is not imported by index.html yet; this is intentional. Existing Main Admin access remains unchanged.

Do not use the result to hide, block, or authorize existing Main Admin pages until the live JWT HTTP test, signed-out/expired-session/pending-tenant cases, and existing Main Admin regression tests pass.

## Status mapping

| Status | Meaning |
|---|---|
| ready | Exactly one operational membership; context only, no write authority |
| tenant_not_operational | Membership exists but tenant cannot operate |
| tenant_selection_required | Multiple operational memberships |
| no_membership | No active memberships returned |
| unauthenticated | No local session |
| endpoint_unavailable | Function/network/JWT invocation failed; do not infer access |
| session_changed | User changed during request; discard result |
| validation failure | Malformed response or identity mismatch; fail closed |

## Test

Run: node --test tests/tenant-context-bootstrap.test.mjs

Unit tests validate response handling only; they do not replace a live browser/JWT test.


## TEST 2 live diagnostic page

A manual, read-only diagnostic page is available at:

`/tools/tenant-context-diagnostic.html`

### Safe test procedure

1. Open the same TEST 2 Preview URL and browser profile used for the Muhaimin Dairy app.
2. Sign in through the existing app's normal login screen. Do not share passwords, OTPs, JWTs, or screenshots containing secrets.
3. Open `/tools/tenant-context-diagnostic.html` on that exact same origin.
4. Press **লগইন সেশন ও Tenant Context পরীক্ষা** once.
5. Record only the visible result code/status and whether the expected pending TEST 2 tenant is listed. Do not copy browser storage or network Authorization headers.
6. Return to the main app. The diagnostic does not sign out, write operational rows, alter RLS, or persist its result.

The diagnostic page creates a Supabase client using the same TEST 2 project URL and publishable key as the existing app. It relies on the Supabase SDK's normal same-origin session handling and invokes the read-only adapter only after the user clicks the button. It does not ask for credentials or print user IDs/tokens.

### Expected current TEST 2 result

- Signed-in Main Admin session is detected.
- Edge Function response identity matches the session.
- One active owner membership is returned.
- Tenant status is `pending`, so adapter status should be `tenant_not_operational`.
- `write_authority` remains `false`.

This is a manual live HTTP/JWT acceptance test. A static Preview Build success or passing unit tests do not count as a live endpoint pass. If the page reports an error, record only its short status code; investigate CORS, JWT verification, deployment, or environment configuration without sharing secrets.


## Live TEST 2 acceptance evidence — 2026-11-09

### Authenticated HTTP/JWT diagnostic — PASS

The user completed the same-origin diagnostic while signed in to the TEST 2 Preview app. The page reported:

- Local authenticated session detected.
- `tenant-context` Edge Function response received and validated.
- Adapter status: `tenant_not_operational`.
- Platform role: `main_admin`.
- Membership count: 1.
- Tenant: `মুহাইমিন ডেইরি` (`muhaimin-dairy-test2`).
- Tenant status / membership role: `pending / owner`.
- `can_operate=false`.
- `write_authority=false` (read-only).

This confirms the real browser session reached the deployed JWT-protected Edge Function and received the expected pending-tenant response. The diagnostic did not grant operational access.

### Main Admin dashboard smoke regression — user-observed PASS

Immediately after the diagnostic, the user returned to the same Preview app and confirmed successful Main Admin login and Dashboard load. The visible app reported Online and showed:

- Branches: 1.
- Farmers: 1.
- Today's milk collection: 0 L.
- Today's commission: ৳0.
- TEST 2 QA Branch: 0 L / 12 L (Active).
- Daily target: 2,500 L; CLR: 28; commission: ৳1/L.

This is a user-observed browser smoke test, not an automated browser test. No screenshot or browser automation artifact was captured.

### Read-only database before/after snapshot — unchanged

A read-only TEST 2 SQL count was repeated after the browser diagnostic and dashboard return:

| Table | Row count |
|---|---:|
| public.branches | 1 |
| public.farmers | 1 |
| public.milk_collections | 2 |
| public.farmer_payments | 0 |
| public.app_settings | 0 |

The counts match the prior preflight snapshot. No operational rows were written by the diagnostic.

### Security privilege recheck — PASS

- `anon` has no USAGE on schema `private`.
- `authenticated` has no USAGE on schema `private`.
- `anon` cannot EXECUTE the tenant resolver.
- `authenticated` cannot EXECUTE the tenant resolver.
- `service_role` can EXECUTE the tenant resolver.
- Edge Function remains ACTIVE v1 with `verify_jwt=true`.
- PR head at time of verification: `962f5335291ae1f096b64244ca864ff9396b073c`; Vercel check reported success (preview/build status only).

### Remaining gates — NOT YET PASSED

- Expired/revoked session live browser test.
- Main Admin full module regression (Branch, Farmer, Collection, Payments, Feed, Veterinary, Agro, Reports, Ledger, Settings, Backup, Audit).
- Tenant-aware read APIs and server-validated write APIs.
- Tenant-bound offline queue replay and idempotency tests.
- Cross-tenant real-JWT authorization tests.
- Operational tenant ownership columns, backfill, integrity constraints and RLS cutover.

**Decision:** The live tenant-context HTTP/JWT acceptance gate and basic Main Admin dashboard smoke gate are now passed. Keep the adapter isolated from `index.html` until the remaining session and module regression gates are completed. Keep the TEST 2 tenant `pending`; do not grant operational permissions. Do not modify Production or merge/deploy this PR.
