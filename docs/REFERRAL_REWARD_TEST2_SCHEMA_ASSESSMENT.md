# Referral & Reward — TEST 2 Schema Assessment and Implementation Plan

**Status:** Schema inspection complete; initial TEST 2 tenant foundation migrations applied and verified. Tenant-to-operational-data integration and tenant authorization APIs remain pending  
**Environment:** Muhaimin Dairy TEST 2 only  
**Inspected:** 2026-11-09  
**Related architecture:** [REFERRAL_REWARD_ARCHITECTURE_V1.md](./REFERRAL_REWARD_ARCHITECTURE_V1.md)

## 1. Executive result

The current TEST 2 database is an operational single-tenant / Main Admin foundation, not yet a multi-tenant platform. It has no tenant/business entity, no tenant membership mapping, no referral objects and no AI objects. The referral design therefore must not be implemented by simply adding referral tables to the current role model: doing so would create an unsafe tenant boundary and would make the proposed Customer Admin referral experience impossible to authorize correctly.

**Required dependency:** establish and test the tenant/business and membership foundation first. Then implement platform-level referral invitations for prospective businesses and tenant-scoped referrals for farmers/customers/staff. Reward and AI capabilities remain feature-flagged off until their independent acceptance gates pass.

No database object, policy, setting, migration, production project or live application behavior was changed during this assessment.

## 2. TEST 2 baseline observed

Read-only Supabase inspection returned:

| Item | Observed |
|---|---:|
| PostgreSQL | 17.11 |
| Public base tables | 20 |
| Public routines | 9 |
| Public RLS policies | 22 |
| Referral / reward / AI tables | 0 |
| Applied TEST 2 migrations | 9 |
| Branch records | 1 |
| Farmer records | 1 |
| Milk collection records | 2 |
| Existing referral links / reward ledger | None |

The small operational row counts are TEST 2 fixtures and are not used as evidence of a production business population.

### Existing identity and role structures

- `auth.users` is the identity source.
- `public.app_user_roles` has one row per user and currently permits only `main_admin` and `customer`.
- `public.app_users` is a separate legacy operational-user table with roles `admin`, `manager`, `staff`, `cashier`, `viewer` and an `is_active` flag.
- `public.customer_profiles` stores a customer's own profile, keyed to `auth.users`.
- No `tenants`, `businesses`, `tenant_memberships`, `tenant_id`, branch-to-tenant relationship, or tenant-scoped authorization mapping was found.
- Existing operational tables (branches, farmers, milk collections, payments, feed, veterinary, agro) currently use Main Admin-only policies based on the private role helper. Do not weaken or replace these policies to make referral features work.

### Existing audit and security conventions

- `public.audit_log` and `public.audit_events` exist; their current action checks cover INSERT / UPDATE / DELETE.
- Existing role helper and audit/stock routines include SECURITY DEFINER functions. Any new privileged referral operation requires an explicit review of function ownership, fixed search_path, grants, authorization checks, and RLS interaction. Do not copy an existing SECURITY DEFINER pattern without that review.
- Security Advisor currently reports **Leaked Password Protection Disabled**. This is an existing Auth configuration finding, not caused by referral work. Remediation reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Performance Advisor reports 17 unused-index notices. These are informational on the current small test dataset; do not remove indexes as part of referral implementation without workload evidence.

## 3. Required architecture decision

### 3.1 Tenant foundation comes before tenant referral

Add a separately reviewed tenant foundation before enabling Customer Admin referral functions:

1. `tenants`: business identity, lifecycle status, country, locale, currency, timezone and created/updated timestamps.
2. `tenant_memberships`: tenant_id, user_id, membership status, role reference, invited_by, joined_at and audit metadata.
3. `tenant_invitations`: invitation purpose/type, tenant scope, opaque token hash, expiry, usage limit, status and issuer.
4. A clear platform-role model that keeps `main_admin` separate from tenant roles.
5. Explicit rules for how existing branches, farmers and operational records acquire tenant ownership. This must be a planned backfill/compatibility migration; never infer tenant ownership from names or user-editable metadata.
6. A controlled bootstrap process for the existing TEST 2 Main Admin and the initial business tenant, with a tested recovery path.

The existing `app_user_roles` single-role constraint is not sufficient for a user who may belong to more than one tenant or have distinct roles in different tenants. Do not expand the current CHECK constraint casually. Prefer platform identity/role plus tenant membership authorization, with role grants managed by trusted server-side functions.

### 3.2 Referral data model after tenant foundation

Keep the following objects in an unexposed schema where practical, with narrow server-side APIs:

- `referral_campaigns` — platform or tenant scope, policy version, eligibility, reward type, caps, dates and feature flags.
- `referral_links` — issuer, scope, tenant, token hash, expiry, max uses, status and revocation.
- `referral_attributions` — one-level attribution, invitee, tenant, consent/policy version, dedupe key and status.
- `referral_events` — verified source event, source record ID, event key and idempotency key.
- `referral_rewards` — deterministic eligibility result, reward type/value, policy version and approval state.
- `reward_ledger` — append-only credit/debit/reversal journal; never client-writable.
- `referral_redemptions` — request, limits and fulfillment state.
- `referral_risk_reviews` — reason-coded signals and human reviewer outcomes.
- `referral_consents` — notice version, purpose, timestamp and withdrawal.
- `referral_audit_log` — privileged campaign/link/reward/export changes.

Avoid duplicate user/profile tables. Use foreign keys, tenant-scoped unique constraints, CHECK constraints, indexed foreign keys and deterministic policy-version references. Use integer minor units for currency; do not use floating-point reward values.

## 4. Authorization matrix to implement and test

| Actor | Allowed | Explicitly denied |
|---|---|---|
| Anonymous visitor | Resolve a valid opaque link through a rate-limited public endpoint | Direct table reads/writes, raw token enumeration, invitee details |
| Main Admin | Platform campaigns, business invitations, platform funnel, tenant activation review, global kill switch | Direct client ledger writes or unreviewed cash payout |
| Tenant Admin | Own-tenant farmer/customer/member invitations and own-tenant aggregate reporting | Create tenant/platform links, grant platform roles, access another tenant |
| Tenant staff | Only explicitly granted invite permissions | Campaign policy edits, reward approval, cross-tenant reads |
| Farmer/customer | Own invitation and own reward status only, when enabled | Other invitees, internal risk evidence, ledger mutation |
| AI service | Redacted, authorized summaries and advisory outputs | Role changes, activation, qualification source-of-truth, ledger writes, approvals, payouts |

RLS must validate both authenticated identity and active tenant membership. A `TO authenticated` clause alone is not authorization. Never trust `tenant_id`, `role`, `issuer_id`, reward amount, qualification status or approval state sent by the browser.

## 5. Implementation sequence

### Phase A — Tenant foundation design and compatibility

- [ ] Map all existing operational tables and their current ownership semantics.
- [ ] Define platform role vs tenant membership roles.
- [ ] Define migration/backfill for existing TEST 2 branch/farmer/collection fixtures.
- [ ] Define bootstrap, invite acceptance, membership suspension and tenant deletion/retention rules.
- [ ] Write RLS matrix and adversarial tests before DDL.
- [ ] Produce rollback and recovery plan.

### Phase B — Tenant foundation in isolated TEST 2

- [ ] Create reviewed migration files using the Supabase CLI migration workflow.
- [ ] Apply only to TEST 2 after static review.
- [ ] Add server-side membership and invitation functions.
- [ ] Add explicit grants and RLS; verify Data API exposure settings.
- [ ] Test Main Admin, tenant admin, staff, customer and anonymous JWT paths.
- [ ] Verify existing Branch/Farmer/Milk Collection behavior remains unchanged.

### Phase C — Referral backend

- [ ] Opaque random link token; store only token hash.
- [ ] Allowlisted canonical HTTPS host; no arbitrary redirect target.
- [ ] Expiry, revocation, max uses, rate limits and token-guessing protections.
- [ ] One-level attribution; no downline or pay-to-join.
- [ ] Qualifying events originate from trusted source modules, not browser claims.
- [ ] Idempotent conversion and reward evaluation under concurrent requests.
- [ ] Non-cash points/badges only for the first release; no cash-equivalent liability.
- [ ] Append-only ledger with reversals, approval trail and budget caps.
- [ ] Audit all privileged actions.

### Phase D — Referral UI

- [ ] Main Admin business invitation/campaign dashboard.
- [ ] Tenant Admin invitation center after tenant authorization is proven.
- [ ] QR and copy-link share the same canonical URL.
- [ ] Bengali-first accessible UI; mobile, keyboard and screen-reader checks.
- [ ] Manual sharing only; no address-book scraping or unsolicited messaging.

### Phase E — AI advisory layer

- [ ] Start with deterministic dashboards; AI is not a launch dependency.
- [ ] Add server-side AI Gateway, policy filter, PII minimization and tenant-scoped retrieval.
- [ ] Opt-in Bengali/English report summaries and support assistant.
- [ ] Shadow-mode anomaly signals with reason codes and human review.
- [ ] Forecasts only after adequate data quality/sample size, with confidence and freshness.
- [ ] Provider outage, quota, timeout, kill-switch and cost-ceiling tests.
- [ ] No model secret in browser/PWA and no AI write access to roles, approvals or ledger.

### Phase F — Release gates

- [ ] Full regression of existing modules.
- [ ] Cross-tenant read/write denial tests.
- [ ] Token expiry/revocation/use-limit/replay/race-condition tests.
- [ ] Self-referral, duplicate, circular attribution and budget-cap tests.
- [ ] Ledger reconciliation and immutable reversal tests.
- [ ] Offline/retry/dedup tests.
- [ ] Privacy, accounting and country-specific legal review before any cash-equivalent rewards.
- [ ] Written release approval and separate Production plan; no Production changes in this project phase.

## 6. Required automated and manual test fixtures

1. Anonymous user cannot select any referral/reward table.
2. Anonymous token resolver returns only minimal link state and cannot enumerate invitee identity.
3. Main Admin can create a platform business invitation only through the trusted backend.
4. Tenant Admin A cannot read, mutate or resolve private data belonging to Tenant B.
5. Staff without invitation permission cannot create a link.
6. A customer cannot self-assign tenant admin or platform role by editing profile metadata or request payload.
7. A click or signup alone does not create an earned reward.
8. Only a verified source event can qualify a referral; repeating the same event is idempotent.
9. Concurrent duplicate conversion requests produce one attribution/reward.
10. Revoked, expired, exhausted and malformed tokens fail safely.
11. Ledger rows cannot be updated/deleted by browser roles; correction uses a reversal entry with reason and actor.
12. Reward cap and campaign budget cannot be exceeded under concurrent requests.
13. AI disabled/unavailable does not affect referral creation, qualification or reporting.
14. AI retrieval cannot expose another tenant; AI cannot call privileged write operations.
15. Existing operational module tests pass unchanged.

## 7. Supabase platform compatibility note

Supabase announced that new public-schema tables are no longer automatically exposed through the Data API, with enforcement for all projects from 2026-10-30. Therefore, every new table must have an explicit API-exposure decision, explicit grants where required, and RLS enabled before any client access is considered. Prefer private schemas and narrow server-side functions for referral token and reward operations. See the Supabase changelog: https://supabase.com/changelog?types=breaking-change

Supabase CLI v3 changes hosted command defaults and requires explicit remote targeting/confirmation. Any future CLI operation must first inspect the installed CLI version and command help, pin/upgrade deliberately, and positively verify the TEST 2 project ref. Never rely on the old implicit linked-project behavior.

## 8. Evidence and current completion state

| Work item | State | Evidence |
|---|---|---|
| TEST 2 schema inspection | Complete | Read-only table/migration/catalog queries on project ref `wpomsmvzylrembojdsxd` |
| Existing identity/role model review | Complete | `app_user_roles`, `app_users`, `customer_profiles` constraints and policies inspected |
| Referral/AI object presence check | Complete | 0 matching tables found |
| Supabase security/performance advisors | Complete | Existing leaked-password warning remains; new private tables intentionally have no client policies; tenant FK indexes added |
| Tenant model design gap identified | Complete | No tenant/business/membership model found |
| Referral architecture specification | Drafted | `REFERRAL_REWARD_ARCHITECTURE_V1.md` |
| Initial tenant foundation tables | Complete (TEST 2 only) | `private.tenants`, `private.tenant_memberships`, `private.tenant_invitations`; RLS enabled; browser roles denied; one pending TEST 2 tenant and owner membership bootstrapped |
| Tenant-to-operational-data integration | Not started | Existing business tables remain unchanged; mapping/backfill and tenant-aware RLS must be implemented before tenant access is enabled |\n| Referral backend / UI | Not started | No live links or reward engine |
| AI Gateway / models | Not started | No AI provider or service enabled |
| Real JWT and browser acceptance | Not run | Requires role-specific test users and browser execution |

**Do not describe the Referral & Reward System or AI features as complete or live.** The current deliverable is a verified schema assessment and an implementation plan. The next engineering milestone is the tenant foundation, not the reward ledger. No Production change, PR merge or release is authorized by this document.


## 9. TEST 2 implementation update — 2026-11-09

Two additive migrations have now been applied to TEST 2 project `wpomsmvzylrembojdsxd` and committed to the development branch:

- `20261108231026_test2_tenant_foundation_v1`
- `20261108231840_test2_tenant_foundation_fk_indexes_v1`

Created internal tables:
- `private.tenants`
- `private.tenant_memberships`
- `private.tenant_invitations`

Bootstrap result:
- 1 TEST 2 tenant, status `pending`
- 1 active `owner` membership for the existing Main Admin identity
- 0 tenant invitations created
- Existing platform role remains `main_admin`

Security verification:
- `anon` and `authenticated` have no USAGE on schema `private`.
- `anon` and `authenticated` have no SELECT privilege on tenant tables.
- `service_role` has the intended backend table privileges.
- RLS is enabled and forced on all three tables. No client policies exist by design; direct client access is denied.
- Existing public RLS policy count remains 22.
- Existing TEST 2 operational row counts remain unchanged: 1 branch, 1 farmer, 2 milk collections.
- Existing public Main Admin role remains unchanged.

Advisor notes:
- The three `rls_enabled_no_policy` INFO findings are expected for private tables with no client grants or schema usage; do not add broad policies merely to silence the linter.
- Existing Auth warning: leaked password protection disabled.
- FK index notices for the new tables were addressed with the second migration.
- Existing unused-index INFO findings are not a reason to remove working indexes.

Important boundary:
- This is a tenant registry/bootstrap foundation only. No `tenant_id` columns were added to operational tables, no old data was reassigned, and no tenant-aware access is enabled in the app.
- Tenant invitations are not referral links. No raw tokens have been generated.
- No referral, reward, or AI runtime service is active.
- The next required step is an explicit compatibility map for all operational tables, then a staged nullable tenant_id backfill and tested tenant-aware authorization without weakening the current Main Admin policies.
