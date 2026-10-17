# Security audit findings — 2026-10-17

## Scope and evidence

These findings are based on read-only SQL results supplied from the production Supabase SQL Editor. No production data, grants, or policies were changed by this audit.

- 19 listed public tables have Row Level Security enabled.
- `relforcerowsecurity` is false for those tables. This is not, by itself, a vulnerability.
- Most existing policies use role `authenticated`, command `ALL`, and `USING (true)` / `WITH CHECK (true)`.
- `public.products` additionally has a SELECT policy for `public`.
- The table-grant query showed broad table privileges for `anon` and `authenticated`. RLS is a separate enforcement layer; grants alone do not prove anonymous data access, but unnecessary grants should be reduced in a reviewed migration.
- A public-schema search for role/profile/user-id columns returned no rows. This does not mean Supabase Auth has no users; it means the searched public schema does not currently expose a matching role/profile structure.
- The current frontend signs in with Supabase Auth and then loads operational business tables. Hiding buttons alone is not an authorization control.

## Safe decision

Do not run ad-hoc `DROP POLICY`, `REVOKE`, or `GRANT` commands in production. A role migration must be applied as one reviewed change after the trusted Main Admin identity is confirmed, with a rollback plan and a tested non-production copy if available.

## Proposed fail-closed role model

1. Add a private-by-default role mapping keyed to `auth.users.id`, with only `main_admin` and `customer` roles.
2. New registrations must not self-assign `main_admin`; role assignment is performed only by a trusted database owner/admin.
3. Until explicitly approved, `customer` accounts receive no access to operational tables containing farmer contacts, collection records, payments, stock, settings, or reports. This is the safe default because no row/branch-level customer scope has yet been defined.
4. Replace broad `authenticated` policies with policies that require the trusted `main_admin` role. Any later customer access must be deliberately scoped (for example, to assigned branches and only the necessary fields/tables) and tested independently.
5. Revoke unnecessary `anon` privileges on operational tables and retain only explicitly required grants. Check sequences, views, RPCs, and future default privileges as well.
6. Update the frontend to check the role after login and show a pending/restricted-access screen to unapproved/customer accounts instead of attempting to load business data.
7. Verify both positive and negative cases: Main Admin retains full intended access; Customer cannot select/insert/update/delete operational data; anonymous requests cannot access private data; signup cannot self-elevate.
8. Take a secure backup and keep a rollback script before applying any production migration.

## Not yet done

- No production policy/grant changes have been executed.
- No user has been promoted to Main Admin or Customer by this document.
- No claim is made that production is fully secured until the migration, frontend role gate, and negative access tests have been completed.
