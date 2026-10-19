# Muhaimin Dairy — Development & Verification Policy

**Document:** `docs/DEVELOPMENT_POLICY.md`  
**Version:** 1.1  
**Status:** Proposed project policy; becomes authoritative after review and merge.  
**Applies to:** Muhaimin Dairy and every future Muhaimin project/app.

## 1. Core rule: verify once, record once, do not restart unnecessarily

Maintain one Master Checklist as the source of truth. Every requirement has a stable ID, owner/status, acceptance criteria, implementation references, test evidence, version/commit, dependencies, and reopening reason if applicable. Do not repeatedly rediscover, rewrite, or reimplement a requirement already marked LOCKED.

A LOCKED item is reopened only for: a reproducible defect; a security/privacy/data-integrity risk; an approved new requirement; a dependent change that affects it; or proof that its previous evidence/version was incorrect. Re-run only affected regression tests plus required release tests. Record why the item was reopened.

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
9. Prepare a live release only after all applicable gates pass and the user explicitly approves deployment.

Do not skip stages. If a gate fails, stop at that gate and document the failure. GitHub Actions success is not proof of SQL/RLS, device, offline, or end-to-end success.

## 4. Strict separation of TEST and LIVE

- TEST and LIVE credentials, projects, data, migrations, backups and URLs must be clearly distinguished.
- Never apply test migrations to LIVE or change production data/accounts/schema without explicit user approval.
- TEST acceptance requires a separate restored TEST project, migration order, preflight checks, role/JWT tests, and recorded results.
- Before a live release, provide the target commit, migration list, backup/restore plan, expected impact, and rollback plan for explicit approval.
- Never describe a deployment as complete until the actual deployment and live smoke test are verified.

## 5. Minimal-change and evidence rules

Preserve existing app behavior and data. Prefer focused changes over rewrites. Each change must identify affected requirements, files, tests and rollback path. Record the exact branch/PR/commit and evidence. Do not silently ignore failing tests, warnings affecting integrity, or known limitations. Distinguish implemented, statically checked, TEST-verified and LIVE-verified functionality.

## 6. Ecosystem portability and app extraction (mandatory for every Muhaimin project)

Every Muhaimin app must be designed to operate both as (a) a module connected to the wider Muhaimin ecosystem and (b) an independently deployable application, subject to the documented dependencies it requires. Do not make extraction depend on rewriting the whole app.

### Architecture requirements
- Keep business-domain logic separate from UI, infrastructure, ecosystem integrations and provider-specific code.
- Define explicit module boundaries and versioned interfaces/contracts for cross-app calls and events.
- Treat ecosystem integration as an adapter/connector, not as a hard-coded requirement inside core business logic.
- Keep configuration, feature flags, environment settings and integration endpoints external to core logic; never embed secrets in source code.
- Define each app's data ownership, identifiers, migration history, retention/export rules and dependencies. Avoid undocumented cross-app database writes and implicit shared-table assumptions.
- Use stable APIs/events and documented schemas for shared services; version breaking changes and preserve backward compatibility where practical.
- Support independent authentication/authorization configuration. Never trust a role or identity supplied by a client without server-side verification.
- Provide app-level export/import and backup/restore plans, including data mapping, validation and audit trail, subject to privacy and authorization.
- Keep branding, navigation, shared identity and ecosystem services optional/configurable where technically appropriate.
- Document offline requirements, synchronization, conflict handling, idempotency and recovery for any module that supports offline work.
- Provide a dependency inventory and an extraction runbook describing what must be configured, copied, migrated, replaced or disabled to run the app standalone.
- Avoid making a module depend on private APIs, shared secrets, or another app's UI. If a shared service is required, document it as an explicit dependency and provide a safe degraded mode or standalone alternative where feasible.

### Extraction acceptance gate
Before an app or module is LOCKED, document and test:
1. Core features run without loading another Muhaimin app's UI.
2. Ecosystem connectors can be configured, disabled or replaced without changing domain logic.
3. Its required schema and migrations are identifiable and reproducible in a separate TEST project.
4. Authorized data export/backup and restoration are documented and tested on TEST data.
5. Authentication, roles, secrets, external dependencies and environment variables are documented.
6. Standalone deployment steps and known limitations are recorded.
7. Ecosystem-connected mode and standalone mode both pass their applicable tests.

Not every service can be made dependency-free. Where an external service is essential, declare the dependency explicitly; do not claim fully standalone operation until a tested alternative exists.

## 7. Definition of done

A requirement is complete only when its acceptance criteria are met, code review is complete, applicable SQL/Supabase and security tests pass, build/static checks pass, relevant functional and regression tests pass, evidence is linked, the exact version is recorded, and no known blocking defect remains. Use N/A with a reason for inapplicable tests.

## 8. Project record

The repository's `docs/MASTER_CHECKLIST.md` is the source of truth for requirement IDs, status, acceptance criteria, evidence and lock/reopen decisions. Update it with each meaningful implementation or test result. This policy itself is versioned; changing it requires a documented reason and review.
