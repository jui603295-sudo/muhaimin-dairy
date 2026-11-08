

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

