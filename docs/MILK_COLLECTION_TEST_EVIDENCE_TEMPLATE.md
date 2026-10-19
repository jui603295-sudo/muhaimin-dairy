# Muhaimin Dairy — TEST Evidence Log Template

**Purpose:** Record reproducible evidence from a separate TEST Supabase project before considering any offline queue replay or production rollout.

## Safety rules

- Use a separate TEST project with disposable data only.
- Verify the project ref in the Supabase dashboard before every SQL session.
- Never include passwords, JWTs, service-role keys, connection strings, farmer personal data, or production records in this file or in GitHub.
- Use signed-in test accounts and their real user JWTs for authorization tests. Do not substitute the service-role key.
- Do not enable `MILK_QUEUE_REPLAY_ENABLED` based only on static CI success.
- If the TEST project is unavailable, leave test outcomes as **NOT RUN**; do not infer a pass.

## Run metadata

| Field | Value |
|---|---|
| Tester / reviewer | |
| Date and time (include timezone) | |
| TEST project ref (not a secret) | |
| Confirmed project is not production | NOT CONFIRMED / YES |
| App commit SHA | |
| Migration versions and order | |
| Backup source and restore verification (no production data details) | |

## Schema and migration checks

| Check | Expected result | Outcome (PASS / FAIL / NOT RUN) | Evidence / notes |
|---|---|---|---|
| V2 integrity migration applied to TEST only | Expected columns and indexes exist | NOT RUN | |
| Duplicate scale tickets checked before V2 | No unresolved conflicting tickets | NOT RUN | |
| V3 idempotency migration applied to TEST only | Nullable client_record_id and partial unique index exist | NOT RUN | |
| Unique index is valid and definition matches intended scope | Unique, valid, correct predicate | NOT RUN | |
| Existing NULL client_record_id rows preserved | Legacy rows remain available | NOT RUN | |
| RLS enabled and policies inventoried | Policies reviewed against role matrix | NOT RUN | |

## Idempotency checks

| Test | Expected result | Outcome (PASS / FAIL / NOT RUN) | Evidence / notes |
|---|---|---|---|
| Insert one new client_record_id | Exactly one row | NOT RUN | |
| Insert a different client_record_id | Second row accepted | NOT RUN | |
| Retry the first client_record_id | Duplicate rejected; count remains one | NOT RUN | |
| Insert legacy-style NULL client_record_id | Accepted if schema design allows it | NOT RUN | |
| Same normalized scale ticket, same branch/date | Duplicate rejected | NOT RUN | |
| Same scale ticket on a different branch/date | Accepted if policy permits | NOT RUN | |

## Real-JWT role authorization matrix

Record only outcomes and sanitized error codes/messages. Never paste tokens.

| Role | Read permitted test data | Create permitted record | Update permitted record | Delete / privileged action blocked when unauthorized |
|---|---|---|---|---|
| Main Admin | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Manager | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Staff | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Unauthenticated session | NOT RUN | NOT RUN | NOT RUN | NOT RUN |

For every role, test both allowed and denied operations against the actual TEST project using a normal authenticated session. A UI-hidden button is not proof of server-side authorization.

## Offline backup validation checks

| Test | Expected result | Outcome (PASS / FAIL / NOT RUN) | Evidence / notes |
|---|---|---|---|
| Valid same-user backup file | Validated only; no import or writes | NOT RUN | |
| Backup from another user | Rejected | NOT RUN | |
| Malformed JSON / wrong format | Rejected | NOT RUN | |
| File larger than 5 MB | Rejected | NOT RUN | |
| Duplicate IDs or ID/payload mismatch | Rejected | NOT RUN | |
| Validation leaves queue and database unchanged | No records imported, written, or synced | NOT RUN | |

## Release decision

- [ ] All required TEST schema/migration checks passed.
- [ ] Idempotency acceptance tests passed.
- [ ] Main Admin, Manager, Staff, and unauthenticated JWT/RLS checks passed.
- [ ] Backup validation checks passed.
- [ ] A reviewer checked the evidence and confirmed no secrets or personal data are included.
- [ ] Separate approval recorded before any change to replay behavior.

**Decision:** BLOCKED / READY FOR REVIEW (choose one; READY FOR REVIEW is not production approval)

**Reviewer notes:**

