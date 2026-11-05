# Universal Business Platform Architecture
## Master Architecture Specification — Version 1.0

**Status:** নীতিগতভাবে চূড়ান্ত অনুমোদিত  
**Reference Application:** Muhaimin Dairy  
**First Reference Module:** Branch Management  
**Implementation Status:** Not started; this document defines approved architecture direction only.

## 1. Vision and Objective

একটি নিরাপদ, Modular, Integrated, Offline-First এবং AI-Assisted Business Platform তৈরি করা, যার Shared Foundation ব্যবহার করে ভবিষ্যতে একাধিক স্বাধীন ব্যবসায়িক অ্যাপ তৈরি ও পরিচালনা করা যাবে।

## 2. Core Architecture Principles

1. One Shared Platform, Multiple Independent Applications.
2. Independent Modules with defined responsibilities and contracts.
3. Separate application data, identity and configuration.
4. Secure API-based integration.
5. Preserve existing working code, data and features.
6. TEST before Production.
7. Human control over critical operations.
8. Complete auditability, backup and recoverability.
9. Graceful degradation and dependency isolation.
10. AI remains optional; core application workflows must work without AI.

## 3. Shared Platform Services

- Authentication and Authorization
- Organization and Scope Management
- Backend API and Function Services
- Database, RLS and Integrity Controls
- Audit and Event History
- Application and Module Registry
- Feature and Configuration Management
- Notification Services
- Offline Queue and Synchronization
- Conflict Resolution and Idempotency
- Backup, Restore and Data Portability
- Logging, Monitoring and System Health
- API Versioning
- Data Quality Services
- Dependency Management

## 4. Application Isolation

Each application must have a stable Application ID independent of its display name and its own:
- Data ownership and database boundary
- Configuration and feature settings
- Module Registry
- Access policies and scope
- Audit context
- Backup and recovery policy

Shared services may be reused only through defined, authenticated and authorized APIs/contracts. One application's data or settings must not affect another application.

## 5. Module Architecture

Each Module must define:
- Business responsibility and boundaries
- Authoritative data ownership
- API contract and version
- Validation and integrity rules
- Permission and scope requirements
- Dependencies and failure behavior
- Audit requirements
- Enable, Read-only and Disable behavior
- Test evidence and recovery requirements

Avoid duplicate authoritative data. Modules must not directly mutate another Module's owned data outside its approved contract.

## 6. Module Control and User Permissions

Two separate control planes are required.

**Organization Control:** The Organization Owner controls which Modules or Features are Enabled, Read-only or Disabled.

**User Authorization:** User permissions independently determine what a person may do and which Organization, Branch or Collection Point data they may access.

A request is allowed only when the Module is enabled for the operation, the user has the required permission, the scope matches, backend authorization succeeds, data validation passes and any required approval is complete.

Core Authentication, Authorization, RLS, Data Integrity and Basic Audit cannot be disabled. Disabling a Module must not delete its historical data.

## 7. Security Architecture

- Backend authorization is mandatory for sensitive operations.
- RLS and database constraints provide defense-in-depth.
- Service Role credentials must never be exposed in frontend code.
- Important mutations must pass through authorized Backend APIs/Functions.
- Validate identity, permission, scope, business rules, idempotency and approval.
- Permission revocation must be enforced by the server, including for offline clients.
- Audit critical changes, approvals, access and exports.

## 8. Offline-First Architecture

- Offline-created records remain in a durable, visible synchronization queue.
- Idempotency keys and duplicate prevention protect against repeated submissions.
- Sync failures and retry state must be visible.
- Server-verified data is authoritative.
- Conflicting critical changes must not be silently overwritten; route them for authorized human resolution.
- Financial approvals, payments and ledger mutations require server authorization.
- Offline mode must not bypass permission revocation or approval requirements.

## 9. AI Governance

AI may support:
- Analysis and forecasting
- Anomaly detection
- Smart reporting and recommendations
- Alerts and natural-language query assistance
- Data quality assistance

AI must not autonomously:
- Execute or settle financial payments
- Alter or settle authoritative ledgers
- Approve financial requests
- Change employee permissions
- Suspend or close Branches
- Delete or mutate authoritative business records

AI is advisory. Show relevant source, timeframe and uncertainty. The core application must remain usable without AI.

## 10. Backup, Migration and Recovery

- Inspect current schema, migrations, policies and data before any change.
- Preserve existing data and working features.
- Avoid destructive DROP, TRUNCATE or unnecessary table recreation.
- Take and verify a backup before an approved migration.
- Test migration and recovery in TEST first.
- Require rollback/recovery evidence before Production release.

## 11. Release Governance

Release Gate sequence:
1. Inspect code and intended change.
2. Verify backup and recovery readiness.
3. Validate TEST schema and migrations.
4. Verify Auth, JWT and RLS, including allow and deny cases.
5. Test workflows and data integrity.
6. Verify build and integration.
7. Verify mobile/Android behavior.
8. Run regression and recovery tests.
9. Review evidence and obtain explicit user approval.
10. Release to Production only after approval, then perform post-release verification.

No Production SQL, merge or deployment is authorized merely by approval of this architecture.

## 12. Change Control

For a material architecture change:
- Document the reason and scope.
- Assess impacts on existing applications and modules.
- Review security, data ownership and migration risk.
- Record the decision and approval.
- Version the changed specification.

**Version 1.0 — Approved Architecture Direction. Implementation requires separate, explicit authorization.**
