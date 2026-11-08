# Referral & Reward System — Architecture Specification v1.0

**Project:** মুহাইমিন / Muhaimin Dairy  
**Status:** Design specification only; implementation and database changes are not yet authorized by this document  
**Environment boundary:** TEST 2 only. Production must remain untouched.  
**Architecture:** Multi-tenant, modular, API-first, offline-tolerant, auditable.

## 1. Purpose and product principles

Build a reusable referral and invitation capability that can support the current dairy business and future business verticals without embedding referral rules into individual modules.

Principles:
- Secure by default; server-side validation is authoritative.
- Tenant isolation: every tenant-scoped referral, invite, conversion and reward belongs to exactly one tenant.
- Least privilege and explicit consent.
- One-level referral attribution by default; no multi-level/downline commission or pay-to-join mechanics.
- Rewards are liabilities/benefits only after a verified qualifying event and approval; link clicks or signups alone do not earn money.
- Immutable financial/reward ledger; corrections use reversal/adjustment entries, never destructive edits.
- Configurable campaigns, eligibility, caps, expiry, locale, currency and reward type.
- Idempotent event processing and safe retries.
- Human approval for cash-equivalent rewards, exceptional adjustments, campaign changes and high-risk referrals.
- AI may flag patterns or summarize performance, but cannot approve rewards, change balances, or grant roles.

## 2. Actors and referral scopes

### A. Platform / Main Admin referral
Purpose: invite a new business/customer-tenant to apply for Muhaimin Dairy.

- Issuer: authorized Main Admin only.
- Invitee: prospective Customer Admin / business owner.
- Scope: platform-level; no tenant data is exposed before tenant provisioning and approval.
- Conversion: invitee verifies email, completes onboarding, accepts terms/privacy notice, and the Main Admin (or configured onboarding workflow) approves tenant activation.
- Reward: disabled by default; if later enabled, platform-level campaign rules apply and rewards require approval.

### B. Tenant / Customer Admin referral
Purpose: invite people into the referring Customer Admin's own tenant.

Allowed invitee types are campaign-configurable, initially:
- Farmer / milk supplier
- Customer / buyer
- Staff/member (invitation only; role assigned separately by an authorized tenant admin)

A Customer Admin cannot create another tenant, grant Customer Admin/platform roles, or invite into another tenant through this flow. Cross-tenant invitations are denied by default.

### C. Future partner referral
Reserved extension for approved distributors, cooperatives or business partners. It is disabled until a separate governance and compliance review.

## 3. Referral lifecycle

```text
DRAFT -> ACTIVE -> CLICKED -> SIGNED_UP -> VERIFIED
      -> QUALIFIED -> APPROVED -> REWARDED
      -> EXPIRED / REVOKED / REJECTED / FRAUD_REVIEW
```

Not every campaign uses every state. A click is analytics only. Signup is not a qualifying conversion by itself. Qualification is defined by the campaign, for example:
- platform: approved and activated tenant;
- farmer: verified identity/contact plus approved farmer record and first accepted milk collection (if the campaign requires activity);
- customer: verified account plus first completed eligible purchase/order;
- staff: accepted invitation and approved membership, with no financial reward by default.

Use a configurable attribution window (initial default recommendation: 30 days, subject to campaign approval). Store UTC timestamps; render local time using tenant locale/timezone. Keep source/medium/campaign metadata but minimize personal data.

## 4. Reward engine and ledger

### Reward types (feature-flagged; not all enabled initially)
1. Non-cash recognition: badge, status, points with no cash redemption.
2. Tenant credit: capped invoice/service-fee credit, only where billing exists.
3. Product/service benefit: approved coupon or service benefit with stock/eligibility controls.
4. Cash-equivalent payout: future phase only, disabled until legal, tax, payment-provider, KYC/AML, fraud and accounting reviews are complete.

Initial rollout recommendation: referral tracking + badges/points only; no cash payout and no automatic monetary liability.

### Reward controls
- Campaign defines reward type, amount/value, currency, eligible event, attribution window, cap, budget, start/end, per-user limits, exclusions and approval threshold.
- No reward for self-referral, duplicate identity, same verified phone/email/payment instrument where legally permitted to check, test accounts, staff abuse, suspicious device/IP clusters, cancelled/refunded transactions or reversed qualifying events.
- Never rely on client-side values for reward amount or eligibility.
- Calculate and post rewards in a server-side transaction with a unique idempotency key.
- Ledger entries are append-only: PENDING, APPROVED, POSTED, REVERSED, EXPIRED. Store reason codes and actor IDs.
- Every reversal references the original ledger entry; do not delete posted rewards.
- Separate earned, pending, available and redeemed balances. Never display pending as withdrawable.
- Enforce campaign budget and user/tenant caps atomically to prevent race-condition overspend.
- Admin adjustments require reason, evidence note, permission and audit record; high-value adjustments require second-person approval.
- Currency uses ISO 4217 codes and integer minor units (e.g., poisha), never floating-point arithmetic.
- Tax, VAT, withholding, consumer-promotion and payout requirements must be reviewed for each launch country. No claim of legal compliance until local counsel/accounting review is complete.

## 5. Referral links and QR codes

- Use opaque, cryptographically random referral tokens; do not encode email, phone, tenant ID, role or personal data in the URL.
- Persist only a keyed hash of the token where feasible; show the raw token only at creation and allow rotation/revocation.
- Links must be HTTPS, use an allowlisted canonical host, and reject open redirects.
- QR codes contain the same HTTPS referral URL; QR creation is a presentation feature, not a separate trust mechanism.
- Configurable expiry, max uses, campaign, invitee type and attribution window.
- Single-use invitations for privileged membership; reusable campaign links only for low-privilege signup and with rate limits.
- Provide copy/share/QR, link status, created/expiry dates, usage counts and revoke/rotate controls.
- Do not expose referral analytics or invitee personal data to the referrer beyond the minimum status needed.

## 6. Suggested conceptual data model (NOT a migration)

Names are provisional. Compare against the actual TEST 2 schema before any migration; reuse existing tenant, user, role, farmer and customer tables where possible.

- `referral_campaigns`: campaign configuration, scope, eligibility, reward rules, budget, limits, country/currency, active dates and feature flags.
- `referral_links`: issuer, scope (platform/tenant), tenant_id nullable only for platform scope, token_hash, campaign_id, expiry, max_uses, status, revoked_at.
- `referral_attributions`: link_id, invitee_user_id or target_record_id, tenant_id, attribution timestamps, consent version, source metadata, status, dedupe key.
- `referral_events`: append-only lifecycle events, source event ID, idempotency key, verified payload reference, actor/system origin.
- `referral_rewards`: reward decision and lifecycle metadata, campaign/link/attribution references, reward type, integer amount, currency, approval metadata.
- `reward_ledger`: append-only debit/credit/reversal entries, balance account, source reward, idempotency key, actor, reason.
- `referral_redemptions`: redemption request, fulfilment status, limits and references to ledger entries.
- `referral_risk_reviews`: risk signals, review outcome, reviewer, reason code and evidence pointer; restrict sensitive access.
- `referral_consents`: notice/policy version, consent purpose, timestamp and withdrawal status.
- `referral_audit_log`: privileged changes, link revoke, campaign edits, approvals, adjustments and exports.

Use foreign keys, tenant-scoped unique constraints, check constraints, appropriate indexes and retention rules. Avoid storing raw tokens or unnecessary device fingerprints. Do not create duplicate identity/profile tables if the existing schema already provides these entities.

## 7. Authorization and RLS

- Main Admin: platform campaigns, platform referral links, global analytics, tenant onboarding decisions and platform-level reward governance.
- Customer Admin: create/manage referral links only for their own tenant and permitted invitee types; see only tenant-scoped aggregate and minimum necessary invite status.
- Staff: only the invitation/management capabilities explicitly granted by tenant permissions.
- Farmer/customer: may use a link and view their own invitation/reward status where enabled; no access to other invitees.
- Anonymous: may resolve a valid token through a narrow server endpoint only; no direct table access.
- All reward issuance, approval, balance updates, token resolution and privileged transitions happen through server-side Edge Functions / trusted backend transactions.
- RLS must use authenticated identity and trusted role/tenant membership; never trust tenant_id, role, reward amount or issuer ID sent by the browser.
- Deny by default. No client INSERT/UPDATE/DELETE on reward ledger or campaign governance tables.
- Ensure SECURITY DEFINER functions have fixed search_path, explicit grants, input validation and no unsafe dynamic SQL.

## 8. API / event boundaries

Suggested server-side operations:
- `create_referral_link`
- `resolve_referral_token`
- `record_referral_signup`
- `verify_referral_conversion`
- `evaluate_referral_eligibility`
- `approve_referral_reward`
- `post_reward_ledger_entry`
- `reverse_reward_ledger_entry`
- `redeem_referral_reward`
- `revoke_referral_link`

Operations must be authenticated, rate-limited, idempotent where applicable, logged, and return minimal data. Domain modules publish trusted events (e.g., tenant activated, farmer approved, first accepted milk collection, order completed); referral engine consumes them without taking ownership of the source record.

## 9. Privacy, security and abuse controls

- Publish clear referral terms and privacy notice before tracking; record policy version and consent where required.
- Do not upload address books or message contacts automatically.
- Do not send unsolicited messages; referrer manually shares a link.
- Minimize IP/device data, restrict access, define retention and deletion/anonymization policy, and document lawful basis per country.
- Rate-limit token resolution, signup and reward evaluation; use bot protection where appropriate.
- Detect self-referral, repeated identities, circular referrals, duplicate conversions, suspicious velocity, refund/cancellation abuse and campaign budget exhaustion.
- Use risk scoring as a review signal only; do not automatically deny legitimate users solely from opaque AI scores.
- Support account deletion and data-subject requests while retaining only legally required financial/audit records.
- Security events and privileged actions go to the shared Audit Log.

## 10. Internationalization and extensibility

- Store timestamps in UTC; use tenant-selected IANA timezone for display.
- Store language/locale separately from currency and country.
- Use ISO 3166-1 country codes, ISO 4217 currencies and integer minor units.
- Localize UI copy, dates, numbers, terms and reward disclosures.
- Campaign policy is versioned; changing a campaign never silently changes already-earned rewards.
- Keep reward calculation deterministic and versioned so past decisions can be reproduced.
- Support tenant-level feature flags and platform-level kill switch.
- Design for future payment-provider adapters without coupling the core ledger to one provider.
- Accessibility: keyboard navigation, screen-reader labels, contrast, QR alternative text and non-QR copy link.
- Observability: structured logs, metrics, alerting, trace/correlation IDs, exportable audit reports and operational dashboards.

## 11. Admin experiences

### Main Admin
- Platform referral overview: links, invited businesses, verified/approved/activated tenants, conversion funnel, suspicious activity and campaign budget.
- Create/pause/expire campaign; configure qualification and reward policy.
- Approve tenant activation and any monetary reward.
- Review exceptions, reverse erroneous rewards with reason, export audit report.
- Global kill switch and per-campaign kill switch.

### Customer Admin
- Tenant referral dashboard: invited farmers/customers/members, funnel status, earned/pending points or benefits.
- Create QR/link only for allowed tenant invitee types.
- View minimal invite status; no access to private user data or other tenants.
- Pause/revoke own links; request reward review.
- No ability to change reward values or grant privileged roles.

## 12. Rollout phases and acceptance gates

### Phase 0 — Architecture (this document)
- [x] Define scopes, roles, lifecycle, ledger principles, risk and internationalization.
- [ ] Owner review of the policy and initial reward choice.

### Phase 1 — TEST 2 schema and security design
- [ ] Inspect actual TEST 2 schema, current auth/tenant/role model and existing audit conventions.
- [ ] Produce schema comparison and migration plan; do not apply until reviewed.
- [ ] Write RLS matrix and adversarial tests.
- [ ] Keep rewards non-monetary and disabled by default.

### Phase 2 — TEST 2 backend
- [ ] Transactional migrations only after schema comparison.
- [ ] Edge Functions for token lifecycle, attribution and event verification.
- [ ] Idempotency, rate limits, audit events and kill switch.
- [ ] Automated PostgreSQL/RLS/Edge Function tests.

### Phase 3 — UI
- [ ] Main Admin referral dashboard and campaign controls.
- [ ] Customer Admin tenant-scoped invite center.
- [ ] QR/copy/share and responsive/mobile experience.
- [ ] Accessible status and error states.

### Phase 4 — Manual and security acceptance
- [ ] Real TEST 2 JWT for Main Admin, Customer Admin, staff, farmer/customer and anon.
- [ ] Cross-tenant read/write denial.
- [ ] Token expiry/revocation/use-limit tests.
- [ ] Self-referral, duplicate, replay, race-condition, refund and budget-cap tests.
- [ ] Offline/retry/dedup tests.
- [ ] Ledger reconciliation and immutable reversal tests.
- [ ] Existing modules regression test.

### Phase 5 — Controlled release
- [ ] Security/privacy/legal/accounting review for each launch country.
- [ ] Written owner approval.
- [ ] Separate Production migration/release plan and backup/rollback proof.
- [ ] Post-release monitoring and retest.

## 13. Explicit non-goals and release boundaries

- No pyramid, multi-level downline or pay-to-join reward model.
- No automatic cash payout in the initial release.
- No reward merely for clicks, installs or unverified signups.
- No AI-controlled approvals, role changes, ledger posting or payout.
- No Production SQL, configuration, deployment, merge or release as part of this specification.
- No deletion or replacement of existing app features.
- No claim of international legal/compliance certification; country-specific review is required before launch.

## 14. Evidence standard

For every implementation item record:
1. What changed (commit, migration, function, UI).
2. How it was tested (automated and manual).
3. Proof (CI run, TEST 2 query/result, screenshots/log correlation IDs with secrets redacted).
4. Retest timing and owner.
5. Known limitations and rollback path.

**Current truth:** This is a design specification committed to an isolated development branch. Referral links, reward calculations, database objects and UI are not yet live or enabled.


## 15. Responsible AI architecture — future-ready capability layer

AI is an optional intelligence layer around the deterministic referral engine. The platform must remain fully usable if every AI provider is unavailable, disabled, over quota or disconnected. AI outputs are advisory and must never become the source of truth for identity, permissions, qualification, reward balances or financial records.

### 15.1 AI capabilities roadmap

**A. Referral growth intelligence**
- Explain referral funnel performance by campaign, tenant, branch, invitee category, geography and time period.
- Identify where invitees abandon onboarding and recommend UX improvements.
- Forecast likely conversion volume and campaign capacity using historical, sufficiently large and consent-compatible datasets.
- Recommend campaign segments and communication timing without automatically sending messages.
- Compare campaigns using transparent metrics: qualified conversion rate, cost per qualified conversion, retention and net contribution where reliable data exists.
- Generate plain-language weekly summaries in Bengali and supported languages.

**B. Fraud and abuse decision support**
- Detect unusual referral velocity, repeated patterns, circular attribution, suspicious clusters, repeated reward claims and abnormal redemption behavior.
- Use deterministic rules for hard policy violations; use statistical/ML anomaly signals only to prioritize human review.
- Provide reason codes and supporting evidence for each alert; avoid opaque “fraud score only” decisions.
- Use risk tiers such as LOW / REVIEW / HIGH with configurable thresholds, calibration reports and false-positive monitoring.
- Never automatically confiscate an earned reward, permanently ban an account, or reject a person solely because of an AI score.
- Provide an appeal and human-review path.

**C. Reward and campaign optimization**
- Simulate campaign budgets, reward caps, expected conversions and downside scenarios before activation.
- Recommend non-cash reward choices based on business goals and historical outcomes.
- Detect campaigns likely to exceed budgets or produce low-quality conversions.
- Run controlled A/B tests only with approved variants, documented hypotheses and privacy safeguards.
- AI may suggest a change; a human with the correct permission must approve and publish a new version. Existing earned rewards remain governed by the original version.

**D. AI support assistant**
- Explain how referral links, QR codes, invitation states and reward terms work.
- Help Main Admin investigate campaign reports and help Customer Admin understand their own tenant-scoped results.
- Draft share messages for a user to review and manually send; never scrape contacts or send unsolicited messages.
- Explain a pending/rejected reward using approved reason codes and accessible language.
- Retrieval must enforce the same tenant and role permissions as the underlying data. The assistant must not reveal hidden records through summaries, embeddings, exports or tool calls.

**E. Forecasting and business intelligence**
- Forecast active referrers, qualified referrals, campaign utilization and reward liability ranges.
- Show confidence intervals, sample size, data freshness and model limitations.
- Do not forecast personal trustworthiness, protected traits or sensitive personal attributes.
- Do not make credit, employment, insurance, healthcare or other high-impact eligibility decisions from referral data.

### 15.2 AI governance and permission boundaries

AI is permitted to:
- summarize, classify, explain, forecast, detect anomalies and recommend;
- draft a campaign proposal or investigation checklist;
- prepare a report for an authorized reviewer.

AI is not permitted to:
- create or elevate user roles or permissions;
- activate tenants or approve privileged membership;
- determine a reward as legally/financially earned without deterministic rules;
- write to, edit or delete reward ledger entries;
- approve, release, transfer or redeem money or cash-equivalent value;
- change campaign rules, budgets, caps or terms without an authorized human approval;
- silently change attribution or qualification after the event;
- make final fraud, suspension or account-closure decisions.

Use a dedicated permission such as `referral.ai.use` for access to the assistant and separate permissions for report visibility. AI access never implies administrative access.

### 15.3 AI service architecture

Recommended logical components:
1. **AI Gateway:** one controlled server-side boundary for provider routing, authentication, quotas, timeout, retries, logging and cost controls.
2. **Policy and Permission Filter:** validates actor, tenant, purpose, permitted data fields and requested action before context is assembled.
3. **PII Minimization Layer:** removes or masks phone, email, address, identity numbers and unnecessary free text before model calls.
4. **Tenant-scoped Retrieval:** retrieves only authorized, current records; every query must be tenant-filtered before retrieval, not merely filtered in the prompt.
5. **Model Router:** supports replaceable providers and local/small models for suitable tasks; no vendor lock-in.
6. **Deterministic Rules Engine:** owns eligibility, caps, attribution windows, reward amounts and ledger calculations.
7. **Human Approval Queue:** records proposal, evidence, reviewer, decision, timestamp and policy version.
8. **Evaluation and Monitoring:** tests accuracy, hallucination, bias, leakage, latency, cost and model drift.
9. **Kill Switch:** disable all AI features globally or by tenant/capability without interrupting core referral functions.

No model API key may be shipped to browser/PWA code. Provider secrets remain server-side in managed secrets. Do not send full database rows or entire customer lists to an AI provider.

### 15.4 AI safety, privacy and transparency

- Tell users when they are interacting with an AI assistant and when content is AI-generated.
- Label forecasts and risk alerts as estimates, not facts.
- Show data source period, freshness, sample size and confidence/uncertainty where meaningful.
- Keep prompts and model responses free of secrets, authentication tokens and raw referral tokens.
- Define purpose limitation, lawful basis, retention, deletion and provider data-processing terms for each country.
- Do not use referral data to train external models unless a separate lawful basis, clear notice and required consent/contractual controls exist.
- Apply encryption in transit and at rest, access logging, least privilege and tenant isolation to embeddings and vector indexes.
- Treat user-generated text, QR payloads, imported files and retrieved documents as untrusted input; defend against prompt injection and data exfiltration.
- Prevent AI-generated links from changing the canonical host or adding unapproved redirects.
- Provide human-readable explanations and a correction/appeal route for AI-assisted risk flags.
- Conduct privacy impact, security and model-risk reviews before enabling sensitive AI functions.

### 15.5 Model quality and operational controls

Before release, evaluate:
- tenant-isolation and cross-tenant leakage tests;
- prompt-injection and indirect-injection resistance;
- factuality against known referral ledger and event fixtures;
- false-positive and false-negative rates for anomaly alerts;
- performance across Bengali and supported languages;
- calibration, drift and subgroup error analysis where lawful and statistically valid;
- latency, availability, token usage and per-tenant cost ceilings;
- graceful degradation when AI provider/API is unavailable.

Store model/provider name, model version, prompt-template version, policy version, timestamp, request correlation ID, input-data references and output classification. Avoid retaining raw prompts containing personal data unless explicitly justified and protected. AI decisions must be reproducible where possible; keep a concise explanation and reviewer outcome.

### 15.6 AI rollout phases

- **AI-0 (initial):** no AI dependency; dashboards and deterministic referral reports.
- **AI-1:** opt-in Bengali/English report summaries and help assistant using tenant-scoped, redacted data.
- **AI-2:** anomaly alerts and campaign simulations in shadow/advisory mode; compare with human-reviewed outcomes.
- **AI-3:** conversion and budget forecasts with confidence ranges after adequate data quality and sample size.
- **AI-4:** campaign recommendations and controlled experiments, always requiring human approval.
- **AI-5:** additional models/providers or on-premise options after privacy, security, cost and operational assessment.

Each phase has independent feature flags, consent/notice requirements, test evidence and rollback. AI-1 or later must not delay or block the non-AI referral launch.

### 15.7 AI-specific data boundaries

Do not create a general-purpose vector index containing all customer, farmer, employee or financial data. If semantic search is justified:
- use separate tenant-scoped namespaces or enforce tenant predicates at the retrieval service and database layer;
- store only minimal, purpose-approved text;
- exclude secrets, government identifiers, payment credentials and sensitive personal information;
- support deletion/rebuild when source records are deleted or corrected;
- test adversarial cross-tenant retrieval before release.

### 15.8 AI acceptance checklist

- [ ] Core referral flow works with AI fully disabled.
- [ ] AI Gateway has no browser-exposed secrets.
- [ ] Tenant and role filters are applied before retrieval/model context construction.
- [ ] Prompt-injection and cross-tenant leakage tests pass.
- [ ] AI cannot invoke privileged write/approval/ledger operations.
- [ ] Every AI-generated risk flag has a reason and human-review route.
- [ ] AI summaries reconcile to source metrics and clearly disclose uncertainty.
- [ ] Bengali and English quality tests pass for supported workflows.
- [ ] Cost, quota, timeout, provider outage and kill-switch tests pass.
- [ ] Privacy/security/model-risk reviews and user notices are approved.

