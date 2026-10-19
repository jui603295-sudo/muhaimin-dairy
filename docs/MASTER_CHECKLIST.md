# Muhaimin Projects — Master Checklist

Version: 1.5. This checklist is the single source of truth. An unchecked item is not complete. Record evidence, commit/PR, dependencies and last-tested version before marking LOCKED.

## A. Governance and non-disruptive development
- [ ] GOV-01 Inventory earlier requirements and current implementation.
- [ ] GOV-02 Assign stable IDs, acceptance criteria and dependencies.
- [ ] GOV-03 Record branch, PR, commit SHA and test evidence.
- [ ] GOV-04 Preserve working code; prefer focused changes over rewrites.
- [ ] GOV-05 Track limitations and blockers honestly.
- [ ] GOV-06 Keep TEST, STAGING and LIVE projects, credentials and data separate.
- [ ] GOV-07 Keep new development isolated from released customer versions.
- [ ] GOV-08 Version releases and define rollback before production change.

## B. Ecosystem portability and independent server migration — every app
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
- [ ] ECO-13 Rehearse clean deployment to a separate test host/environment.
- [ ] ECO-14 Document DNS/TLS, secrets, storage, jobs, database migration, cutover and rollback.
- [ ] ECO-15 Reconcile data counts/integrity after test migration.

## C. Reliability, backup and disaster recovery
- [ ] RELIAB-01 Define availability target, Recovery Point Objective and Recovery Time Objective.
- [ ] RELIAB-02 Configure automated backups and documented retention.
- [ ] RELIAB-03 Keep protected independent backup copies where feasible.
- [ ] RELIAB-04 Perform and record restore drills in TEST.
- [ ] RELIAB-05 Monitor uptime, errors, database/storage capacity, jobs and backup status.
- [ ] RELIAB-06 Define alerts, incident owner, customer communication and escalation.
- [ ] RELIAB-07 Document rollback, disaster restore and data reconciliation steps.
- [ ] RELIAB-08 Identify single points of failure and assess redundancy/failover against budget.
- [ ] RELIAB-09 Test graceful network failure and safe recovery for supported offline workflows.
- [ ] RELIAB-10 Never claim zero downtime or zero data-loss risk; report measured evidence and residual risks.

## D. Code and TEST database
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

## E. Muhaimin Dairy feature acceptance
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

## F. Customer release gate
- [ ] RELEASE-01 Applicable acceptance tests pass and evidence is recorded.
- [ ] RELEASE-02 No blocking defect remains, or exception is explicitly approved.
- [ ] RELEASE-03 Backup, restore and rollback plan verified.
- [ ] RELEASE-04 Monitoring, alerting, incident response and recovery objectives documented.
- [ ] RELEASE-05 Target commit, migration list and deployment target identified.
- [ ] RELEASE-06 Customer usability, access control and production smoke tests pass.
- [ ] RELEASE-07 User explicitly approves live deployment.
- [ ] RELEASE-08 Actual deployment and live smoke test are verified and release version recorded.
- [ ] RELEASE-09 New development can continue on isolated branches without changing the released version.

## G. Configurable community-service and national-development messages — every app
- [ ] SLOGAN-01 Authorized administrators can configure message text and language.
- [ ] SLOGAN-02 Placement, visibility and active period can be configured.
- [ ] SLOGAN-03 Messages are appropriate, readable on mobile and do not disrupt critical tasks.
- [ ] SLOGAN-04 Approval ownership, permissions and change history are documented.
- [ ] SLOGAN-05 Messages do not falsely imply official endorsement or affiliation.
- [ ] SLOGAN-06 Standalone app messages work without an ecosystem connector.
- [ ] SLOGAN-07 Edit, publish, hide, language and role tests pass.

## Current ledger
| ID | Requirement | Status | Next evidence needed |
|---|---|---|---|
| BASE-01 | Consolidate previous requirements against current code | IN PROGRESS | Verified gap inventory |
| OFF-01 | Offline cache/startup | IN PROGRESS | Privacy, quota, role and device tests |
| OFF-02 | Milk collection queue/sync | IN PROGRESS | Replay intentionally disabled; TEST JWT/RLS, unique index and idempotent replay tests |
| MILK-UI-01 | Milk collection settings labels accurately describe implemented features | CODE COMPLETE | Static workflow and browser/device acceptance tests |
| MILK-CI-01 | Static CI guard for TEST-only idempotency migration and replay safety | CODE COMPLETE | Validate Muhaimin Dairy run #101 passed (commit `31fe05898a86aae7d78540767f41fe347fc05ee5`); SQL/RLS not executed |
| MILK-QUEUE-BACKUP-01 | Download local pending Milk Collection records as user-scoped JSON without server writes | CODE COMPLETE | Implementation added; validate new CI assertion and browser download, personal-data handling remains a manual acceptance test |
| MILK-OFF-01 | Prevent unverified queued writes from replaying to Supabase | CODE COMPLETE | Replay disabled on feature branch; TEST security/idempotency gate still required |
| MILK-PHOTO-01 | Actual sample photo upload/storage | PLANNED | Choose TEST storage bucket, size/type limits, access policy and retention |
| MILK-SCALE-01 | Physical scale integration | PLANNED | Identify device/protocol and test hardware; current toggle is configuration only |
| SEC-01 | Main Admin/restricted-role security | IN PROGRESS | PR #13 remains unmerged; test real JWT/RLS |
| ECO-01 | Ecosystem portability | IN PROGRESS | Apply checklist and test extraction per app |
| RELIAB-01 | Backup, restore and server resilience | PLANNED | Define per-app targets, providers and tested recovery |
| RELEASE-01 | Independent customer release | PLANNED | Complete release gate and explicit approval |
