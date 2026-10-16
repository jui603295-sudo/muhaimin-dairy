# Muhaimin Dairy — Roles and Data Isolation Plan

## Confirmed account identity

- Intended Main Admin email supplied and confirmed by the owner: `muhaimin.dairy@gmail.com`.
- Before assigning the role, verify that this exact email belongs to the intended Supabase Auth user. Never promote a different account or automatically promote the first registered user.
- Do not store passwords, service-role keys, or other secrets in this repository.

## Current verified database findings

- The public business tables listed in the 2026-10-16 inspection have RLS enabled.
- Most tables use a broad `authenticated` policy with `USING (true)` and `WITH CHECK (true)`. This means any authenticated account covered by those policies can operate on all rows in those tables.
- The six inventory purchase/sale tables inspected earlier have no `user_id` or `owner_id` column.
- The current schema therefore does not yet enforce the requested distinction between Main Admin, Employee, and Customer accounts.
- The current app signs up users through Supabase Auth. A public sign-up must never be allowed to choose its own privileged role.

## Target model

1. **Main Admin** — the verified Supabase Auth account matching `muhaimin.dairy@gmail.com`; may administer the business and manage roles.
2. **Employee** — belongs to the Muhaimin Dairy business; access is restricted to the specific operational permissions assigned to employees.
3. **Customer** — not an administrator or employee; may access only customer-facing features and their own customer-linked records.
4. **Business identity** — existing core business data must be assigned to the Muhaimin Dairy business identity. Role labels in the UI alone are not a security boundary.
5. **Server-enforced security** — RLS policies must enforce the role and data scope. Do not trust client-side role values, user-editable metadata, or hidden buttons.

## Safe implementation sequence

- Keep all work on `security/roles-access-control`; do not merge to `main` yet.
- Verify whether the confirmed Main Admin email already exists in Supabase Auth before creating or promoting a profile.
- Design an additive SQL migration: create protected profile/role and business-membership structures, assign the existing business data to the Muhaimin Dairy business identity, and replace broad policies with role-aware policies.
- Preserve all existing business records; do not use destructive table or row operations for role setup.
- Define and enforce the Employee permissions and Customer data scope before enabling the policies, to avoid accidentally locking out the legitimate business operator.
- Update the app UI to display the server-verified role and route accounts to the appropriate features. UI checks must supplement, not replace, RLS.
- Test using separate test accounts and non-production/test data; verify denied reads and writes as well as permitted actions.
- Review the migration and app diff, run static checks, and verify a deployment only after explicit approval. Never apply SQL to the live Supabase project from this planning file.

## Explicitly not done

- No Supabase SQL was executed.
- No live rows, accounts, policies, or production settings were changed.
- No changes were made to the `main` branch or the live Pages deployment.
- This document is a plan, not a claim that role-based security is implemented.
