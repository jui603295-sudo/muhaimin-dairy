# Muhaimin Dairy — Milk Collection V3 TEST Runbook

**Status:** Preparation only. No live Supabase changes have been made.
**Scope:** Separate TEST Supabase project and disposable test data only.
**Safety gate:** Keep `MILK_QUEUE_REPLAY_ENABLED = false` until every required check below passes.

## Preconditions

- [ ] Create/use a separate Supabase TEST project; verify its project ref is not the production ref.
- [ ] Restore a verified backup into TEST. Never use the production project for these tests.
- [ ] Record the TEST project ref and migration order in the test log (do not publish secrets).
- [ ] Confirm the TEST schema and policies match the intended test version.
- [ ] Run the V2 migration `20261022_milk_collection_integrity.sql` only after checking and resolving duplicate scale tickets in TEST.
- [ ] Run the V3 migration `20261023_milk_collection_idempotency.sql` in TEST only.

## Database acceptance tests

Use disposable test farmers/branches and a test account. Do not use real farmer records.

1. Insert a milk collection with a fresh `client_record_id`; expect one row.
2. Insert a second collection with a different `client_record_id`; expect success.
3. Retry the first `client_record_id`; expect a unique-constraint rejection and verify the row count for that ID remains exactly one.
4. Insert a legacy-style row with `client_record_id = NULL`; expect success.
5. For scale tickets, verify the same normalized ticket is rejected for the same branch/date, but allowed on a different date or branch.
6. Verify a failed test is rolled back or its disposable test data is removed.

## Real-JWT authorization tests

Run each test with actual signed-in TEST users/JWTs for Main Admin, Manager, and Staff—not service-role credentials.

- [ ] Confirm each role can perform only the operations explicitly granted by the intended RLS policies.
- [ ] Confirm one user's token cannot read or change another user's restricted records.
- [ ] Confirm unauthenticated requests are rejected where authentication is required.
- [ ] Confirm collection writes and duplicate-key reconciliation behave correctly under RLS.
- [ ] Save sanitized pass/fail evidence; never save JWTs, passwords, or secrets in this repository.

## Client and backup tests

- [ ] Export a pending queue under TEST account A and validate it while signed in as A.
- [ ] Sign in as TEST account B and confirm A's backup is rejected.
- [ ] Confirm malformed JSON, missing payload, duplicate IDs, invalid UUIDs, oversized files, and wrong format are rejected.
- [ ] Confirm validation does not import, delete, update, or sync any records.
- [ ] Confirm current-user queue counts do not include another user's records.
- [ ] Confirm offline queue replay remains disabled during all tests.

## Release gate

Do **not** enable queue replay unless database uniqueness, real-JWT RLS, duplicate reconciliation, and client tests all pass and have been reviewed. A green static CI run alone is not sufficient. Production migration, production data changes, PR merge, and deployment require separate explicit approval.
