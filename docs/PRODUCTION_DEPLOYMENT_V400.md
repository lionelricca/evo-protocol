# EVO Protocol V4.0 RC1 · Production Deployment & Rollback Plan

Status: **PREPARED — NOT AUTHORIZED FOR EXECUTION**

This runbook defines the production promotion sequence for EVO V4.0 RC1. It does not authorize any production mutation, deployment, payment test, record lifecycle action, merge or tag.

Release branch: `codex/evo-v400-release-candidate`

The exact branch head must be re-confirmed green immediately before execution. Never deploy from an older local checkout or from an unverified ZIP.

## 1. Non-negotiable release rules

1. Database authority migrations are deployed **before** Edge Functions that depend on them.
2. Never deploy the V4 Service Proof or Reality Continuity Edge Function while its authoritative RPC is absent.
3. Never delete production evidence to make a test pass.
4. Never repair migration history manually unless the exact remote/local mismatch has first been audited.
5. Browser smoke tests and production deployment are separate gates.
6. Paid checkout is tested only with an explicitly controlled transaction.
7. Every production change must have a recorded before/after state and rollback target.

## 2. Pre-deployment freeze

Before any production write:

- confirm PR #49 is mergeable and all required workflows are green on the exact head;
- run `npm test` from the release bundle;
- record release head SHA;
- record release artifact SHA-256;
- record current production Edge Function versions;
- export/read current production migration history;
- run Supabase Security Advisor read-only;
- verify zero orphan credit-consumption rows;
- verify PAID credit counters match their consumption ledger;
- confirm official browser origins and CORS environment configuration;
- record current deployed function versions as rollback targets.

If any preflight changes between audit and deployment, stop and re-audit.

## 3. Database deployment — Phase A: Service Proof Authority

Required migration:

`supabase/migrations/20260823180000_service_proof_authority_v400.sql`

Expected privileged RPCs after migration:

- `evo_register_service_proof_authoritative(jsonb)`;
- `evo_countersign_service_proof_authoritative(jsonb)`.

Post-migration checks before deploying Edge code:

- functions exist;
- `search_path` is fixed as designed;
- `anon` / browser roles cannot execute privileged RPCs directly;
- `service_role` has required execute permission;
- per-Seal advisory lock is present;
- create path is retry-idempotent;
- countersign path is one-time/retry-safe;
- PostgreSQL runtime fixture still passes against the release SQL.

**Stop condition:** if any invariant fails, do not deploy `evo-service-proof`.

## 4. Edge deployment — Phase A

Deploy only the matching RC function:

`supabase/functions/evo-service-proof`

Then run controlled smoke checks:

1. read an existing Service Proof;
2. create a controlled Service Proof as the current owner;
3. retry the exact create request and confirm idempotency;
4. reject creation by a non-owner;
5. countersign with the intended provider;
6. retry the exact countersign and confirm stable result;
7. reject countersign by another wallet;
8. verify public/read behavior remains unchanged.

If write behavior is wrong, stop before Reality Continuity rollout.

## 5. Database deployment — Phase B: Reality Continuity Authority

Required migration:

`supabase/migrations/20260823181500_reality_continuity_authority_v400.sql`

Expected privileged RPC after migration:

- `evo_register_reality_checkpoint_authoritative(jsonb)`.

Post-migration checks before Edge deployment:

- RPC exists;
- browser roles cannot execute it directly;
- `service_role` execute permission is present;
- per-Seal Asset Authority lock matches ownership-transition namespace;
- current owner is re-derived inside the transaction;
- live evidence state is re-derived inside the transaction;
- evidence root is recomputed server-side;
- active chain parent is checked server-side;
- continuity root / Snapshot ID are recomputed server-side;
- exact retry is idempotent;
- stale owner / stale evidence / stale previous-root fixtures fail closed.

**Stop condition:** if any invariant fails, do not deploy `evo-reality-continuity`.

## 6. Edge deployment — Phase B

Deploy only the matching RC function:

`supabase/functions/evo-reality-continuity`

Controlled smoke sequence:

1. prepare checkpoint;
2. sign with current owner;
3. commit checkpoint;
4. retry exact commit and confirm idempotency;
5. attempt stale previous root and confirm rejection;
6. verify an old owner cannot commit after ownership transfer;
7. verify a new owner can extend the active chain after transfer.

## 7. Remaining branch/production drift

Before deploying any other Edge Function, compare the RC file against the exact active production function and classify the difference as:

- required security fix;
- compatibility-only change;
- documentation/no-runtime difference;
- already present in production.

Relevant first-party surfaces to re-check include:

- `evo-checkout`;
- `register-evo-seal`;
- `register-evo-wallet`;
- `register-evo-issuer`;
- `evo-domain-verification`;
- `submit-evo-organization`;
- `register-evo-passport-event`;
- `evo-document-lifecycle`.

Do not redeploy a function merely to make production version numbers match the repository.

Passport Transfer and Battery Passport keep their documented RC1 mixed-endpoint CORS policy unless a separately reviewed architecture change splits their public and mutation surfaces.

## 8. Static frontend promotion

The default V4 client surface is intentionally limited to:

- EVO Origin;
- EVO Proof;
- EVO Passport;
- public Verify.

Guardian, Pulse and Battery DPP remain repository capabilities but are not loaded by the default commercial entrypoint.

Before frontend promotion:

- run clean-browser smoke test;
- verify MetaMask connection;
- verify silent session restoration semantics;
- verify first-use Free Proof eligibility;
- create one controlled atomic Proof;
- verify generated QR/public page;
- verify exact document match;
- modify the document and verify mismatch;
- verify issuer-authority wording;
- verify ES/EN critical flows;
- verify no customer-facing internal release/security terminology appears.

## 9. Post-deployment read-only audit

After all authorized changes:

- rerun Security Advisor;
- rerun RLS / privileged RPC audit;
- reconfirm RPC execute grants;
- verify exact deployed Edge Function versions/hashes;
- reconfirm zero orphan credit-consumption rows;
- reconfirm PAID credit counters match ledger consumption;
- verify public verification remains read-only/free;
- verify restricted Battery data is absent from public reads/exports;
- verify browser CORS behavior from official origin;
- record final production state in `docs/PRODUCTION_INVENTORY_V400.md`.

## 10. Rollback strategy

### Edge Functions

Before rollout, record each active production function version. If a new Edge Function causes a regression, redeploy the recorded previous implementation immediately.

Rollback order is the reverse of deployment order when dependencies require it.

### Database migrations

V4 authority migrations are additive authority/RPC changes. Do **not** perform destructive ad-hoc SQL rollback on production evidence.

If an RPC implementation is defective:

1. stop deployment of dependent Edge Functions;
2. restore/redeploy the prior Edge implementation when safe;
3. create a new forward migration that corrects or revokes the defective RPC;
4. rerun PostgreSQL runtime and security fixtures;
5. document the corrective migration in production history.

Never delete historical records to simulate rollback.

### Frontend

Record the previous static release SHA/artifact before promotion. If the browser client regresses, restore the previous static release while leaving evidence/database state intact.

## 11. Historical `V1-TEST-001`

The duplicate test identity is resolved only through the auditable lifecycle procedure documented in `docs/V1_TEST_001_RESOLUTION.md` and only after explicit owner authorization. It is not part of database cleanup and must not be silently deleted.

## 12. Final release sequence

Only after all applicable smoke and backend gates are green:

1. protect `main` and require critical checks;
2. decide repository licensing/copyright policy;
3. obtain explicit owner authorization for production promotion;
4. execute authorized production deployment in this runbook order;
5. complete post-deployment audit;
6. obtain explicit authorization to merge PR #49;
7. merge to `main`;
8. create final release/tag from the exact verified merge commit;
9. archive final source artifact and SHA-256;
10. update production inventory and release notes.

## Release claim

Passing this runbook supports describing EVO as a **commercial-pilot release with defense-in-depth controls**. It does not justify claims such as “unhackable”, “100% secure”, “legally original”, “W3C certified”, “ISO certified” or “qualified trust service” without independent evidence for those claims.
