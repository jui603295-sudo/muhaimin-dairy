# Universal Business Platform
## Branch Management Module Specification — Version 1.0

**Parent Architecture:** Universal Business Platform Architecture — Version 1.0  
**Status:** নীতিগতভাবে অনুমোদিত Specification  
**Implementation Status:** Not started

## 1. Purpose

Organization-এর Branch এবং Collection Point-এর প্রশাসনিক, ভৌগোলিক, কর্মী, কার্যক্রম, আর্থিক, নিরাপত্তা ও রিপোর্টিং ব্যবস্থাপনা।

## 2. Hierarchy and Identity

Organization → Branch → Collection Point

Each Branch and Collection Point must have a stable unique ID/code independent of its display name. Each Point has its own location, GPS metadata, staff assignments, operational state and collection records.

A Point may be suspended or closed without disabling other Points. Transfers require approval and preserve history.

## 3. Integrated Dashboard

Views:
- Organization Overview
- Branch Overview
- Collection Point View

Dashboard is not an authoritative data store. It consumes approved Module APIs and displays source and last-updated time. Stale, incomplete or sync-pending data must be clearly identified. A Module failure should not unnecessarily disable other Modules; use graceful fallback.

## 4. Twelve Feature Groups

1. **Branch Core:** Branch/Point profile, IDs, codes, address, type, status and lifecycle.
2. **Location & GPS:** Coordinates, accuracy, maps, verification, geofence, location history and offline queue.
3. **Staff Management:** Assignments, managers, multiple roles, transfers and access lifecycle.
4. **Operations Integration:** Farmer, Milk Collection, Quality/Batch, Chiller, Accounts, Feed/Inventory, Veterinary, Processing and Supply summaries.
5. **Target & Performance:** Daily/weekly/monthly targets, actuals, growth, quality, payment timeliness, comparisons and trends.
6. **Accounts & Payment Control:** Financial summaries, pending/completed farmer payments, receivables/payables, expenses, approval and reconciliation. Accounts remains authoritative for financial records.
7. **Governance & Approval:** Owner control, RBAC, Branch/Point scope, workflows, critical-change approval and audit.
8. **Reports & Analytics:** Collection, farmer, quality, finance, staff and target reports, export and report history.
9. **AI Branch Intelligence:** Anomaly detection, smart GPS insights, report assistant, performance advisor, alerts, query assistant, forecasting and data quality advice.
10. **Notifications & Alerts:** Collection drops, pending payments, quality, GPS, approvals, suspicious activity, backup and sync.
11. **Settings & Configuration:** Branch profile, operating hours, contacts, Point configuration, targets, notifications, GPS, feature controls and data access. Global and Branch settings remain separate.
12. **Backup, Recovery & Data Quality:** Export, recovery, history, duplicate detection, offline sync and backup status. No automatic destructive merge/delete of duplicates.

## 5. Roles, Permissions and Scope

Proposed roles:
- Organization Owner / Main Admin
- Organization Admin
- Branch Manager
- Collection Point Manager
- Collection Officer
- Accounts Officer
- Quality Officer
- Staff / Viewer

Permission types: View, Create, Edit, Approve, Manage.  
Scope types: Organization, Branch, Collection Point.

A worker may hold multiple roles across Branches/Points with separate scopes. Assignments include start date, end date, permanent/temporary status and history. When an assignment ends, access for that scope is revoked; assignment and activity history remain.

Branch Manager oversees authorized Points in their Branch. Point Manager operates only within the assigned Point. Branch Manager can assign staff only within granted limits; Point Manager has limited assignment authority. Branch closure requires Owner approval. A manager cannot change their own approval limits.

## 6. Farmer-to-Point Policy

One Farmer may deliver milk to multiple Collection Points.
- One canonical Farmer ID identifies the Farmer.
- Each Point's collection records, quantity, price, quality and time remain separate.
- Overall Farmer Ledger consolidates records across authorized Points.
- Duplicate transaction prevention is required.
- Changing a Point does not erase prior collection or payment history.

## 7. Salary-Based Financial Authority

Effective approval limit:

**L = min(S × P / 100, C)**

Where:
- S = monthly salary
- P = company-approved salary percentage
- C = company fixed monetary cap
- L = effective approval limit

Company-specific salary, percentage, cap and approval hierarchy are configurable. Salary changes require approval and an effective date. The new limit applies from that effective date; completed approvals under the old salary remain unchanged. Salary history and approval history are retained. A manager cannot approve their own salary or personal financial benefit.

Exact percentage and cap values remain configuration decisions and are not set by this specification.

## 8. Expense Categories and Approval

Configurable categories may include:
- Salaries
- Transport
- Utilities
- Equipment
- Repairs
- Office Operations
- Farmer Services
- Chiller/Storage
- Emergency
- Other

Each category may define its own percentage, monetary cap, required approver role, validation and receipt requirement. Requesters cannot approve their own requests. Approval and payment execution may be separate. Duplicate invoice/expense checks are required. Rejection reason must be recorded. Amount changes after approval trigger reapproval when policy requires it. Disabling a category must not delete historical transactions.

## 9. Dashboard Data Freshness

- Display source and last-updated time.
- Mark stale data clearly.
- Show Sync Pending for offline or incomplete synchronization.
- Provide manual refresh.
- Do not represent incomplete or stale information as current.
- Keep other Module summaries available when one Module is unavailable, with clear status.

## 10. Offline Conflict Resolution

- Server-verified data is authoritative.
- Offline records remain in a synchronization queue.
- Idempotency and duplicate prevention are required.
- Conflicting critical changes go to authorized human review; no silent overwrite.
- Payments, financial approvals and ledger mutations require server authorization.
- Sync failures expose status and retry information.

## 11. Closure and Data Retention

- Branch/Point transitions to Suspended or Closed/Read-only Archive.
- New operations stop according to the closure state.
- Authorized users may view historical information.
- Farmer, collection, payment, ledger, batch and audit history are retained.
- Closing one Branch must not delete or disrupt another Branch/Point.
- Permanent deletion is not part of ordinary closure; it requires a lawful basis and highest-authority approval.

## 12. Transfer Policy

- A Collection Point may transfer to another Branch with approval.
- Past transactions remain associated with their historical Branch relationship.
- New Branch relationship becomes effective on the approved effective date.
- Staff roles and scopes are re-evaluated.
- Reason, approver, timestamp and old/new Branch IDs are recorded in Audit History.

## 13. Report Export and Sensitive Data

- View, Download and Export permissions are separate.
- Report access follows Role and Branch/Point Scope.
- Sensitive personal and financial fields are masked according to need and permission.
- Export actor, time and report are audited.
- Shared report access is time-limited.
- Public links are disabled by default.
- Unauthorized cross-Branch personal/financial access is denied.

## 14. Data Ownership and Module Integration

Related Modules include Farmer Management, Milk Collection, Quality & Batch, Accounts & Payments, Feed & Inventory, Veterinary & Agro, Employee Management, Processing & Supply and Reports & Intelligence.

Branch Module owns Branch/Point identity and administrative relationships. Other Modules retain ownership of their authoritative business records. Integration uses defined, versioned APIs; no direct unauthorized mutation of another Module's data.

## 15. Development Phases

1. Inspect existing repository, schema, Auth, RLS, storage and deployment workflow.
2. Define Branch/Point data model and API contracts without duplicating existing structures.
3. Prepare TEST-only implementation plan.
4. Verify permission and RLS allow/deny behavior.
5. Verify Branch/Point workflows.
6. Integrate Farmer and Milk Collection.
7. Integrate Accounts and approval controls.
8. Verify offline sync, conflict handling, backup and recovery.
9. Verify Android/mobile behavior.
10. Review evidence and obtain explicit approval before any Production change.

## 16. Decisions Required Before Implementation

- Salary approval percentage and fixed cap values.
- Category-specific approval matrix.
- Dashboard stale-data thresholds.
- Offline queue retention and retry limits.
- Detailed transfer approval hierarchy.
- Legal retention duration by data type.
- Report export formats and size limits.
- GPS accuracy threshold and geofence policy.

**This specification records approved policy direction. It does not itself authorize code, database, SQL, merge or deployment changes.**
