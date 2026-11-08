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
