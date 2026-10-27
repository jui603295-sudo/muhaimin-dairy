# Dairy Processing Workspace — TEST-first acceptance plan

## Scope

The “দুগ্ধজাত পণ্য উৎপাদনকারী প্রতিষ্ঠান” workspace is separate from farmer payments and milk collection records. The UI prototype keeps drafts in this browser only. The database migration is prepared but has **not** been applied.

## Current safeguards

- Production project is out of scope. Do not run this migration against hhqshslzoznwyprhjzia.
- TEST project fsfhucggzurwulubpagy was last reported as COMING_UP; SQL access was unavailable at last check.
- Server sync, offline queue sync and hardware integrations remain disabled until tests pass.
- A sale requires explicit batch quality approval and a non-expired batch.
- A return does not restore stock unless return inspection is accepted and the batch is still in date.
- Audit history is append-only for app roles; JSON export is not a server backup.
- Local reports show “cash difference”, not profit. No yield or profit is inferred from milk volume.

## Migration

File: supabase/migrations/202610240001_dairy_processing_workspace.sql

Apply only to the verified TEST project after it becomes available and after the security baseline migrations are confirmed. Do not apply to Production.

## TEST database preflight

Run read-only checks first:

    select current_database(), current_user, now();

    select c.relname, c.relrowsecurity, c.relforcerowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname like 'dairy_processing_%'
    order by c.relname;

    select schemaname, tablename, policyname, roles, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and tablename like 'dairy_processing_%'
    order by tablename, policyname;

Expected after migration:
- Six tables with RLS enabled and forced.
- Main Admin-only policy on all six tables.
- Audit table does not grant direct insert/update/delete to authenticated.
- dairy_processing_stock is invoker-security and only readable by an authorized Main Admin.

## JWT acceptance matrix

Use real, separate test accounts and their normal application sessions; never paste JWTs into source control or this document.

| Actor | Read workspace data | Insert/update/delete business records | Read audit | Expected |
|---|---:|---:|---:|---|
| Anonymous | Deny | Deny | Deny | Pass |
| Authenticated non-admin/customer | Deny | Deny | Deny | Pass |
| Main Admin | Allow | Allow, subject to constraints | Allow | Pass |

A SQL editor session as postgres is not proof of JWT/RLS behavior. Capture the role, request, result and timestamp for each test.

## Transaction integrity tests

1. Create an institution and product in TEST; edit them; reload; verify persistence.
2. Create a batch with quality pending, hold, and rejected; a sale must fail for each.
3. Approve a batch with the authenticated Main Admin identity; a sale within stock succeeds.
4. Sale from an expired batch fails.
5. Two concurrent sales that together exceed available stock: at least one fails.
6. Sale/waste above available stock fails.
7. Return quantity above prior sale less previous returns fails.
8. A pending/rejected return does not increase stock. An accepted, in-date return increases stock once; duplicate updates must not double-count.
9. Reducing batch output below net stock already removed fails.
10. Every insert/update/delete of a business record produces an audit row; app users cannot modify/delete audit rows directly.
11. Check date-filtered reports, return net sales, cost totals, stock view, and local-vs-server report labels.

## Browser/Android acceptance

1. Open the module from Milk Collection home; confirm it is not a top-level Main app menu item.
2. Create institution/product/batch/transaction/cost, edit each type, reload and verify.
3. Test invalid inputs, duplicate batch code, expired product, unapproved sale, overselling, return review, report date order and malformed JSON restore.
4. Export CSV; confirm Bengali UTF-8 displays correctly in spreadsheet software.
5. Export JSON, reset only the module draft, then restore JSON; verify all records and references survive.
6. Verify layout at phone width, keyboard behavior, table overflow, logo, navigation/back behavior and no console errors.
7. Only after database JWT/RLS and browser tests pass, wire the UI to Supabase. Keep local draft mode and sync feature flags off until a separate sync/idempotency/conflict test plan passes.

## Release gate

Do not merge/deploy from this branch until the user reviews the evidence and explicitly approves. Never run this migration or destructive test data cleanup on Production.
