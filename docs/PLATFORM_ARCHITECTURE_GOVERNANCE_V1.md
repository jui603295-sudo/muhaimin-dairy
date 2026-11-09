# Muhaimin Dairy — Platform Architecture & Engineering Governance v1.0

**Status:** Engineering baseline / documentation-only change  
**Applies to:** All current and future modules, tenants, branches, clients, integrations and AI capabilities  
**Environment:** Development and TEST 2 first; Production remains isolated  
**Architecture style:** Modular monolith by default, API-first boundaries, event-driven integration where justified, offline-tolerant clients, multi-tenant security

## 1. Mission and non-negotiable principles

Muhaimin Dairy must evolve into a secure, maintainable and internationally extensible business platform. The platform must not require each new module to reinvent identity, authorization, tenant boundaries, audit, localization, offline synchronization, backup, API controls or AI governance.

1. **Build once, reuse everywhere:** implement shared platform capabilities as versioned services/contracts and require modules to consume them.
2. **Secure by default / least privilege:** deny by default; grant only the minimum access needed for a defined task.
3. **Server-authoritative security:** browser state, route visibility, local storage, user-editable metadata and AI output are never authorization authorities.
4. **Tenant isolation is end-to-end:** tenant scope must be enforced at API, database/RLS, storage, background jobs, exports, reports, search, cache and offline replay boundaries.
5. **Preserve business integrity:** financial and operational records require explicit state transitions, idempotency and traceability. No silent overwrite.
6. **AI is optional and advisory:** core workflows remain usable without AI. AI cannot independently grant permissions, approve payments/rewards, post ledger entries, change accounting balances, close branches or make final fraud decisions.
7. **Document, test, then integrate:** contracts and migration plans precede implementation; automated tests accompany every shared capability.
8. **No false completion claims:** distinguish static checks, unit tests, simulations, live TEST 2 browser/JWT tests, device tests and Production acceptance.

## 2. Target platform layers

### A. Experience layer
- Responsive web/PWA and future mobile clients.
- Shared design system, accessibility, locale-aware presentation.
- No client-side secret keys or privileged service credentials.

### B. Business modules
Branch, Farmer, Customer, Milk Collection, Quality/Batch, Payments, Accounts/Ledger, Feed, Veterinary, Agro, Inventory, Reports, Referral, Settings and future modules.

Each module owns its domain rules and data contracts. Modules must not bypass another module's authoritative service or mutate its private tables directly.

### C. Shared application services
- Identity/session adapter and authorization policy evaluation.
- Tenant/branch context resolution.
- API boundary and input validation.
- Audit/event recording.
- Offline command queue, synchronization and conflict handling.
- Notifications, integration adapters, document/file service.
- Localization, configuration and feature/module registry.
- Observability, health checks and operational diagnostics.

### D. Data and security foundation
- Supabase Auth for identity; server-side authorization for privileged operations.
- PostgreSQL constraints, indexes, transactions and RLS.
- Private Storage with tenant- and record-scoped object authorization.
- Edge Functions/server-side RPCs for sensitive writes.
- Versioned migrations and repeatable security tests.
- Backup, restore and recovery procedures.

### E. Intelligence layer
- Provider-independent AI gateway/adapters.
- Permission-filtered retrieval and tool access.
- Model/version/prompt/configuration tracking.
- Evaluation datasets, quality/safety checks and human review.
- AI recommendations remain separate from authoritative business commands.

## 3. Identity, authorization and tenant isolation

### Identity
- Authentication establishes who the caller is; it does not by itself grant business permissions.
- Validate JWTs at trusted server boundaries. Derive user identity from verified claims, never from a browser-supplied user ID.
- Support secure session renewal, sign-out, revocation and recovery.
- Never log access tokens, OTPs, passwords, secret keys or sensitive authentication headers.

### Authorization
- Use role-based access control for stable job roles and attribute/context checks for tenant, branch, record ownership, status and transaction limits where needed.
- Enforce permissions on the server for every read/write/export/action.
- Separate platform-level roles from tenant membership and branch-level access.
- Main Admin elevation must be an explicit trusted administrative operation, never self-service metadata.
- Sensitive operations require explicit approval records and an auditable state transition.

### Tenant model
- Platform → Tenant/Organization → Branch → Collection Point/Sub-Center.
- A user may have multiple tenant memberships; do not silently choose when more than one operational membership is available.
- Resolve tenant context from verified identity and server-side membership records.
- Pending/suspended tenants and inactive memberships must fail closed.
- Do not add tenant columns/backfill or change operational RLS until application/API writes use trusted tenant context and a verified cutover plan exists.

### RLS and database
- Enable RLS on every exposed tenant/business table; use FORCE RLS where appropriate after owner/service-role behavior is understood and tested.
- Define explicit SELECT/INSERT/UPDATE/DELETE policies separately where their conditions differ.
- Test both positive and negative cases, including cross-tenant and cross-branch attempts.
- Use constraints, foreign keys and indexes to protect referential integrity and query performance.
- Keep privileged SECURITY DEFINER functions in a non-exposed schema where possible; set fixed search_path, restrict EXECUTE grants and review ownership.
- Avoid broad policies added merely to silence advisor notices.

### Storage
- Private buckets by default.
- Validate caller, tenant, record relationship, MIME type, file size and allowed operation server-side or through robust Storage policies.
- Use opaque object paths; do not treat an unguessable path as authorization.
- Test upload, readback, replacement, deletion, cross-tenant denial and orphan cleanup.
- Define retention and backup treatment for files.

## 4. API and integration security

- All writes affecting sensitive business state must pass through a trusted API/Edge Function/RPC boundary.
- Validate schema, types, ranges, enum values, ownership and state transitions on the server.
- Apply authentication, authorization, rate limits, abuse controls, payload limits and safe error responses.
- Use idempotency keys for retryable commands and webhook/event processing.
- Sign and verify external webhooks; protect against replay.
- Version public/internal API contracts and document compatibility/deprecation windows.
- Keep secrets in server-side environment configuration; rotate and scope credentials.
- Never expose service-role keys or privileged database credentials to browser bundles, logs or repository files.

## 5. Auditability and business event integrity

For every security-sensitive or financially meaningful action, capture as applicable:
- Actor identity and effective role/membership.
- Tenant/branch context.
- Action, resource type and resource identifier.
- Timestamp (UTC storage) and request/correlation ID.
- Before/after summary or immutable event reference, excluding secrets.
- Reason, approval reference and outcome.
- Source channel (web, mobile, API, integration, automated process).

Audit records should be append-only for application roles. Financial corrections use reversal/adjustment entries, not destructive edits. Audit failures on critical mutations must fail safely rather than silently losing the audit trail.

## 6. Offline-first, synchronization and conflict resolution

- Use IndexedDB (or an equivalent durable client store) for structured offline data; define data classification and retention.
- Queue commands, not arbitrary table mutations. Each command has a stable operation ID, schema version, actor/session context reference, tenant/branch context reference, creation time and idempotency key.
- The server revalidates identity, current membership, permissions, tenant scope and business invariants at replay time. A locally cached permission is never sufficient.
- Use bounded retries with backoff, dead-letter/error visibility and safe manual retry.
- Define conflict policy per domain:
  - Immutable/append-only events: deduplicate by operation ID.
  - Master data: version/ETag checks and explicit merge or user resolution.
  - Financial records: no last-write-wins; use transactional commands, reconciliation and approval.
- Never replay queued commands under a different user or tenant.
- Encrypt sensitive local data where supported and clear scoped caches on sign-out/account switch.
- Test offline capture, browser restart, duplicate delivery, network interruption, expired session, revoked membership, conflict, queue recovery and tenant switch.

## 7. Backup, restore and disaster recovery

- Define backup scope for database, Storage objects, configuration and required audit evidence.
- Define RPO/RTO targets by business criticality; record the chosen targets in operational runbooks.
- Keep backups isolated from routine application credentials and access.
- Verify backup integrity and perform scheduled restore drills in an isolated environment.
- Document recovery order, migration compatibility, object/file restoration, integrity checks and rollback criteria.
- A successful backup job is not proof of recoverability; only a tested restore demonstrates recovery.
- Keep TEST and Production backup paths and credentials isolated.

## 8. Settings, localization and internationalization

- Store canonical business values, not localized display strings.
- Use Unicode end-to-end and locale catalogs with stable translation keys.
- Support Bengali and English first; allow future locales without schema redesign.
- Use ISO 4217 currency codes and decimal-safe monetary storage. Never use binary floating point for financial arithmetic.
- Store instants in UTC; render with configured IANA timezone (initial business default: Asia/Dhaka) and locale-aware calendar/number formatting.
- Use ISO 3166 country/subdivision identifiers where applicable and maintain a versioned Bangladesh address dataset.
- Separate organization, tenant, branch, user and device preferences with explicit precedence.
- Locale/currency/timezone changes must not silently rewrite historical records or exchange rates.
- Feature flags and module enablement must be server-governed, auditable and distinct from user permissions. Disabling a module must not delete its data.

## 9. Shared architecture and AI foundation

### AI gateway
- Hide provider-specific SDKs behind a stable internal interface.
- Support provider/model selection, timeout, retry, cost/usage limits and graceful unavailability.
- Version prompts, tool schemas, retrieval configuration and model identifiers.
- Evaluate outputs for correctness, groundedness, privacy leakage, unsafe recommendations and regressions.
- Treat user content, retrieved documents and external tool output as untrusted data, never as executable instructions.

### Permission-aware AI
- AI retrieval and tool calls must use the requesting user's verified tenant/branch permissions.
- Do not send unnecessary personal, financial or sensitive data to a model provider.
- Record the purpose, data categories, provider/model, and retention controls for AI processing.
- Provide a human-readable explanation and source references for material recommendations where feasible.
- AI may draft a proposed action, but a trusted server workflow must independently authorize and validate it before execution.
- Human approval is mandatory for payments, ledger adjustments, rewards, role changes, tenant activation, branch closure and other high-impact actions.
- AI must not be the sole decision-maker for fraud, eligibility, employment or other consequential determinations.

### Future technology integration
New AI models, voice interfaces, QR/NFC, scales, flow meters, IoT sensors, payment providers and external ERP/accounting systems must integrate through versioned adapters and shared authorization/audit contracts. No integration may bypass tenant isolation or write directly into another module's private data.

## 10. International standards and engineering references

Use current applicable editions and validate applicability during implementation:
- OWASP ASVS and OWASP Top 10 for application security.
- OWASP API Security Top 10 for API threat controls.
- ISO/IEC 27001/27002 as information-security management/control references.
- NIST Digital Identity Guidelines (SP 800-63 series) for identity assurance and authentication design.
- WCAG 2.2 for accessibility.
- Unicode and CLDR for text, locale, number and date presentation.
- ISO 4217 for currency codes; ISO 3166 for country/subdivision codes; ISO 8601 for date/time interchange.
- IANA Time Zone Database for timezone identifiers and rules.
- OpenTelemetry conventions for traces, metrics and logs.

These are engineering references, not a claim of certification or compliance. Certification requires a separate formal scope, risk assessment, evidence review and independent assessment where applicable.

## 11. Engineering effort allocation

The following percentages are planning allocations of engineering effort, not completion percentages:

| Workstream | Allocation |
|---|---:|
| Authentication, Authorization, RLS, Tenant Isolation, Audit and API Security | 50% |
| Offline, Sync and Backup | 10% |
| Settings and Internationalization | 10% |
| Shared Architecture and AI Foundation | 15% |
| Testing, Performance and Recovery Validation | 15% |
| **Total** | **100%** |

The allocation does not permit reducing the quality or security of any workstream. Re-estimate only when evidence shows a material scope or risk change; preserve the full coverage of all workstreams.

## 12. Quality gates and evidence model

Every shared platform change must pass applicable gates:

1. **Design gate:** threat model, data flow, permission matrix, contract, migration/rollback plan.
2. **Static gate:** formatting, lint, type/schema checks, secret scanning, dependency and configuration checks.
3. **Unit/integration gate:** business invariants, authorization rules, failure handling and idempotency.
4. **Database security gate:** RLS allow/deny, grants, constraints, indexes and cross-tenant tests.
5. **Live TEST gate:** real authenticated JWT, API/Storage behavior and persisted save/readback.
6. **Device/offline gate:** supported browser/device, offline restart/replay and conflict scenarios.
7. **Recovery gate:** isolated restore drill and post-restore integrity verification.
8. **Regression gate:** existing modules and critical user journeys remain functional.
9. **Release gate:** documented evidence, known limitations, rollback plan and explicit release authorization.

Evidence must identify: change, environment, commit/migration version, test method, result, limitations, proof reference and retest trigger/date. Never present simulation or static analysis as live runtime proof.

## 13. Migration, compatibility and change governance

- Inspect current schema and data before proposing migrations.
- Prefer additive, reversible, expand-and-contract migrations.
- Separate schema deployment from data backfill and application cutover.
- Do not run destructive migrations or production data changes without explicit authorization.
- Maintain migration registry, checksums, dependency ordering and environment application status.
- Keep API/event/schema versions and compatibility tests.
- Preserve existing working features; refactor incrementally with regression coverage.
- Use feature flags for controlled TEST rollout; never use a flag as a substitute for authorization.
- Record architectural decisions (ADR) for choices with long-term impact.

## 14. Autonomous engineering mandate and approval boundaries

Routine design and implementation decisions may proceed without repeated Main Admin confirmation when they are:
- Documentation, architecture analysis, tests and non-destructive code improvements.
- Isolated to development branches and TEST 2.
- Backward-compatible and covered by relevant regression tests.
- Not changing financial policy, privileged access, tenant activation or Production resources.

Explicit approval remains mandatory for:
- Production database/schema/data/Auth/Storage/configuration changes.
- Production deployment or release.
- Pull request merge where the project owner has reserved that gate.
- Destructive data operations, irreversible migrations or credential/secret rotation affecting live services.
- Changes to financial policy, rewards, permissions, ownership, tenant activation or high-impact business decisions.

This mandate authorizes autonomous engineering within the safe development boundary; it does not grant authority to bypass security, legal requirements, platform controls or the approval gates above.

## 15. Implementation sequence

1. Inventory existing modules, schemas, policies, grants, Storage, APIs, offline behavior and tests.
2. Complete and verify identity/session and tenant-context foundation.
3. Design and test server-authoritative authorization and API boundaries.
4. Integrate Branch/Farmer and other modules through the shared contracts.
5. Complete audit coverage and private file lifecycle.
6. Build durable offline command queue, tenant-safe replay and domain-specific conflict resolution.
7. Establish backup/restore drills and recovery runbooks.
8. Complete locale, currency, timezone and tenant/branch configuration foundations.
9. Introduce AI gateway, permission-aware retrieval and evaluation harness.
10. Run full security, performance, accessibility, device, regression and recovery acceptance.

**Current project status is not implied by this target architecture.** Each step remains pending until its own implementation and evidence are recorded.
