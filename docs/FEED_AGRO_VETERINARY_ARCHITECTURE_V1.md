# Feed, Agro & Veterinary — Integrated Architecture V1.0 (TEST 2)

**Status:** Architecture and baseline audit only. This document does not claim that the proposed workflows are implemented or live.

**Scope:** Feed, Agro Care, Veterinary, shared inventory, supplier/customer balances, branch access, audit, offline safety, reporting and AI-assisted decision support.

**Environment boundary:** TEST 2 only. Production database, Production Auth, Production Storage and public deployment are out of scope.

## 1. Design goals

1. Preserve the existing Feed, Agro and Veterinary workflows and records; extend them without replacing their current tables or silently changing their meaning.
2. Use one reusable inventory engine for product identity, units, batches/lots, stock movements, expiry, costing and traceability.
3. Keep domain-specific workflows in their owning modules: feed nutrition/consumption, veterinary care/medicine traceability, and agricultural inputs/services.
4. Keep business records authoritative in PostgreSQL. Browser state and AI output are not accounting records.
5. Make the app useful without AI. AI is optional, advisory, explainable and permission-constrained.
6. Support Bengali/English, BDT, Asia/Dhaka display, ISO timestamps, mobile-first use and eventual offline operation.
7. Fail closed when tenant status, membership, branch scope or user permission cannot be verified.

## 2. Baseline audit — live TEST 2 schema and current app code

### Existing tables

- Feed: `feed_products`, `feed_purchases`, `feed_sales`
- Agro: `agro_products`, `agro_purchases`, `agro_sales`
- Veterinary: `vet_companies`, `vet_products`, `vet_purchases`, `vet_sales`

All ten tables currently have RLS enabled and a `muhaimin_main_admin_only` policy. The policy is platform Main Admin-only; it is **not tenant- or branch-scoped**. These tables do not currently have `tenant_id` columns. Do not loosen these policies or activate tenant writes as part of this architecture-only stage.

### TEST 2 row counts observed during this audit

| Table | Rows |
|---|---:|
| feed_products | 5 |
| feed_purchases | 0 |
| feed_sales | 0 |
| agro_products | 0 |
| agro_purchases | 0 |
| agro_sales | 0 |
| vet_companies | 7 |
| vet_products | 0 |
| vet_purchases | 0 |
| vet_sales | 0 |

Counts are a point-in-time audit, not a permanent guarantee.

### Confirmed implementation gaps

- The current UI computes Feed/Agro stock as total purchases minus total sales. It is not lot-aware and has no branch-level stock ledger.
- Veterinary expiry is currently attached to the product row, not to each received purchase lot. Multiple batches of the same medicine cannot be represented reliably.
- Existing purchase/sale schemas require `total_amount` and `due_amount`, but the inspected browser handlers do not include both fields. No BEFORE INSERT trigger was found on these tables to calculate them. The forms therefore have a schema/handler contract mismatch.
- The current schema inspection did not find `purchase_time` / `sale_time` columns on these transaction tables, while the browser handlers submit time fields. The shared insert helper deliberately rejects a save when a submitted time column is missing; it does not silently discard the time.
- The current forms include note fields for some transactions, but the audited transaction tables do not expose matching note columns consistently.
- Existing product forms are create-oriented; a complete controlled edit/archive/history workflow is not yet present across all three modules.
- Current RLS allows only the platform Main Admin. It is not safe to expose these tables to branch staff or customer/tenant users yet.

### Important safety decision

The TEST 2 tenant foundation is still pending and its resolver currently returns `write_authority: false`. The operational inventory tables have no tenant binding. Therefore this phase must not add tenant membership access, broaden RLS, enable branch-staff writes, or claim multi-tenant isolation. The tenant-aware API and safe data cutover must be completed first.

## 3. Shared platform architecture

### A. Shared Inventory Core

One shared domain service should own:

- Product master and stable product identifiers
- Unit catalog and controlled unit conversion
- Supplier and customer references
- Purchase documents and received quantities
- Batch/lot identity, expiry and quality/hold status
- Stock movement ledger
- Branch / store / collection-point location
- Transfers, returns, adjustments and stock counts
- Reorder thresholds and stock reservations
- Costing and margin snapshots
- Immutable audit events and idempotency keys

**Canonical stock rule:** stock is derived from posted, auditable movements, not editable product quantity fields or browser-calculated totals.

Suggested movement types: opening balance, purchase receipt, sale issue, branch transfer in/out, customer return, supplier return, approved adjustment, damaged/expired quarantine, write-off and reversal. Every correction is a new reversing/correcting event; posted movements are not silently overwritten.

### B. Existing-table compatibility

Keep the current tables as compatibility/source records while the new API and migration are proven. Do not rename or drop them in this phase.

Target logical entities (names are proposals, not applied schema):

- `inventory_products` / domain product extensions
- `inventory_lots`
- `inventory_movements`
- `inventory_locations`
- `inventory_transfers`
- `inventory_stock_counts`
- `inventory_reorder_rules`
- `inventory_documents`
- `inventory_idempotency`

Each domain transaction should retain its own reference and link to the canonical inventory movement/lot. Before any migration, compare exact live columns, constraints, indexes, triggers, row counts and RLS again.

### C. Shared finance boundary

Inventory records may calculate invoice totals and outstanding balances, but they must not independently post cash, settle a payable, alter farmer ledger balances or mark payments as approved. A future Finance API must own payment posting, reversals, reconciliation and approvals. Inventory may request a finance entry and display its confirmed status.

## 4. Domain module capabilities

### Feed

- Product catalog by manufacturer, feed type, species and life-stage category
- Feed form (pellet/mash/etc.), declared nutrition profile and manufacturer documentation
- Lot/batch receipt, manufacture/expiry dates, supplier invoice and storage conditions
- Branch/store stock, transfers, sales, returns, damage and stock count
- Farmer/animal-group feed issue and consumption history where explicitly recorded
- Reorder suggestions, expiry alerts, purchase price history and supplier performance
- Feed cost and milk-yield correlation as an **advisory trend**, with sample size, date range and uncertainty shown

AI must not automatically change a ration, nutrition specification, price, purchase order or farmer charge. Any feed-plan suggestion must be grounded in verified product-label data and reviewed by a qualified animal-nutrition professional.

### Agro Care

- Product catalog for seeds, fertilizer, soil amendments and other approved agricultural inputs
- Category, manufacturer, unit, label/document references and lot/batch traceability
- Purchase receipts, expiry/shelf-life where applicable, branch stock, transfers and sales
- Farmer, field/plot and crop-season references (with consent and access controls)
- Soil/lab report attachments, service visits, crop calendar and task history
- Product safety-label and restricted-use metadata where applicable
- Low-stock, expiry, seasonal-demand and supplier lead-time alerts

AI may summarize uploaded test results or flag missing records. It must not invent label instructions or autonomously prescribe chemical use, application rates or treatment plans. Recommendations require authoritative product-label information and qualified human review.

### Veterinary

- Veterinary product catalog with manufacturer/company, product class and regulatory/registration references
- Lot-specific batch number, expiry, storage requirements and supplier traceability
- Purchase, sale, branch stock, returns, quarantine, recall and disposal records
- Animal/herd profile, owner/farmer, visit history and veterinarian identity
- Vaccination/deworming schedules and reminders entered/approved by authorized professionals
- Clinical visit record: reported observations, professional assessment, test/lab references, care plan and follow-up
- Medicine issue/administration record linked to animal, veterinarian, medicine lot and withdrawal-period record where relevant
- Milk/meat withdrawal warnings must be sourced from the veterinarian's recorded instruction and authoritative product information; no guessed interval.

AI is limited to administrative summarization, reminder preparation, anomaly detection and record completeness checks. It must not diagnose, prescribe, select a medicine, calculate or recommend a dose, change a treatment, or override a veterinarian.

## 5. Cross-module integration

- Farmer and customer identity is shared; duplicate profiles are resolved through a controlled merge process, never automatic destructive merging.
- Branch / store / collection point is a shared location dimension.
- Feed and veterinary purchases/sales use the same supplier/customer and Finance boundary.
- Veterinary visits may create an approved follow-up task; Feed consumption can be linked to a herd/animal group; Agro services can be linked to a farmer/plot.
- Reports use a common date range, branch, product, supplier and customer filter.
- One integrated dashboard shows stock value only when cost data is complete; otherwise it must label the value incomplete.
- Shared notification service handles low stock, expiry, overdue supplier/customer balances and veterinary follow-up reminders.

## 6. AI and analytics layer

Each AI insight must store: insight type, source record references, time window, generated timestamp, model/version, confidence or uncertainty, explanation, expiry/staleness and human decision status.

Permitted examples:
- Forecast likely stock-out dates from actual movement history
- Detect unusual purchase/sale/consumption patterns
- Identify duplicate product records for human review
- Summarize supplier delivery performance
- Highlight expiry and slow-moving stock
- Produce a feed-cost trend with explicit caveats
- Prepare veterinary follow-up reminders from clinician-entered schedules
- Detect incomplete batch/traceability records

Prohibited autonomous actions:
- Post, approve or reverse payments
- Change prices, ledger balances or accounting periods
- Approve purchases, sales, write-offs or stock adjustments
- Change user roles, tenant status or branch access
- Diagnose animals or prescribe medicine/feed/chemical treatment
- Mark a lot safe, accepted, quarantined or disposed without an authorized human action

AI output is never a substitute for source data and must not be presented as verified fact.

## 7. Offline-first and device integration

Future offline support should use a per-user/per-tenant IndexedDB queue with:
- client-generated idempotency key
- schema/version and payload validation
- actor and tenant re-validation on replay
- server-generated timestamps and audit identity
- retry/backoff, duplicate detection and conflict queue
- explicit pending/synced/failed states
- exportable recovery snapshot and visible sync status

Do not enable automatic replay until real JWT, tenant/branch authorization, idempotency, duplicate replay, revocation and recovery tests pass. Do not store service-role secrets in the browser. Browser local storage/IndexedDB is not an encrypted vault.

Future integrations: QR/barcode scanning, label printing, scale integration, temperature sensors and accounting/export APIs. Each requires device-specific and security testing.

## 8. Roles and permissions — target model

- Main Admin: platform oversight and explicitly authorized tenant administration
- Tenant Owner: tenant-wide configuration and approvals
- Module Manager: module-specific catalog and operational workflows
- Branch Manager: assigned branch only
- Storekeeper: receipts, transfers, counts and issues within assigned locations
- Veterinary Professional: clinical records and veterinary decisions within professional scope
- Agro Professional: field/service records within assigned scope
- Read-only Auditor: view authorized records and audit evidence, no writes

These are target roles only. Existing TEST 2 operational tables remain Main Admin-only until the tenant-aware API and RLS cutover are independently verified.

## 9. Delivery sequence and acceptance gates

1. **Baseline and architecture (this phase):** schema/RLS/trigger audit, defect inventory, domain contract and read-only preflight.
2. **Shared API foundation:** verified JWT, server-derived actor, tenant and branch scope, active tenant/membership checks, field allowlists, atomic transaction + audit, idempotency.
3. **Schema extension in TEST 2:** additive nullable columns/tables and indexes only after exact migration diff and rollback plan; no destructive changes.
4. **Feed vertical slice:** product edit/archive, purchase receipt + lot, stock ledger, sale issue, return, branch stock and finance hand-off.
5. **Agro vertical slice:** same shared inventory flow plus crop/field/service records and relevant lot/expiry metadata.
6. **Veterinary vertical slice:** same shared inventory flow plus lot-specific expiry/recall and professional care records.
7. **UI integration:** bilingual forms, edit/history, filters, mobile layouts, role-aware navigation and explicit validation messages.
8. **Offline + device integrations:** only after server-side authorization and replay tests pass.
9. **AI advisory:** read-only, explainable insights behind a feature flag; no control authority.
10. **Release readiness:** real JWT positive/negative tests, browser CRUD/reload, concurrent stock test, lot traceability, expiry/recall, finance reconciliation, RLS isolation, audit, offline recovery, mobile accessibility and regression.

No Production migration, PR merge, deployment or public release is authorized by this TEST 2 development scope.

## 10. Current acceptance status

- Architecture specification: drafted in this PR.
- Live TEST 2 baseline audit: performed (read-only).
- Read-only preflight SQL: included for repeatable verification.
- Runtime implementation of the proposed shared inventory core: **not yet complete**.
- Real browser CRUD and JWT authorization evidence: **not yet available**.
- AI features: **design only; not live**.
