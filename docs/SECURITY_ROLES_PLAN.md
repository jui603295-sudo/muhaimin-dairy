# Muhaimin Dairy — Roles and Data Isolation Plan

## Current account findings (owner-confirmed)

- The owner confirms that `jui603295@gmail.com` has been and remains the account used to run Muhaimin Dairy; it opens the dashboard and shows the business data.
- Preserve this account as the **primary Main Admin candidate** for the role-based security implementation. This confirmation identifies the intended account, but does not by itself prove its Supabase Auth user ID or that server-enforced Main Admin permissions are already configured.
- `muhaimin.dairy@gmail.com` is not the current working account and must not replace it unless the owner later explicitly requests and verifies a controlled migration.
- Never store passwords, service-role keys, or other secrets in this repository.

## Current verified database findings

- The public business tables listed in the 2026-10-16 inspection have RLS enabled.
- Most tables use a broad `authenticated` policy with `USING (true)` and `WITH CHECK (true)`. Any authenticated account covered by these policies may operate on all rows in those tables.
- The six inventory purchase/sale tables inspected earlier have no `user_id` or `owner_id` column.
- The current schema therefore does not yet enforce the requested distinction between Main Admin, Employee, and Customer accounts.
- The current app signs up users through Supabase Auth. Public sign-up must never be allowed to choose its own privileged role.

## Target model

1. **Main Admin** — the verified Supabase Auth identity for `jui603295@gmail.com`; designate this account through a controlled, server-enforced setup after confirming its Auth user ID.
2. **Employee** — belongs to the Muhaimin Dairy business; access is restricted to the specific operational permissions assigned to employees.
3. **Customer** — not an administrator or employee; may access only customer-facing features and their own customer-linked records.
4. **Business identity** — existing core business data must be assigned to the Muhaimin Dairy business identity. Role labels in the UI alone are not a security boundary.
5. **Server-enforced security** — RLS policies must enforce the role and data scope. Do not trust client-side role values, user-editable metadata, or hidden buttons.

## Safe implementation sequence

- Keep all work on `security/roles-access-control`; do not merge to `main` yet.
- Preserve `jui603295@gmail.com` as the primary working login. Do not change its password, role, or session during planning.
- Verify the exact Supabase Auth user ID for this email using the Supabase dashboard; never infer the ID from the email or promote the first registered user.
- Design an additive SQL migration: create protected profile/role and business-membership structures, assign existing business data to the Muhaimin Dairy business identity, and replace broad policies with role-aware policies.
- Preserve all existing business records; do not use destructive table or row operations for role setup.
- Define and enforce Employee permissions and Customer data scope before enabling policies, to avoid accidentally locking out the legitimate business operator.
- Update the app UI to display the server-verified role and route accounts to appropriate features. UI checks must supplement, not replace, RLS.
- Test using separate test accounts and non-production/test data; verify denied reads and writes as well as permitted actions.
- Review the migration and app diff, run static checks, and verify a deployment only after explicit approval. Never apply SQL to the live Supabase project from this planning file.

## Explicitly not done

- No Supabase SQL was executed.
- No live rows, accounts, policies, or production settings were changed.
- No changes were made to the `main` branch or the live Pages deployment.
- No account has been promoted, demoted, or reassigned.
- This document is a plan, not a claim that role-based security is implemented.
