# TEST 2 Auth and Private Storage — Evidence Status

Updated: 2026-11-09

## Environment and release boundary

- Supabase TEST 2 project: `wpomsmvzylrembojdsxd`
- Application branch: `test/test2-main-admin-auth-client-v1`
- Pull request: [#79](https://github.com/jui603295-sudo/muhaimin-dairy/pull/79)
- Production project was not queried for changes, modified, migrated, or deployed.
- PR #79 remains unmerged. No Production release is authorized.

## Completed code and database work

1. Added the password recovery panel to the TEST 2 client.
2. Added Supabase `PASSWORD_RECOVERY` event handling and the `auth.updateUser({ password })` step.
3. Added confirmation and minimum-length checks for the new password.
4. Prevented a recovery session from entering the operational Main Admin workspace before the password is changed.
5. Added automated source tests for password recovery.
6. Corrected four existing Storage policies to call `private.current_app_role()` instead of `public.current_app_role()`.
7. Added a transactional migration and source-level test for the Storage policy correction.

## Supabase TEST 2 migration

Applied migration:

- Version: `20261108220409`
- Name: `test2_storage_photo_policy_private_role_helper_v1`

Before correction, the Storage policies depended on `public.current_app_role()`; the authenticated role did not have EXECUTE permission on that helper. The hardened `private.current_app_role()` helper has a fixed empty search path, checks `auth.uid()`, permits EXECUTE for authenticated, and denies EXECUTE for anon.

All four existing policies retain:
- Both private buckets: `muhaimin-farmer-photos` and `muhaimin-branch-photos`
- Main Admin-only access
- Existing SELECT, INSERT, UPDATE, and DELETE operation boundaries

## Read-only evidence

- Main Admin role row exists in TEST 2.
- Simulated authenticated Main Admin claim returned `main_admin`.
- Simulated Main Admin could see 1 Branch and 1 Farmer.
- Simulated authenticated user without an application role saw 0 Branches and 0 Farmers.
- Anonymous table SELECT privileges for Branches and Farmers are false.
- Anonymous EXECUTE on the private role helper is false.
- Both Storage buckets are private, allow JPEG/PNG/WebP, and have a 5 MiB file-size limit.
- Both Storage buckets currently contain 0 objects.

**Simulation caveat:** the SQL role/claim tests use `SET LOCAL ROLE authenticated` and a simulated `request.jwt.claim.sub`. They are not a real browser-issued JWT acceptance test.

## CI evidence

At commit `b6d7abf99c39723e0dbeb401c3b4ba45163ad402`, GitHub Actions run [#42528495883](https://github.com/jui603295-sudo/muhaimin-dairy/actions/runs/42528495883) completed successfully:

- HTML/JavaScript, DOM ID, form, and PWA shell validation
- Branch GPS runtime and race-safety tests
- Branch/Farmer GPS mapping tests
- Farmer GPS freshness and accuracy tests
- Branch/Farmer edit/update mapping and interaction tests
- Password recovery tests
- Storage policy helper tests

Vercel Preview check also completed successfully. Preview readiness is not proof of a real browser Auth session or storage upload.

## Remaining manual acceptance tests — NOT RUN

1. Open the current PR Preview and sign in with the TEST 2 Main Admin account.
2. Verify a real browser session and JWT without sharing tokens or passwords.
3. Request a fresh password recovery email, open its link, set a new password, and sign in again.
4. Save, edit, update, and reload a Branch and Farmer through the browser.
5. Upload a test photo to each private bucket, reopen it using a signed URL, and confirm it is not publicly accessible.
6. Verify real-JWT denial for a non-admin user and anonymous access.

## Known security notice

Supabase Security Advisor reports leaked-password protection is disabled. No workaround or permission bypass was added. Check plan eligibility and enable it only through the supported Supabase Auth setting if available.

## Explicitly not completed

- App-level Branch/Farmer Storage upload and signed-URL readback are not wired into the forms yet.
- No real browser JWT test has passed.
- No PR merge or Production deployment has occurred.

## App-level private photo upload wiring

The TEST 2 client now wires Branch and Farmer photo inputs to their existing private Storage buckets:

- Compresses JPEG/PNG/WebP selections to JPEG before upload.
- Uses `auth.getUser()` before a photo upload and stores objects under the authenticated user's ID and record ID.
- Uses non-upsert uploads with generated object names.
- Stores `photo_path` in the existing Branch/Farmer row and clears the new-photo data URL; legacy `photo_data_url` values remain readable until a photo is replaced.
- Reopens private images with a one-hour signed URL; no public URL is generated.
- If the database write fails after upload, the new object is removed; after a successful replacement, the previous object is removed. Cleanup failures are surfaced rather than silently hidden.
- Both form edit flows restore the existing private or legacy photo preview.

Source-level coverage is in `scripts/test-private-photo-storage-flow.test.cjs` and the Branch/Farmer edit payload tests.

GitHub Actions run [#42528764873](https://github.com/jui603295-sudo/muhaimin-dairy/actions/runs/42528764873) passed all 12 validation/test steps at commit `83e97fe47f2a05d3feac867bea6cb5dc75f96829`.

**Not yet proven:** no real browser JWT has performed an upload/readback, and the Storage buckets still have 0 objects. The actual file transfer and signed-URL reopen must be accepted in the Preview before this is considered complete.
