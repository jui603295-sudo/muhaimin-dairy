# 10-device login test and role/permission rollout

## Purpose
Prepare a safe multi-device test for the Muhaimin Dairy web app without writing, editing, or deleting production business records.

## Current app entry point
https://jui603295-sudo.github.io/muhaimin-dairy/

## Important current-state note
The frontend currently signs users in through Supabase Auth. A successful login is not proof that the account is a restricted Customer. The app's current client code includes business data management screens, so role separation must be enforced by PostgreSQL Row Level Security (RLS), not only by hiding buttons in the browser.

## Safe test sequence
1. First confirm GitHub Pages has deployed the intended commit.
2. Use only existing authorized accounts or designated test accounts. Do not share the Main Admin password across phones.
3. Before testing new accounts, audit every RLS policy and database grant using `supabase-security-audit.sql` in Supabase SQL Editor. The file contains read-only queries only.
4. Create a role design with at least `main_admin` and `customer`. Assign Main Admin explicitly to a trusted account; do not grant admin by signup metadata or user-supplied form fields.
5. Define what Customer is allowed to read or change. Enforce it in RLS policies for every business table. UI-only restrictions are not security.
6. Verify that a Customer cannot select, insert, update, or delete records outside the approved scope. Use test rows or a non-production Supabase project; do not probe with live business transactions.
7. Only after RLS checks pass, test the ten phones. Record login, logout, refresh/session persistence, dashboard visibility, and denied permissions.
8. Keep an export backup stored securely before any approved schema or policy migration. Do not restore/import a backup into the live database until a tested, reviewed migration exists.

## Ten-phone checklist
- [ ] Phone 1: login and logout
- [ ] Phone 2: login and logout
- [ ] Phone 3: login and logout
- [ ] Phone 4: login and logout
- [ ] Phone 5: login and logout
- [ ] Phone 6: login and logout
- [ ] Phone 7: login and logout
- [ ] Phone 8: login and logout
- [ ] Phone 9: login and logout
- [ ] Phone 10: login and logout

For each device, note whether the account is Main Admin or Customer, whether the dashboard loads, and whether unauthorized actions are denied. Do not enter real collection/payment transactions during the test.

## Current backup/restore limitation
The app's current backup control exports available in-memory data to JSON and validates a selected file's structure. The current UI explicitly says automatic restore is disabled. Keep that safeguard until restore behavior is implemented and tested against a separate test database.
