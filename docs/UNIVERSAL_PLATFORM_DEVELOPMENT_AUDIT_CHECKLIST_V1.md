# Universal Business Platform
## Development, Security & Release Audit Checklist — Version 1.0

**Purpose:** Evidence-based inspection and safe development of the existing Muhaimin Dairy application.  
**Status:** Checklist prepared; execution not started by this document.

## Phase A — Existing System Inspection

- [ ] Inspect GitHub repository structure and active branches.
- [ ] Inventory existing Modules and features.
- [ ] Inspect build, CI, branch and deployment workflows.
- [ ] Inventory current database schema and relationships.
- [ ] Inspect migrations and migration history.
- [ ] Inspect Auth, JWT and protected routes.
- [ ] Inspect RLS policies, including allow and deny behavior.
- [ ] Inspect Storage buckets and policies.
- [ ] Inspect application configuration and environment boundaries.
- [ ] Inspect existing backup and restore evidence.

**Gate:** No code/schema change before inspection and documented findings.

## Phase B — Architecture and Data Ownership

- [ ] Check compliance with Master Architecture.
- [ ] Define application isolation and stable Application ID.
- [ ] Inventory Module ownership and registry.
- [ ] Verify Branch and Point stable identifiers.
- [ ] Define API contracts and versioning.
- [ ] Confirm no duplicate authoritative data.
- [ ] Review dependencies and failure isolation.
- [ ] Review migration compatibility and rollback plan.

**Gate:** No implementation until data ownership and dependencies are reviewed.

## Phase C — Security and Permissions

- [ ] Verify Main Admin authentication.
- [ ] Verify JWT validation.
- [ ] Verify role-based permissions.
- [ ] Verify Organization scope.
- [ ] Verify Branch scope.
- [ ] Verify Collection Point scope.
- [ ] Verify unauthorized access is denied.
- [ ] Run RLS positive/allow tests.
- [ ] Run RLS negative/deny tests.
- [ ] Verify Backend authorization.
- [ ] Verify sensitive-data masking.
- [ ] Verify audit events and access history.

**Gate:** Both allow and deny evidence are required.

## Phase D — Branch Workflows

- [ ] Branch create/read/update.
- [ ] Collection Point create/read/update.
- [ ] Organization → Branch → Point hierarchy.
- [ ] GPS capture, accuracy and verification.
- [ ] Staff assignment and multiple roles.
- [ ] Scope-specific assignment.
- [ ] Assignment expiry and access revocation.
- [ ] Point transfer approval and history.
- [ ] Branch/Point suspension and closure.
- [ ] Historical data retention.

## Phase E — Business Integration

- [ ] Farmer integration.
- [ ] Multi-Point Farmer collection.
- [ ] Farmer ledger consolidation.
- [ ] Milk Collection integration.
- [ ] Quality and Batch integration.
- [ ] Accounts and Payments integration.
- [ ] Expense request and approval workflow.
- [ ] Salary-based approval calculation.
- [ ] Category-based approval.
- [ ] Reports and controlled exports.

## Phase F — Offline and Data Integrity

- [ ] Offline record creation.
- [ ] Durable queue persistence.
- [ ] Retry behavior.
- [ ] Idempotency.
- [ ] Duplicate prevention.
- [ ] Conflict detection.
- [ ] Human conflict resolution.
- [ ] Permission revocation behavior.
- [ ] Financial server authorization.
- [ ] Sync status and error visibility.

## Phase G — Dashboard and Mobile

- [ ] Organization Overview.
- [ ] Branch Overview.
- [ ] Collection Point View.
- [ ] Source timestamps.
- [ ] Stale-data labels.
- [ ] Sync-pending labels.
- [ ] Module failure fallback.
- [ ] Android layout and navigation.
- [ ] GPS accuracy display.

## Phase H — Backup and Recovery

- [ ] Pre-change backup.
- [ ] Backup integrity verification.
- [ ] Restore procedure validation.
- [ ] Historical data verification.
- [ ] Migration rollback plan.
- [ ] Recovery evidence.
- [ ] Audit history preservation.

## Phase I — Build and Regression

- [ ] Build succeeds.
- [ ] Existing Modules remain functional.
- [ ] Existing data is preserved.
- [ ] Integration tests pass.
- [ ] Regression tests pass.
- [ ] Mobile tests pass.
- [ ] Error handling is verified.
- [ ] Performance baseline is recorded.

## Phase J — Release Gate

- [ ] TEST evidence complete.
- [ ] Security review complete.
- [ ] Backup/recovery evidence complete.
- [ ] Regression evidence complete.
- [ ] User review complete.
- [ ] Explicit Production approval received.
- [ ] Production release performed only after approval.
- [ ] Post-release verification complete.

## Evidence Register

For each checklist item, record:
- Test ID
- Test date
- Environment (TEST or Production)
- Test method
- Expected result
- Actual result
- Evidence location
- Pass / Fail / Blocked
- Reviewer
- Retest requirement

## Non-Negotiable Rules

1. Do not damage or replace existing working code or data.
2. No destructive SQL without explicit scope, review and approval.
3. No Production change without TEST evidence.
4. PR merge and deployment require explicit approval.
5. Do not repeat passed tests without a reason; retest when evidence is missing or a relevant change invalidates it.
6. Record each change, result and evidence location.
7. On failure, document root cause, corrective action and retest.

**Release Status:** HOLD / Not started. This checklist defines verification requirements; it is not authorization to execute changes.
