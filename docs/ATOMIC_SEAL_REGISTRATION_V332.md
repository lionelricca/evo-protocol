# EVO V3.3.2 · Atomic Seal Registration

## Security invariant

An EVO Proof entitlement must never be consumed unless the corresponding EVO Seal is committed in the same PostgreSQL transaction.

The target path is:

`verified wallet signature -> server validation -> evo_register_seal_with_credit(jsonb) -> Seal + entitlement commit`

A failure anywhere inside the database boundary rolls back the whole transaction.

## What V3.3.2 changes

- `register-evo-seal` no longer calls `evo_claim_passport_credit` and then inserts a Seal in a second transaction.
- `evo_register_seal_with_credit(jsonb)` performs entitlement selection, Seal insertion and consumption recording atomically.
- A wallet-wide advisory transaction lock serializes DEMO/PAID decisions even when concurrent requests use different Seal IDs.
- Exact retries are idempotent: an already-committed identical Seal returns its original economic result and does not consume another credit.
- A same-ID request with a different digest or metadata hash fails closed as `seal_id_conflict`.
- Historical orphan consumption rows from the previous two-step design can be reused to complete their intended Seal without charging the wallet twice.
- New Seal status is forced to `ACTIVE` at the database boundary.
- The atomic RPC is `SECURITY DEFINER`, uses `search_path=''`, and is not executable by `anon` or `authenticated`.

## Asset identity duplicate guard

The business identity tuple is:

`lower(issuer_wallet) + asset_hash + serial + ACTIVE status`

A table-level trigger now blocks a new active duplicate from every write path, not only from the public Edge Function. It raises `duplicate_asset_serial` inside the same transaction, so any provisional paid-credit update rolls back with the rejected Seal.

A unique partial index would be preferable as the final structural constraint, but it cannot be introduced safely until existing legacy duplicate test data is reviewed.

## Read-only production baseline · 2026-08-21

The production database was inspected without modifying data:

- orphan credit consumptions whose Seal does not exist: **0**
- wallets whose `consumed_credits` differs from their number of PAID consumption rows: **0**
- active duplicate asset identity groups: **1**

The single duplicate group is historical test data using serial `V1-TEST-001`. It contains two ACTIVE test Seals created on 2026-08-17. No record has been modified or deleted by this hardening work.

Before replacing the trigger with a unique partial index, the duplicate should be reviewed and one historical test record should be handled through an auditable lifecycle decision rather than silently deleted.

## Isolated database testing

Supabase preview branching is not available on the project's current plan, so V3.3.2 does **not** use production as a test environment.

`EVO Security Gate` starts an isolated PostgreSQL 17 service and applies:

1. a minimal schema fixture matching the economic tables;
2. the proposed atomic registration migration;
3. the proposed active asset identity guard;
4. transaction and concurrency tests.

The test suite covers:

- first DEMO registration;
- exact retry without a second charge;
- PAID registration;
- same-ID conflict;
- rollback when Seal insertion fails;
- insufficient-credit rollback;
- forced initial `ACTIVE` status;
- legacy orphan-consumption recovery;
- duplicate asset identity rollback;
- two concurrent requests to the same wallet, proving exactly one DEMO and one PAID entitlement when one paid credit is available;
- privileged function execution grants and `search_path` hardening.

## Deployment gate

Do not deploy V3.3.2 to production until all of the following are true:

- Security Gate passes with PostgreSQL runtime tests.
- Existing legacy duplicate test data has an explicit lifecycle decision.
- The migration is reviewed immediately before application.
- The database migration is applied before the new `register-evo-seal` Edge Function.
- A post-migration read-only audit confirms function privileges, trigger state, entitlement consistency and zero new duplicate identities.
- A rollback procedure is available.

## Claim discipline

V3.3.2 supports the statement that EVO uses an atomic, retry-safe economic boundary for proposed Seal registration once this version is deployed and verified in production.

It does not justify claims such as "unhackable", "100% secure" or independently certified security.
