# Muhaimin Projects — Master Checklist

Version: 1.1. This checklist is the single source of truth. An unchecked item is not complete. Record evidence, commit/PR, dependencies and last-tested version before marking LOCKED.

## Governance
- [ ] GOV-01 Inventory all earlier requirements and current implementation.
- [ ] GOV-02 Assign stable IDs, acceptance criteria and dependencies.
- [ ] GOV-03 Record branch, PR, commit SHA and test evidence.
- [ ] GOV-04 Preserve working code; prefer focused changes over rewrites.
- [ ] GOV-05 Track limitations and blockers honestly.
- [ ] GOV-06 Keep TEST and LIVE projects, credentials and data separate.

## Ecosystem portability — required for every Muhaimin app
- [ ] ECO-01 Separate domain logic, UI, data access and integrations.
- [ ] ECO-02 Document versioned APIs/events for app-to-app communication.
- [ ] ECO-03 Use replaceable connectors/adapters for ecosystem services.
- [ ] ECO-04 Externalize environment configuration; never commit secrets.
- [ ] ECO-05 Document data ownership, identifiers, schema and migrations.
- [ ] ECO-06 Avoid undocumented cross-app database writes and hidden coupling.
- [ ] ECO-07 Document standalone authentication and server-side authorization.
- [ ] ECO-08 Test authorized export/import and backup/restore on TEST data.
- [ ] ECO-09 Maintain dependency inventory and standalone extraction runbook.
- [ ] ECO-10 Test core app features without another app's UI.
- [ ] ECO-11 Test ecosystem-connected and standalone modes.
- [ ] ECO-12 Document essential external services and safe alternatives/degraded mode.

## Code and TEST database
- [ ] CODE-01 Validate syntax, DOM references, forms and assets.
- [ ] CODE-02 Build and static checks pass.
- [ ] CODE-03 Review changes for security, error handling and minimal scope.
- [ ] DB-01 Confirm TEST project is separate from LIVE.
- [ ] DB-02 Restore verified backup or prepare TEST seed data.
- [ ] DB-03 Review migration order, preconditions and recovery plan.
- [ ] DB-04 Run duplicate-data preflight checks before unique constraints.
- [ ] DB-05 Verify schema, indexes, constraints and foreign keys.
- [ ] DB-06 Test real JWT/RLS for Main Admin and restricted roles.
- [ ] DB-07 Confirm unauthorized operations fail and authorized operations succeed.
- [ ] DB-08 Verify audit log, identity and timestamps.

## Muhaimin Dairy feature acceptance
- [ ] DAIRY-01 Branches, targets and statuses.
- [ ] DAIRY-02 Farmer records, branch association, phone and validation.
- [ ] DAIRY-03 Milk collection calculations and saved values.
- [ ] DAIRY-04 Separate quality review, screening and reviewer audit.
- [ ] DAIRY-05 Duplicate prevention and idempotent offline retry.
- [ ] DAIRY-06 Farmer payments, balances and ledger reconciliation.
- [ ] DAIRY-07 Feed/Veterinary/Agro purchases, sales, stock and expiry.
- [ ] DAIRY-08 Reports/ledger filters, totals, print/PDF/share.
- [ ] DAIRY-09 DD-MM-YYYY dates and Asia/Dhaka timestamps.
- [ ] DAIRY-10 Backup/restore, audit log and error handling.
- [ ] DAIRY-11 Settings demonstrably control their promised behavior.
- [ ] DAIRY-12 Bangladesh address hierarchy where implemented.
- [ ] DAIRY-13 Server-enforced role-based access.
- [ ] DAIRY-14 PWA installation/cache and device offline tests.
- [ ] DAIRY-15 Queue sync, conflict recovery and no duplicate writes.
- [ ] DAIRY-16 Core operations work without optional AI.
- [ ] DAIRY-17 Assets and mobile UI verified.

## Release gate
- [ ] REL-01 Applicable acceptance tests pass and evidence is recorded.
- [ ] REL-02 No blocking defect remains, or exception is explicitly approved.
- [ ] REL-03 Backup and rollback plan verified.
- [ ] REL-04 Target commit and migration list identified.
- [ ] REL-05 User explicitly approves live deployment.
- [ ] REL-06 Deployment and live smoke test are actually verified.

## Current ledger
| ID | Requirement | Status | Next evidence needed |
|---|---|---|---|
| BASE-01 | Consolidate previous requirements against current code | IN PROGRESS | Verified gap inventory |
| OFF-01 | Offline cache/startup | IN PROGRESS | Privacy, quota, role and device tests |
| OFF-02 | Milk collection queue/sync | IN PROGRESS | TEST JWT/RLS and idempotent replay tests |
| SEC-01 | Main Admin/restricted-role security | IN PROGRESS | PR #13 remains unmerged; test real JWT/RLS |
| ECO-01 | Ecosystem portability | PLANNED | Apply this checklist and test extraction per app |
| REL-01 | TEST → Build → Verify → Fix → Re-test → Lock | PLANNED | Do not skip gates or alter LIVE without approval |
