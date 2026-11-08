# tenant-context Edge Function

TEST 2 backend endpoint that returns the authenticated user's tenant memberships.

## Security
- Supabase gateway JWT verification remains enabled.
- The function independently validates the bearer token with Supabase Auth.
- It ignores request bodies and never accepts a browser-supplied user or tenant ID.
- The service-role key is read only from Edge Function environment variables.
- The service role invokes `public.resolve_tenant_context_for_user(uuid)`, whose EXECUTE grant is restricted to service_role.
- Responses are marked `Cache-Control: no-store`.
- This is a read-only context endpoint. It does not authorize operational writes or change existing table RLS.

## Current TEST 2 behavior
The bootstrapped tenant is still `pending`. The endpoint should return the active owner membership with `can_operate: false` until the tenant is deliberately activated after application cutover and acceptance testing.

## Deploy
Deploy only to TEST 2 with JWT verification enabled. Do not expose or paste service-role credentials into the browser or repository.
