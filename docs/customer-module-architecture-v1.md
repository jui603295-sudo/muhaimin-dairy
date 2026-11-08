# Customer Module Architecture — Version 1.0

**Status:** Architecture specification only  
**Target environment:** Supabase TEST 2  
**Base:** `test/test2-main-admin-auth-client-v1`  
**Production impact:** None  
**Database migration:** None in this phase  
**Runtime feature activation:** None in this phase

## 1. Architecture decision

The Customer Module is an independent Core Business Module. It owns customer identity, profile, preferences, consent, customer-facing activity and customer relationships. It integrates with Branch, Product/Catalogue, Inventory, Orders, Delivery, Payments, Support and Shared Infrastructure through documented contracts. It must not become a feature silo or be embedded inside Branch.

The module is designed for incremental implementation and future extension. Current capabilities can ship independently; future capabilities can be added behind stable interfaces and feature flags without rebuilding the module.

## 2. Non-negotiable project constraints

- All development and validation begin in TEST 2.
- Never run SQL, change settings, or write data in Production.
- Do not merge or deploy without explicit owner approval.
- Do not remove or replace working Branch, Farmer, Milk Collection or other existing functionality.
- Inspect the current TEST 2 schema, policies, functions and data before proposing or applying migrations.
- No schema migration is included in this architecture-only change.
- Do not claim browser/JWT, storage, payment or end-to-end tests passed without recorded evidence.

## 3. Module ownership and boundaries

| Domain | Owner | Customer Module interaction |
|---|---|---|
| Customer identity/profile/preferences/consent | Customer | Owns |
| Branch operations and service areas | Branch | Resolves fulfilment branch; does not own customer identity |
| Product catalogue and pricing | Product/Catalogue | Reads published, authorized offers |
| Stock and availability | Inventory | Reads availability through an authorized service |
| Orders and order lifecycle | Orders | Customer creates and tracks own orders |
| Delivery and fulfilment | Delivery / Branch Operations | Receives minimum fulfilment details |
| Payment, invoice, refund | Finance / Payments | Uses controlled payment APIs; no direct balance mutation |
| Authentication, authorization, RLS, audit | Shared Infrastructure | Reuses common controls |
| AI assistance | AI Services | Advisory only; never final authority for sensitive actions |

Branch selection is a service preference, not an authorization grant. A customer must never gain access to another branch's internal records by selecting that branch.

## 4. Customer-facing capability domains

### 4.1 Customer account and identity
- Email/password authentication initially, aligned with the existing Supabase Auth setup.
- Email verification, password recovery, session and account security.
- Customer profile, preferred language, contact methods and account status.
- Customer categories: individual, household/family, retailer, business, wholesale and institution, subject to business approval rules.
- No self-service elevation to staff, manager or administrator roles.

### 4.2 Addresses and branch serviceability
- Multiple customer addresses with one explicitly selected default.
- Structured address fields with extensible country/region hierarchy.
- Optional map/GPS pin only after explicit user action and permission.
- Serviceability resolution maps an address to an eligible service branch using a server-side rule.
- Customer may request a preferred branch, but the system validates service coverage and availability.

### 4.3 Shopping and order experience
- Product catalogue, product details, published price, availability and relevant product information.
- Cart, order placement, order history, status timeline and cancellation requests.
- Subscription/repeat-order capability designed as a separate bounded component.
- Stock, price, discount and order totals are recalculated server-side at checkout.
- Idempotency keys and explicit order state transitions prevent duplicate submissions.

### 4.4 Payments and financial records
- Payment provider adapter boundary to support future providers.
- Payment status, receipts, invoices, refunds and reconciliation references.
- No client-side direct write to authoritative balances or payment status.
- Refunds and financial adjustments require server-side policy and authorized approval.

### 4.5 Delivery and customer service
- Delivery windows, tracking milestones and delivery instructions.
- Support tickets, complaints, product feedback and resolution history.
- Notification preferences and delivery channels behind provider adapters.
- Quality, batch and traceability information where the product and operational data support it.

### 4.6 Loyalty and personalization
- Points, rewards, membership tiers and campaigns as separately configurable capabilities.
- Personalized recommendations only with appropriate consent and clear controls.
- Customer can view the basis of material offers and manage communication preferences.

## 5. Future identity verification — designed now, disabled by default

The following are extension points, not active features in this phase:

| Capability | Default state | Activation requirements |
|---|---|---|
| AI-assisted KYC/document review | OFF | Legal basis, consent, provider/security review, human review |
| Biometric verification | OFF | Explicit consent, lawful purpose, specialist privacy/security assessment, approved provider |
| Passport verification | OFF | Applicable law, approved verification source/provider, data minimization |
| Other identity-document checks | OFF | Supported document types, provider contract, retention and appeal policy |

Rules:
- Feature flags default to OFF in every environment.
- No biometric template, face image, passport scan or identity document is collected merely because the architecture supports it.
- Prefer provider-issued verification result/reference and minimal metadata over storing raw biometric/document payloads.
- A failed or uncertain automated result must support a human review/appeal path.
- AI must not autonomously deny essential service or make a legally significant identity decision.
- Activation requires owner approval, a documented legal/privacy assessment, threat model, provider review, retention/deletion policy, accessibility review and TEST 2 evidence.
- Age-appropriate safeguards and guardian consent requirements must be assessed where applicable.

## 6. Feature configuration and provider adapters

Use a centralized, server-controlled capability registry rather than scattered UI booleans. Each capability should have:
- stable capability key and version;
- environment-specific enabled state (default OFF for future capabilities);
- minimum app/API version;
- permission and consent requirements;
- provider adapter identifier, if applicable;
- rollout and rollback notes;
- audit event for activation/deactivation.

The client may display a capability only when the server confirms it is enabled and the user is authorized. Client-side hiding is not a security control.

Provider integrations (identity, payment, email, SMS, maps, delivery and AI) must sit behind adapters. Provider secrets stay server-side; never embed service-role keys or provider secrets in browser code.

## 7. Security, privacy and accessibility baseline

- Supabase Auth for identity; server-side authorization and Row Level Security for data boundaries.
- Customer can access only their own profile, addresses, consents, orders, payments, invoices, notifications and support records.
- Branch staff can access only assigned-branch operational data and only fields needed for fulfilment.
- Cross-branch analytics require explicit role and permission checks.
- Never trust a client-supplied customer ID, branch ID, price, stock count, discount, payment status or role.
- Use least privilege, input validation, rate limits, secure session handling, audit events and safe error messages.
- Define data classification, purpose limitation, retention, export/correction/deletion workflows and incident response.
- Design toward WCAG 2.2 AA accessibility, including keyboard operation, labels, contrast, focus visibility and understandable errors.
- Use OWASP ASVS as an application security verification baseline and NIST Digital Identity guidance where applicable; legal compliance must be assessed for each operating jurisdiction rather than assumed from a technical standard.

## 8. Conceptual data domains — not approved table definitions

These names describe logical ownership only. They are not instructions to create tables before schema inspection.

- Customer identity/profile: `customer_profiles`
- Customer addresses: `customer_addresses`
- Branch preferences/serviceability: `customer_branch_preferences`
- Consent and privacy choices: `customer_consents`
- Customer notification preferences: `customer_notification_preferences`
- Subscriptions: `customer_subscriptions`
- Orders and order items: `customer_orders`, `customer_order_items`
- Payment references and invoices: `customer_payments`, `customer_invoices`
- Loyalty: `customer_loyalty_accounts`, `customer_loyalty_transactions`
- Support: `customer_support_tickets`
- Customer audit events: `customer_audit_logs`
- Future verification: a separately permissioned verification domain, only after legal and schema review.

Before any migration, inspect existing tables, columns, constraints, indexes, triggers, RLS policies, grants, functions, storage buckets and current TEST 2 records. Prefer extending a compatible existing structure over duplicating it. Every migration must be versioned, reviewable, tested and have a rollback/recovery plan.

## 9. API and integration contracts

- Customer-facing clients call authenticated application APIs/RPCs; they do not directly mutate authoritative finance, stock, order-state or permission records.
- Every write validates the authenticated subject, ownership, permission, business state and related branch.
- Use idempotency for checkout, payment callbacks, subscription runs and retryable offline submissions.
- Use explicit state machines for orders, payments, refunds and verification cases.
- Keep API contracts versioned and backward-compatible where practical.
- Use an outbox/event pattern for reliable cross-module events when the existing infrastructure supports it; consumers must be idempotent.
- Offline mode may queue only explicitly supported low-risk actions. Payment confirmation, identity verification and final financial state must be server-confirmed.

## 10. Implementation sequence and acceptance gates

1. **Baseline audit:** TEST 2 schema/code/Auth/RLS inventory; identify existing customer role and signup behavior.
2. **Customer identity foundation:** customer-only route, profile read/update, ownership checks and email verification.
3. **Address and Branch integration:** address management, serviceability contract and branch-scoped authorization.
4. **Catalogue and orders:** read catalogue, cart, server-validated checkout and order history.
5. **Delivery and subscriptions:** fulfilment lifecycle and opt-in repeat orders.
6. **Payments and invoices:** provider adapter, verified callbacks, receipts and controlled refunds.
7. **Support, loyalty and notifications:** permissioned, configurable services.
8. **Future identity adapters:** design review and tests only while OFF; activate only after separate approval.
9. **Hardening:** accessibility, security tests, RLS allow/deny, migration recovery and end-to-end regression.

Each phase must record: **What changed / How tested / Proof / Retest timing / Known limitations**.

## 11. Current verified implementation boundary

The TEST 2 preview currently contains a generic Supabase email/password signup/login experience and a Main Admin-only application gate. The Customer self-registration role may be provisioned by the separate TEST 2 database preparation work, but a customer-facing portal/profile/order experience is not established by this document. The first implementation task is therefore a schema and auth-flow audit, followed by a small customer-only profile foundation. Do not assume that signup alone grants customer portal access.

## 12. Definition of done for the first Customer foundation

- A newly registered account cannot assign itself an elevated role.
- Verified customer can reach only the customer portal, not the Main Admin operations UI.
- Customer can read/update only their own permitted profile fields.
- Anonymous users cannot read private customer records.
- Another customer cannot read or mutate the first customer's records.
- Main Admin/Branch staff access is governed by explicit permissions and minimum necessary fields.
- Existing Main Admin, Branch, Farmer and Milk Collection flows remain unchanged.
- TEST 2 browser/JWT evidence is captured; no Production change or deployment occurs.

## 13. Customer Support & Communication System

**Decision:** Customer Support is a first-class Customer Portal capability and a shared operational service for Main Admin. It must be simple for customers and manageable from one Admin inbox. It is a communication and case-management channel, not an informal chat that bypasses authorization or the audit trail.

### Customer experience
- A clearly visible **সাপোর্ট / সাহায্য** entry is available from the Customer Portal.
- Customers can submit: general questions, service difficulties, complaints, suggestions, feature/facility requests, order/delivery issues and payment/invoice queries.
- Each submission creates a unique ticket/reference number and shows its current status.
- Customers can view their own ticket history, Admin replies and resolution notes, and add follow-up messages to an open ticket.
- Customers may choose a category and priority suggestion; the server applies the final priority rules to prevent abuse.
- The form should be short and mobile-friendly: subject, category, message, optional related order/reference and optional attachment where enabled.
- Show clear acknowledgement after submission and explain expected response hours only after the business defines an actual support schedule.

### Main Admin experience
- A single Support Inbox lists new, open, waiting-for-customer, escalated and resolved tickets.
- Main Admin can assign a ticket to an authorized staff member, change category/priority, reply, add internal-only notes, escalate, merge duplicates and resolve/reopen with a reason.
- Internal notes must never be visible to customers.
- Admin can filter/search by ticket number, customer, category, status, branch and date; customer lookup must respect role permissions.
- Main Admin controls categories, availability, response targets, notification rules and staff access through Admin Settings.
- A ticket's related branch/order is context only; it must not grant access to unrelated branch or customer records.

### Ticket lifecycle

NEW → OPEN → WAITING_FOR_CUSTOMER → IN_PROGRESS → RESOLVED → CLOSED

ESCALATED is an auditable flag/state for cases needing Main Admin attention. Customers may reply to reopen a resolved ticket within a configurable period; otherwise they create a linked follow-up ticket. Exact SLA and auto-close timing remain configurable and OFF until business rules are approved.

### Messages, attachments and notifications
- Keep ticket metadata and message history separate so every reply has author, timestamp and visibility (customer or internal).
- Customer can read only their own tickets and customer-visible messages. Staff access is limited to assigned permissions; Main Admin has oversight.
- Attachments are optional and must use private Storage, strict size/type limits, generated object paths, authorization checks and malware/content review where available. Do not accept passwords, OTPs, payment card details or identity-document uploads through general support.
- Notify customers when a ticket is received, answered, status-changed or resolved. Use in-app notifications first; email/SMS/push are provider adapters and remain configurable. Do not expose private ticket content in notification previews by default.
- Rate-limit ticket creation and replies; validate and safely render text to reduce spam and injection risk.
- Record ticket assignment, status/priority changes, internal notes, replies, attachment access and administrative actions in an append-only audit trail.
- Define retention, export and deletion policy before launch. A customer must not be able to erase an audit record by deleting a ticket.

### Separation from feature activation
A request for a new facility may be submitted through Support, but it must be classified and linked to a structured Feature Activation Request workflow (Section 14). A support ticket or customer message alone never enables a capability.

## 14. Customer-requested feature activation and Admin control

Future capabilities remain OFF by default. The Customer Portal may let a customer request a capability, but request submission and activation are separate operations.

### Customer flow
1. Customer opens the capability catalogue and selects Request activation for an eligible OFF capability.
2. Customer submits a short reason and any required business context.
3. System creates a request linked to the authenticated customer and a support/reference record where useful.
4. Customer can track status and read the decision/reason; customer cannot edit Admin configuration or directly turn a feature ON.

### Main Admin flow
- Admin Settings provides a central feature-control panel and a review queue.
- Main Admin can approve, reject, request more information, suspend or revoke a request with a recorded reason.
- Effective scope may be global, customer group, or an individual customer. A broader scope requires explicit confirmation and a clear impact preview.
- Approval is not the same as activation: provider setup, configuration, permissions, consent, dependency checks, rollout and TEST 2 validation must pass before effective state becomes ON.
- Main Admin can disable a feature at any time. Disabling must not delete customer data; retention and access behavior must be defined per capability.

### Canonical states

OFF → REQUESTED → UNDER_REVIEW → APPROVED → CONFIGURATION_REQUIRED → TESTING → ON

Alternative outcomes: MORE_INFORMATION_REQUIRED, REJECTED, SUSPENDED, REVOKED. The UI must distinguish request status from effective feature status; an approved request may still show the capability as OFF until activation gates pass.

### Authorization and audit
- Only authenticated customer can create/read their own requests; customer cannot approve, reject, change scope or edit registry/configuration.
- Only Main Admin with the explicit feature-management permission can review or change effective configuration.
- Customer-group membership and global scope are resolved server-side, never trusted from client input.
- Sensitive capabilities (payments, refunds, AI, KYC/identity verification, biometrics) require capability-specific review and additional controls; AI remains advisory only.
- Every request, decision, configuration change, scope change, activation, suspension and rollback records actor, timestamp, target scope, before/after state and reason in an append-only audit log.
- Enforce authorization in server-side functions/RLS. Hiding controls in the browser is not sufficient.

### Conceptual data domains — not approved schema
Potential domains include a feature registry, scoped feature entitlements/configurations, customer feature requests, support tickets/messages and append-only support/feature audit events. These are logical concepts only. Before creating any table or function, inspect TEST 2 for equivalent structures, compare naming/constraints/indexes/RLS/grants, and document migration and rollback plans. Do not create duplicate registries or parallel ticket systems.

### Current implementation boundary
This section is an architecture decision only. It does not claim that Support Inbox, ticket tables, customer request submission, Admin Settings controls, notifications or activation APIs currently exist. Do not add inert buttons or pretend requests are being delivered until the complete authorized backend and customer/admin flows are implemented and tested in TEST 2.
