# Muhaimin Dairy — Farmer Module Development Checklist Register

**Scope:** Farmer registration address cascade, photo, explicit GPS capture, registration timestamp, offline address dataset, and farmer-list display.  
**Feature branch under review:** fix/farmer-address-cascade-2026-10-31  
**Feature PR:** #47 — https://github.com/jui603295-sudo/muhaimin-dairy/pull/47  
**Related TEST-only diagnostic PR:** #48 — https://github.com/jui603295-sudo/muhaimin-dairy/pull/48  
**Register created:** 2026-10-31  
**Release state:** NOT APPROVED — do not merge or deploy based on this checklist.

## 1. Rules that prevent repeated testing

1. Every test has a stable ID. Record its evidence and result here; do not rerun a PASS test merely because another development step started.
2. Rerun only when its listed trigger occurs: relevant source/data/schema change, dependency/runtime change, a regression is reported, or the prior evidence expires/becomes invalid.
3. A changed file does not automatically invalidate every test. Use the impact map in section 5.
4. A test is PASS only when its named evidence exists. Code inspection/static CI is not proof of browser, device, database, Auth/JWT, or live workflow behavior.
5. Keep BLOCKED separate from FAIL. Missing TEST access is BLOCKED, not a successful test.
6. Before any release decision, review this register and add new evidence rather than repeating already valid checks.
7. No Production SQL, policy change, merge, or deployment without the user's separate explicit approval.

## 2. Feature acceptance checklist

| ID | Acceptance requirement | Current assessment | Evidence / notes |
|---|---|---|---|
| F-01 | Preserve existing modules and add only missing farmer features | PASS — source diff review | PR #47; no module replacement |
| F-02 | Bangladesh address cascade: division → district → upazila → union/pourashava | PASS — source/data structural review | data/bangladesh-address.json; dependent selectors in index.html |
| F-03 | Dataset covers all divisions and expected hierarchy counts | PASS — data audit | 8 divisions, 64 districts, 495 upazilas, 4,540 unions, 328 pourashavas |
| F-04 | Thakurgaon Sadar path exists | PASS — data audit | Rangpur → Thakurgaon → Thakurgaon Sadar; 21 unions and Thakurgaon Pourashava |
| F-05 | Missing locality can be entered manually | PASS — source review | Manual locality fallback present |
| F-06 | Farmer photo can be selected/captured and previewed | PARTIAL — source review only | Browser/device file permission and upload/save still unverified |
| F-07 | GPS is explicitly user-triggered; no background tracking | PASS — source review | Capture button and status text; no continuous tracking flow |
| F-08 | GPS coordinates preserve valid zero values | PASS — source review | Empty string is mapped to NULL; numeric zero remains zero |
| F-09 | Registration time is captured at submission and stored | PARTIAL — code + migration review | Payload and migration present; DB insert not verified |
| F-10 | Farmer list displays photo/address/GPS/registration date | PASS — source review | Rendering functions present; live data display unverified |
| F-11 | Address dataset is available in the PWA shell/offline | PASS — source review | sw.js v5 precaches the JSON; real offline device test pending |
| F-12 | Legacy farmer records are not backfilled or rewritten | PASS — migration review | registered_at nullable; migration explicitly leaves old rows NULL |
| F-13 | Existing farmer records remain readable after schema change | BLOCKED | Requires isolated TEST schema + read workflow |
| F-14 | New farmer record persists all fields correctly | BLOCKED | Requires TEST database and authenticated insert/readback |
| F-15 | Duplicate farmer code is checked against loaded and current database records before insert | PARTIAL — source + static CI only | PR #50; check fails closed if lookup errors; no database unique constraint or concurrent-submit guarantee proven |
| F-17 | Mobile-number duplicate policy is defined and enforced | BLOCKED | Shared family phone numbers may be legitimate; business rule and TEST behavior need confirmation |
| F-16 | Main Admin authorization and RLS protect farmer records | BLOCKED | Requires actual Supabase Auth JWT tests; static CI is insufficient |

## 3. Verification ledger — evidence already collected

| Test ID | Test | Result | Evidence | Re-run trigger |
|---|---|---|---|---|
| C-01 | JavaScript syntax / HTML script validation | PASS | PR #47 Actions run #41144081164, static-checks job | Any inline JS change |
| C-02 | HTML DOM IDs and form-handler references | PASS | Same Actions run | Farmer form markup or handlers change |
| C-03 | PWA shell and Service Worker static validation | PASS | Same Actions run | sw.js, app shell, or precache list changes |
| C-04 | Farmer duplicate-code guard is wired before insert and fails closed on lookup errors | PENDING CI | PR #50 workflow assertion | Farmer duplicate guard or farmer submit handler changes |
| D-01 | Address JSON parses and hierarchy counts match | PASS | PR #47 CI validation | Address JSON changes |
| D-02 | Thakurgaon Sadar sample hierarchy exists | PASS | Data audit recorded in PR #47 development evidence | Address JSON changes |
| D-03 | Farmer cascade selector wiring exists | PASS | PR #47 CI/source review | Address form or cascade JS changes |
| DB-01 | Farmer migration SQL reviewed for legacy-row preservation | PASS — static review only | 202610310001_farmer_registered_at.sql | Migration changes |
| DB-02 | Required photo/GPS/timestamp columns exist in TEST | BLOCKED | TEST project is not currently available | When isolated TEST is accessible |
| DB-03 | Farmers RLS policies and JWT behavior | BLOCKED | No real TEST Auth/JWT run | When isolated TEST Auth is accessible or policy changes |
| DB-04 | Database unique constraint prevents concurrent duplicate farmer codes | BLOCKED | No schema/constraint evidence; client preflight alone is not atomic | When isolated TEST schema is accessible; inspect duplicates first, then add/test a safe unique constraint if business rules permit |
| UI-01 | Real Android/mobile form interaction | BLOCKED | No device/browser evidence yet | First authorized TEST preview session |
| OFF-01 | Offline address selector works after first install | BLOCKED | Static precache review only | Service Worker or dataset changes; first device run |
| REG-01 | Existing farmer and milk collection workflows unaffected | BLOCKED | No integration/regression runtime evidence | Before release; rerun only impacted workflows after later changes |

## 4. Required next verification sequence

Do these once, in order, and record evidence in this file:

1. **TEST schema preflight:** run the SELECT-only diagnostic in PR #48 against the isolated TEST database. Save query output. Do not point it at Production.
2. **Migration compatibility:** confirm the farmers table and all six expected columns/types. Confirm migration ledger status before applying any migration. Resolve mismatches before proceeding.
3. **TEST migrations:** apply only the reviewed farmer migrations to TEST, then record migration versions and resulting schema.
4. **Auth/RLS:** run actual authenticated Main Admin and non-admin JWT checks for SELECT/INSERT/UPDATE; verify unauthorized access is denied. Never infer this from mocked CI.
5. **Persistence:** create one clearly synthetic TEST farmer, verify photo, address hierarchy, GPS including coordinate zero, and registered_at by reading the row back. Then test duplicate farmer code, concurrent duplicate submissions, and mobile-number policy; clean up the synthetic row in TEST.
6. **Mobile/offline:** use the PR preview on Android; test address cascade online, then reload offline after the first successful cache install. Record device/browser, steps, result, and screenshots or logs.
7. **Regression:** verify only the affected Farmer workflows plus the agreed Milk Collection options; do not expand into unrelated module comparisons.
8. **Recovery:** export/confirm a TEST backup, verify a safe recovery path, and ensure no production data was touched.
9. **Release review:** update the status table, attach evidence, and request explicit approval before merge/deploy.

## 5. Impact map — which tests need rerunning?

| Changed area | Re-run |
|---|---|
| data/bangladesh-address.json | D-01, D-02, D-03, OFF-01 |
| Farmer address HTML/JS | C-01, C-02, D-03, UI-01, relevant REG-01 |
| Photo compression/preview/save code | C-01, C-02, F-06, DB-02, DB-03, persistence test, UI-01 |
| GPS capture or serialization | C-01, C-02, F-07, F-08, DB-02, persistence test, UI-01 |
| Registration timestamp code/migration | C-01, C-02, DB-01, DB-02, persistence test |
| RLS/policy/auth code | DB-03 and relevant integration/regression tests |
| sw.js or app shell | C-03, OFF-01, UI-01 |
| Unrelated module source | Only tests affected by the dependency/DOM/data impact review; do not rerun this entire suite by default |

## 6. Current release gate

- [x] Code changes committed on a feature branch.
- [x] Static CI for PR #47 passed.
- [x] Address dataset and cascade structure reviewed.
- [x] Migration reviewed without executing it.
- [ ] Isolated TEST database schema verified.
- [ ] TEST migrations applied and verified.
- [ ] Real Auth/JWT/RLS checks passed.
- [ ] Farmer create/readback and duplicate behavior passed.
- [ ] Android and offline runtime checks passed.
- [ ] Regression and recovery evidence recorded.
- [ ] User's explicit release approval received.
- [ ] Merge/deploy and post-release verification.

**Current decision: HOLD.** Development evidence is useful and several static checks are complete, but runtime/database security evidence is still missing. This register is the source of truth for future test reuse; update individual rows and their evidence instead of restarting the same test suite.
