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
| F-15 | Duplicate farmer code/mobile behavior is safe | BLOCKED | Need inspect actual constraints/business rules and test duplicate submission in TEST |
| F-16 | Main Admin authorization and RLS protect farmer records | BLOCKED | Requires actual Supabase Auth JWT tests; static CI is insufficient |

## 3. Verification ledger — evidence already collected

| Test ID | Test | Result | Evidence | Re-run trigger |
|---|---|---|---|---|
| C-01 | JavaScript syntax / HTML script validation | PASS | PR #47 Actions run #41144081164, static-checks job | Any inline JS change |
| C-02 | HTML DOM IDs and form-handler references | PASS | Same Actions run | Farmer form markup or handlers change |
| C-03 | PWA shell and Service Worker static validation | PASS | Same Actions run | sw.js, app shell, or precache list changes |
| D-01 | Address JSON parses and hierarchy counts match | PASS | PR #47 CI validation | Address JSON changes |
| D-02 | Thakurgaon Sadar sample hierarchy exists | PASS | Data audit recorded in PR #47 development evidence | Address JSON changes |
| D-03 | Farmer cascade selector wiring exists | PASS | PR #47 CI/source review | Address form or cascade JS changes |
| DB-01 | Farmer migration SQL reviewed for legacy-row preservation | PASS — static review only | 202610310001_farmer_registered_at.sql | Migration changes |
| DB-02 | Required photo/GPS/timestamp columns exist in TEST | BLOCKED | TEST project is not currently available | When isolated TEST is accessible |
| DB-03 | Farmers RLS policies and JWT behavior | BLOCKED | No real TEST Auth/JWT run | When isolated TEST Auth is accessible or policy changes |
| UI-01 | Real Android/mobile form interaction | BLOCKED | No device/browser evidence yet | First authorized TEST preview session |
| OFF-01 | Offline address selector works after first install | BLOCKED | Static precache review only | Service Worker or dataset changes; first device run |
| REG-01 | Existing farmer and milk collection workflows unaffected | BLOCKED | No integration/regression runtime evidence | Before release; rerun only impacted workflows after later changes |

## 4. Required next verification sequence

Do these once, in order, and record evidence in this file:

1. **TEST schema preflight:** run the SELECT-only diagnostic in PR #48 against the isolated TEST database. Save query output. Do not point it at Production.
2. **Migration compatibility:** confirm the farmers table and all six expected columns/types. Confirm migration ledger status before applying any migration. Resolve mismatches before proceeding.
3. **TEST migrations:** apply only the reviewed farmer migrations to TEST, then record migration versions and resulting schema.
4. **Auth/RLS:** run actual authenticated Main Admin and non-admin JWT checks for SELECT/INSERT/UPDATE; verify unauthorized access is denied. Never infer this from mocked CI.
5. **Persistence:** create one clearly synthetic TEST farmer, verify photo, address hierarchy, GPS including coordinate zero, and registered_at by reading the row back. Then test duplicate code/mobile behavior and clean up the synthetic row in TEST.
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


## 7. Latest evidence update — 2026-10-31

The following checks were added after this register was first created. These are deterministic Node.js/VM/DOM simulations of the actual application source; they are not real Android/browser sessions or database persistence tests.

| Test ID | Test | Result | Evidence | Limitation / re-run trigger |
|---|---|---|---|---|
| F-17 | Farmer failed insert preserves form values and compressed photo/preview state | PASS — 38/38 Farmer save/photo/GPS/offline suite | PR #70; Actions run #41155835086, static-checks job | Mocked database response; real TEST insert/readback remains DB-blocked |
| F-18 | Successful Farmer insert clears photo/form state only after successful database response | PASS — included in F-17 suite | Same run | Re-run if insert/reset ordering changes |
| F-19 | Farmer photo validation, compression and rendering boundaries | PASS — included in F-17 suite | Same run; MIME allowlist, malformed Base64, size cap and selection-race regressions covered | Real device camera/gallery permission and persisted photo retrieval remain unverified |
| F-20 | GPS permission/error/range handling and stale-request race protection | PASS — included in F-17 suite | Same run; out-of-order callbacks and invalid coordinate ranges covered | Real Android browser permission and location accuracy remain unverified |
| F-21 | Offline Farmer snapshot is user-scoped and restores photo/GPS metadata safely | PASS — included in F-17 suite | Same run; wrong-user restore, missing snapshot and quota failure covered | Local snapshot is not a write queue; real device storage behavior remains unverified |
| F-22 | Offline Farmer submit blocks network write and preserves form for reconnect retry | PASS — included in F-17 suite | Same run; offline submit and reconnect retry covered | No automatic replay queue; real online/offline transition remains unverified |
| C-04 | Full static workflow: HTML/PWA, Service Worker, address picker, dataset and Farmer runtime suites | PASS | Actions run #41155835086; job static-checks completed successfully, all steps passed | Does not establish TEST database, real browser/device, or release readiness |

### Current environment evidence and next action

- Supabase project inventory currently returns only hhqshslzoznwyprhjzia (Jui Akter, ap-northeast-1, ACTIVE_HEALTHY). This is the Production project already identified for this application; no separate usable TEST project is currently available in the account inventory.
- Therefore DB-02, DB-03, UI-01, OFF-01, REG-01 and the TEST migration/persistence/recovery steps remain BLOCKED, not PASS.
- Do not run the TEST-only diagnostic from PR #48 against the Production project. Do not apply migrations, execute test inserts, change RLS, create storage buckets, or use Production as a substitute TEST environment.
- Vercel Preview for the latest code remains unconfirmed because the Free plan daily deployment limit was reached. A previously Ready deployment does not prove the latest head.
- Continue safe repository-side work and deterministic tests only. The next release-gate action is to restore/provision an isolated TEST environment through an approved path, then resume section 4 in order. Do not merge or deploy while the gate is HOLD.

**Updated decision: HOLD.** CI simulation evidence is stronger, but no database/device/recovery gate has been satisfied by these tests.


## 8. SQL diagnostic safety suite — 2026-10-31

| Test ID | Test | Result | Evidence | Limitation |
|---|---|---|---|---|
| DB-04 | Farmer schema, photo/GPS/Storage, and duplicate-code SQL diagnostics contain only SELECT/read-only CTE statements | PASS — static source validation | PR #71; Actions run #41156709784; job static-checks SUCCESS | Does not execute SQL or prove target DB schema, RLS, Storage configuration, or JWT behavior |
| C-05 | Full CI workflow including the new SQL diagnostic safety test | PASS | Actions run #41156709784; all nine validation/test steps completed successfully | Simulation/static checks only; no real database/device verification |

- The safety suite strips SQL comments and string literals before checking executable statements.
- It checks all three diagnostic files and rejects mutation/DDL/permission-changing commands.
- 21 SQL statements were independently inspected; all 21 began with SELECT or WITH and none matched the mutation-command guard.
- PR #71 is a Draft stacked on PR #70. It is not merged.
- No SQL was executed against Supabase. The TEST-only diagnostics must not be run against Production.

**Release decision remains HOLD.** DB-02/DB-03, actual TEST migration/persistence, Android/offline device, regression and recovery evidence remain blocked pending an isolated TEST environment and approved runtime access.


## 9. Farmer GPS quality and save-time revalidation — 2026-10-31

| Test ID | Acceptance criterion | Source/runtime evidence | Status | Remaining proof |
|---|---|---|---|---|
| F-27 | Farmer GPS is requested only after an explicit user tap; no background tracking is introduced | PR #77, `index.html` Farmer GPS handler | Source implemented; selected local runtime harness PASS | GitHub Actions CI and Android permission/location session |
| F-28 | Reject malformed/out-of-range coordinates, non-finite/negative accuracy, and accuracy worse than 150 m; clear invalid values | PR #77; local runtime checks for valid fix and 151 m rejection | Selected local runtime checks PASS | Full committed test suite in GitHub Actions; real device GPS quality |
| F-29 | Reject invalid, future-dated, or older-than-10-minute GPS timestamps at capture and revalidate accuracy/freshness immediately before save | PR #77; submit-time validator source and selected stale-fix test | Source implemented; selected local runtime checks PASS | Full CI and Android/browser verification |
| F-30 | Ignore late callbacks from earlier location requests and recover the capture button after failures | PR #77; committed tests include callback-race and permission-error cases | Committed tests added; CI not yet confirmed | GitHub Actions result |
| F-31 | Unchanged legacy Farmer coordinates without historical accuracy/timestamp remain editable; changed/new coordinates require complete fresh metadata | PR #77; submit-time validator source and local legacy-edit check | Selected local runtime check PASS | Full CI and actual TEST UPDATE/readback |

- PR #77 changes only the existing Farmer GPS handler, its runtime test, and CI workflow; no database schema or data changes.
- The selected local checks parse inline scripts and exercise valid capture, poor-accuracy rejection, unchanged legacy GPS edit, and stale submit rejection. They are not a substitute for the complete Node test suite or CI.
- GitHub Actions run for PR #77 was not yet available at the time this entry was written; do not label CI as passed.
- Real Supabase TEST UPDATE/JWT/RLS, Android/browser permission behavior, regression/recovery, and release approval remain BLOCKED.

**Release decision: HOLD.** No merge, SQL execution, Production mutation, or deployment is authorized by this checklist update.


## 10. CI confirmation — Farmer GPS quality suite — 2026-10-31

| Test ID | Test | Result | Evidence | Limitation / re-run trigger |
|---|---|---|---|---|
| F-27 | Explicit-tap GPS capture; no background tracking | PASS — committed CI suite | PR #77, Actions run #41177242209, job #124467223015 | Real Android/browser permission and GPS session remains unverified |
| F-28 | Coordinate bounds, accuracy finite/non-negative and <=150 m | PASS — committed CI suite | Same run; step “Test Farmer GPS accuracy, freshness, and submit validation” | Real device GPS quality remains unverified |
| F-29 | Reject invalid/future/stale timestamps and revalidate at submit | PASS — committed CI suite | Same run | Actual TEST save/update/readback remains blocked |
| F-30 | Ignore late callbacks; recover capture control after errors | PASS — committed CI suite | Same run | Real browser/device callback behavior remains unverified |
| F-31 | Preserve unchanged legacy coordinates during edit; require fresh metadata for changed/new GPS | PASS — committed CI suite | Same run | Actual TEST UPDATE/readback remains blocked |
| C-06 | Full PR #77 static/VM-DOM validation workflow | PASS — all job steps completed successfully | Actions run #41177242209, run #295, job #124467223015 | CI simulation does not prove Supabase persistence, Auth/JWT/RLS, Android, or release readiness |

- Commit tested: c6eabd0851dc8ac4f1888c1bddbeb53a885fd493.
- CI steps included HTML/PWA validation, Branch GPS capture/race safety, Branch/Farmer save-readback mapping tests, Farmer GPS quality/freshness/submit validation, and Branch/Farmer edit/update tests.
- PR #77 remains open and unmerged. No database schema changes, SQL execution, Production mutation, or deployment occurred.
- Supabase inventory still reports Production project hhqshslzoznwyprhjzia as ACTIVE_HEALTHY and the separate TEST project fsfhucggzurwulubpagy as COMING_UP. Therefore TEST JWT/RLS, Farmer persistence/readback, Android GPS, offline device behavior, regression/recovery, and release approval remain BLOCKED.
- Do not run TEST-only diagnostics or synthetic writes against Production. Do not merge or deploy while the release gate is HOLD.

**Updated release decision: HOLD.** CI is now confirmed PASS; the outstanding TEST and device gates are unchanged.
