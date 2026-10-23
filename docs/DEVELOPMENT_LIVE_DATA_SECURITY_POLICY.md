# Muhaimin Dairy Development and Live Data Security Policy

Status: Draft for implementation on `feature/module-workspaces-settings-v1`.

## Non-negotiable rules

1. **Production data is not development data.** Feature work must happen on a dedicated development branch and be validated against the separate TEST Supabase project before any production release.
2. **Main Admin only for live operational data.** The UI must not be the security boundary. Supabase Row Level Security (RLS), server-side authorization, and any RPC functions must enforce who can read or mutate production data.
3. **Customer access is least-privilege.** Customers must not see development screens, TEST data, internal audit/version controls, or Main Admin settings. Enforce this on the server as well as in the UI.
4. **Module workspaces are isolated.** Opening a module should show only that module's work area and module-specific settings, with an explicit way back to the home/module selector.
5. **Settings changes must not mutate business records.** Module configuration, Main Admin configuration, offline cache operations, and operational record changes are separate workflows.
6. **Preserve unknown and existing data.** Prefer additive, backward-compatible changes. Never delete, overwrite, deduplicate, or migrate existing business records without a reviewed migration, tested backup/restore plan, and explicit approval.
7. **Audit privileged changes.** Record actor, timestamp, action, target, and relevant before/after values for privileged settings changes, while avoiding secrets and sensitive credentials in logs.
8. **Offline sync remains disabled until proven safe.** Enable only after TEST verifies authenticated authorization, duplicate/idempotency handling, retry behavior, conflict handling, and correct ownership.
9. **No production changes without explicit approval.** No production SQL/RLS changes, schema migrations, data edits, merge, or deployment until test evidence is reviewed and approval is given.
10. **Do not treat obscurity as security.** A little-known app name or only two known logged-in devices does not replace strong authentication, server-enforced authorization, secure credentials, and session review.

## Required release gates

- Inspect existing schema, migrations, role model, RPC definitions, and current policies before designing changes.
- Preserve the existing app and all current modules; do not rebuild the app wholesale.
- Run JavaScript syntax checks and available static/build checks.
- Test Main Admin, non-admin/customer, unauthenticated, and cross-user access in TEST using real test sessions.
- Verify that configuration updates leave farmers, branches, collections, payments, stock, and audit history intact.
- Verify backup restore in a separate TEST environment before any destructive or data-transforming migration.
- Document evidence and unresolved limitations before requesting release approval.

## Current implementation boundary

This document records the required policy only. It does not change application behavior, Supabase schema or policies, production data, or deployment state. Existing role and database authorization must be audited before implementing enforcement or migrations.
