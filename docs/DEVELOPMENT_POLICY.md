# Muhaimin Projects — Development, Reliability & Release Policy

**Document:** `docs/DEVELOPMENT_POLICY.md`  
**Version:** 1.2  
**Status:** Proposed project policy; authoritative after review and merge.  
**Scope:** Every Muhaimin project and application, including Muhaimin Dairy.

## 1. Core rule: verify once, record once, do not restart unnecessarily

Maintain one Master Checklist as the source of truth. Every requirement has a stable ID, owner/status, acceptance criteria, implementation references, test evidence, version/commit, dependencies, and reopening reason if applicable. Do not repeatedly rediscover, rewrite, or reimplement a requirement already marked LOCKED.

A LOCKED item is reopened only for: a reproducible defect; a security/privacy/data-integrity risk; an approved new requirement; a dependent change that affects it; or proof that previous evidence/version was incorrect. Re-run only affected regression tests plus required release tests. Record why the item was reopened.

## 2. Status vocabulary

- **PLANNED** — requirement captured, work not started.
- **IN PROGRESS** — implementation or review is underway.
- **CODE COMPLETE** — implementation appears complete; acceptance testing is pending.
- **TEST PASSED** — defined tests passed and evidence is recorded.
- **LOCKED** — acceptance criteria passed, evidence and exact commit/version recorded, no known blocking defects.
- **REOPENED** — a specific evidence-based reason requires changes or retesting.
- **N/A** — a test or criterion does not apply; explain why.

Never call an item LOCKED based only on code being written, a successful static workflow, or an unverified claim.

## 3. Required delivery sequence

1. Consolidate requirements and inspect existing implementation.
2. Complete the Coding Gap Checklist and agree acceptance criteria.
3. Finish the required code and review it without wholesale replacement of working code.
4. Validate SQL migrations and Supabase behavior in a separate TEST project restored from a verified backup; test schema, constraints, RLS and real authenticated JWT roles.
5. Build and run static validation.
6. Verify functional behavior, authorization, data integrity, mobile/PWA behavior and relevant offline scenarios.
7. Fix every blocking failure and re-test the failed path and affected regression suite.
8. Lock the tested version with commit/PR and evidence.
9. Prepare a customer-facing live release only after all applicable gates pass and the user explicitly approves deployment.

Do not skip stages. If a gate fails, stop at that gate and document the failure. GitHub Actions success is not proof of SQL/RLS, device, offline, or end-to-end success.

## 4. Customer release without blocking ongoing development

Each project must be releasable independently to customers when it passes its release gate. Once released, its production version is a controlled, versioned release—not a moving target.

- Keep production and development/test environments separate.
- Continue new development on branches and test/staging environments; never make unfinished changes directly in the customer production version.
- Use versioned releases, reviewed changes, migration plans, feature flags where appropriate, and rollback procedures.
- Maintain backward-compatible APIs and database changes where practical. Coordinate breaking changes through versioning and a planned migration.
- A new project may be developed or released without requiring unrelated ecosystem projects to pause.
- Provide a customer-ready interface, mobile usability, accessible error messages, support/incident procedures, privacy/security review, and user documentation appropriate to the app.
- Only claim customer-ready after real release checks; do not equate a successful build with a usable production release.

## 5. Reliability, continuity and data protection

The goal is to prevent data loss and reduce outages as far as technically and economically practical. No design can honestly guarantee zero downtime or zero data-loss risk; reliability must be measured, tested and monitored.

Every customer-facing app must have a documented and tested plan for:

- **Backups:** automated scheduled database backups and, where appropriate, point-in-time recovery or equivalent; versioned copies of app assets/configuration that contain no secrets; backup retention rules.
- **Independent recovery copies:** keep protected copies separate from the primary server/account/region where feasible, with least-privilege access and encryption in transit/at rest where supported.
- **Restore drills:** regularly restore backups into a separate TEST environment and verify data integrity. A backup that has never been restored is not proven recoverable.
- **Recovery objectives:** define approved Recovery Point Objective (maximum tolerable data loss window) and Recovery Time Objective (maximum target recovery duration) per app and business criticality.
- **Monitoring and alerts:** monitor uptime, application errors, database availability, storage/capacity, failed jobs, backup completion and certificate/domain expiry; document who responds and how.
- **Incident recovery:** document incident triage, customer communication, rollback, restore, data reconciliation and post-incident review.
- **Availability architecture:** assess redundant hosting, health checks, automated restart/failover, load/capacity limits and a second region/provider for critical apps where budget and platform support justify it.
- **Graceful degradation:** where safe, show clear maintenance/network status, preserve unsent work locally, and recover safely after reconnection. Offline writes must be authenticated, validated, idempotent, auditable and conflict-aware. Never pretend an unconfirmed write was saved on the server.
- **Security:** least privilege, server-side authorization, protected secrets, dependency updates, audit logging and an incident-response path.

Do not promise that a server will never go down. State the measured availability target, backup schedule, tested restore evidence, recovery objectives and remaining single points of failure.

## 6. Strict separation of TEST and LIVE

- TEST and LIVE credentials, projects, data, migrations, backups and URLs must be clearly distinguished.
- Never apply test migrations to LIVE or change production data/accounts/schema without explicit user approval.
- TEST acceptance requires a separate restored TEST project, migration order, preflight checks, role/JWT tests, and recorded results.
- Before a live release, provide the target commit, migration list, backup/restore plan, expected impact, recovery/rollback plan and monitoring checks for explicit approval.
- Never describe a deployment as complete until the actual deployment and live smoke test are verified.

## 7. Minimal-change and evidence rules

Preserve existing app behavior and data. Prefer focused changes over rewrites. Each change must identify affected requirements, files, tests and rollback path. Record exact branch/PR/commit and evidence. Do not silently ignore failing tests, warnings affecting integrity, or known limitations. Distinguish implemented, statically checked, TEST-verified and LIVE-verified functionality.

## 8. Ecosystem portability and independent server migration (mandatory for every Muhaimin project)

Every Muhaimin app must be designed to operate both as (a) a module connected to the wider Muhaimin ecosystem and (b) an independently deployable application, subject to documented dependencies. The entire project must be movable to a different suitable hosting provider/server without rewriting the business application.

### Architecture and portability requirements

- Keep business-domain logic separate from UI, infrastructure, ecosystem integrations and provider-specific code.
- Define explicit module boundaries and versioned interfaces/contracts for cross-app calls and events.
- Treat ecosystem integration as an adapter/connector, not a hard-coded requirement inside core business logic.
- Keep configuration, feature flags, environment settings and integration endpoints external to core logic; never embed secrets in source code.
- Maintain a documented inventory of frontend, backend, database, storage, authentication, email/SMS, scheduled jobs, domains, certificates, analytics and other dependencies.
- Define each app's data ownership, identifiers, schema, migration history, retention/export rules and dependencies. Avoid undocumented cross-app database writes and implicit shared-table assumptions.
- Use stable APIs/events and documented schemas for shared services; version breaking changes and preserve backward compatibility where practical.
- Support independent authentication/authorization configuration. Never trust a role or identity supplied by a client without server-side verification.
- Provide app-level export/import and backup/restore plans, including data mapping, validation and audit trail, subject to privacy and authorization.
- Keep branding, navigation, shared identity and ecosystem services optional/configurable where technically appropriate.
- Document offline requirements, synchronization, conflict handling, idempotency and recovery for any module that supports offline work.
- Provide a standalone deployment and server-migration runbook: environment variables, secret provisioning, DNS/TLS, database creation, schema migration, authorized data transfer, storage transfer, background jobs, health checks, smoke tests, cutover, rollback and decommissioning of the old server.
- Prefer portable standards and reproducible deployment configuration (for example, documented container or infrastructure configuration where appropriate) over undocumented manual server setup. Do not introduce unnecessary infrastructure or cost for a small app.
- Avoid making a module depend on private APIs, shared secrets, or another app's UI. If a shared service is required, document it as an explicit dependency and provide a safe degraded mode or standalone alternative where feasible.
- Never copy production secrets into code, issue comments or documentation. Use provider-specific secret management.

### Extraction and migration acceptance gate

Before an app is LOCKED, document and test on TEST:
1. Core features run without loading another Muhaimin app's UI.
2. Ecosystem connectors can be configured, disabled or replaced without changing domain logic.
3. Its required schema and migrations are identifiable and reproducible in a separate environment.
4. Authorized data export/backup and restoration are tested, with record counts and integrity reconciled.
5. Authentication, roles, secrets, environment variables and external dependencies are documented.
6. A clean deployment to a separate test host/environment is reproducible.
7. Standalone and ecosystem-connected modes pass their applicable tests.
8. A migration/cutover rehearsal and rollback path are documented and tested to the extent practical.
9. Monitoring, backup, restore, recovery objectives and incident response are documented.

Not every service can be made dependency-free. Where an external service is essential, declare it explicitly and document the migration path; do not claim full portability until the required alternative has been tested.

## 9. Definition of done and customer release

A requirement is complete only when its acceptance criteria are met, code review is complete, applicable SQL/Supabase and security tests pass, build/static checks pass, relevant functional and regression tests pass, evidence is linked, exact version is recorded, and no known blocking defect remains.

A project may be customer-released only when its release gate, backup/restore evidence, monitoring/incident plan, data migration plan, security checks, and customer usability checks are complete. Record the release version, date, deployment target and verified smoke-test result. A project can then remain stable while new work continues separately.

## 10. Project record

The repository's `docs/MASTER_CHECKLIST.md` is the source of truth for requirement IDs, status, acceptance criteria, evidence and lock/reopen decisions. Update it with each meaningful implementation or test result. This policy is versioned; changing it requires a documented reason and review.
