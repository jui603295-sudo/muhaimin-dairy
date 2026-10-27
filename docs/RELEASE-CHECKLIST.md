# Muhaimin Dairy Release Checklist

Updated: 2026-10-28

This checklist distinguishes source/CI evidence from real integration and device evidence. A checked static test is not a substitute for TEST Supabase, JWT/RLS, or Android testing.

## Source and CI
- [x] Existing module registry validation and dependency-order test passes in GitHub Actions.
- [x] Existing UI route-to-module audit test passes in GitHub Actions.
- [x] Supabase TEST environment guard test passes in GitHub Actions.
- [x] Cheese Home local prospect notebook static test passes in GitHub Actions.
- [x] HTML validation workflow passes for the current PR commit.
- [ ] Review PR diff against the latest intended base branch and resolve any divergence before merge.

## TEST Supabase access and integration
- [ ] TEST Supabase project is visible and confirmed ACTIVE.
- [ ] TEST-only Project URL and anon/publishable key are available and stored locally, not committed.
- [ ] Browser Network inspection proves `?env=test` sends requests only to the TEST host.
- [ ] Confirm TEST-mode startup fails closed if the config is absent, invalid, or contains Production URL/key.
- [ ] Apply/review required schema and migrations in TEST only.
- [ ] JWT tests: signed-out access, Main Admin, unauthorized user, expired/invalid session.
- [ ] RLS tests: permitted CRUD, cross-user/unauthorized reads and writes denied, branch/data ownership enforced.
- [ ] CRUD and integrity tests: duplicate prevention, constraints, transactions, error handling, audit events.
- [ ] Backup/restore rehearsal in TEST and reconciliation of row counts.

Current blocker: the connected Supabase project list returned only the Production project. Access to the previously mentioned TEST project ref was denied by the connected account. Therefore the TEST project status and live JWT/RLS results are unverified.

## Module and workflow validation
- [ ] Verify Main Home keeps only intended top-level modules.
- [ ] Verify Milk Center navigation has one active page at a time.
- [ ] Verify Cheese Home opens from Milk Center home and its navigation item.
- [ ] Verify local Cheese Home drafts save, render escaped text, delete, and remain user-scoped; document that they do not sync.
- [ ] Verify collection, farmer, branch, payment, quality/batch, chiller, reconciliation/loss, finance, feed, veterinary, agro, reports, farmer ledger, settings, backup, and audit-log flows against TEST data.
- [ ] Verify dates and timestamps use DD-MM-YYYY and Asia/Dhaka where required.
- [ ] Verify future/offline sync, hardware, and AI options remain gated until their own TEST evidence exists.
- [ ] Verify app remains usable without optional AI features.

## Android and regression
- [ ] Install/open the candidate build on the actual Android phone.
- [ ] Verify login/logout, refresh/reconnect, responsive navigation, keyboard/forms, direct farmer call, reports/share/print.
- [ ] Verify offline display only shows clearly timestamped cached data; no unverified offline write is treated as synced.
- [ ] Verify no duplicate IDs, missing route targets, uncaught JS errors, or broken links.
- [ ] Run end-to-end regression across all existing modules with TEST data.
- [ ] Save screenshots/logs/test records and document known limitations.

## Release gate
- [ ] All required checks above pass or a specific non-blocking exception is documented and approved.
- [ ] Backup and rollback steps are verified.
- [ ] User reviews final evidence and authorizes merge/deploy.
- [ ] Only then merge/deploy and perform post-release smoke tests.

## Current release decision
**NOT READY FOR PRODUCTION.** Static CI passes, but TEST Supabase access, live JWT/RLS, database CRUD, and real Android testing are not yet proven. No Production database change, merge, or deployment was performed as part of this work.
