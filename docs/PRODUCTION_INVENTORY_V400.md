# EVO V4.0 RC · Production Deployment Inventory

Audit date: 2026-08-23

This is a **read-only production inventory** of Supabase project `njvyrvmyhtplprdumzri`. It records what was observed in production and must not be interpreted as authorization to deploy or mutate data.

## Production migration history observed

Production currently records migrations through the V3.3 foundation, including:

- atomic Seal + credit registration (`20260822105136`);
- active asset identity guard (`20260822105154`);
- checkout verification rate limit and explicit-deny policies (`20260822105213`, `20260822105251`);
- domain verification rate guard (`20260822110530`);
- organization pending guard (`20260822111047`);
- Asset Authority lock (`20260822112538`);
- Transfer State Machine (`20260822113209`);
- Battery atomic registration (`20260822113955`);
- authoritative Document Lifecycle (`20260823214939`).

Not present in the observed production migration history:

- V4 Service Proof Authority: `20260823180000_service_proof_authority_v400.sql`;
- V4 Reality Continuity Authority: `20260823181500_reality_continuity_authority_v400.sql`.

## Privileged production RPC boundary observed

Observed SECURITY DEFINER functions with `search_path=''`, browser-role execution denied and `service_role` execution enabled include:

- `evo_register_seal_with_credit(jsonb)`;
- `evo_checkout_take_verification_slot(text,text)`;
- `evo_register_passport_event_authoritative(jsonb)`;
- `evo_create_passport_transfer_offer_authoritative(jsonb)`;
- `evo_accept_passport_transfer_authoritative(...)`;
- `evo_register_battery_model_authoritative(jsonb)`;
- `evo_register_document_lifecycle_authoritative(jsonb)`.

Not observed in production at audit time:

- `evo_register_service_proof_authoritative(jsonb)`;
- `evo_countersign_service_proof_authoritative(jsonb)`;
- `evo_register_reality_checkpoint_authoritative(jsonb)`.

The matching V4 Edge Functions therefore must not be deployed before these RPC migrations.

## Active Edge Functions observed

| Function | Production version | `verify_jwt` | Observed production state |
| --- | ---: | --- | --- |
| `register-evo-seal` | 7 | false | custom wallet-signature / atomic path |
| `register-evo-passport-event` | 6 | false | authoritative Passport Event RPC exists |
| `evo-passport-transfer` | 6 | false | mixed lookup/inbox/mutation endpoint |
| `evo-ai-guardian` | 4 | false | public risk-analysis semantics |
| `evo-pulse` | 4 | false | public observational signal only |
| `evo-challenge` | 3 | false | public software observation only |
| `register-evo-issuer` | 3 | false | custom wallet proof |
| `evo-ai-guardian-v04` | 3 | false | public explainable risk engine |
| `evo-domain-verification` | 4 | false | custom signed issue flow + DNS validation |
| `submit-evo-organization` | 5 | false | custom signed submission flow |
| `evo-reality-continuity` | 4 | false | restricted browser CORS; checkpoint still inserted directly from Edge |
| `evo-battery-passport` | 3 | false | mixed public/export/mutation endpoint |
| `register-evo-wallet` | 5 | false | unsigned connect remains non-authoritative by design |
| `evo-checkout` | 13 | false | custom payment verification/private-balance proof model |
| `evo-document-lifecycle` | 3 | false | authoritative lifecycle RPC exists |
| `evo-service-proof` | 4 | false | restricted browser CORS; create/countersign still write directly from Edge |

`verify_jwt:false` is not treated as equivalent to unauthenticated authority. Sensitive endpoints continue to require their own wallet-signature, state-machine, privileged-RPC, rate-limit and replay protections.

## Important branch/production drift

### Service Proof

Production `evo-service-proof` v4 already contains the shared restricted-origin CORS policy, but its create path still resolves current owner in Edge and then directly inserts `evo_service_proofs`; countersigning directly updates the row.

V4 RC closes this ownership-check/write race with:

- `evo_register_service_proof_authoritative(jsonb)`;
- `evo_countersign_service_proof_authoritative(jsonb)`;
- the same per-Seal Asset Authority advisory lock used by ownership transitions;
- exact retry idempotency and one-time provider countersigning.

Deployment order:

1. apply `20260823180000_service_proof_authority_v400.sql`;
2. verify RPC ACL/search-path/runtime invariants;
3. deploy matching `evo-service-proof`;
4. run controlled Service Proof create/countersign smoke tests.

### Reality Continuity

Production `evo-reality-continuity` v4 already has restricted-origin CORS and strong Edge-side verification, but its checkpoint is inserted directly after separate evidence/current-owner reads. A transfer could race between the authority check and checkpoint insert.

V4 RC now closes that gap with `evo_register_reality_checkpoint_authoritative(jsonb)`. Inside one transaction it:

- takes the per-Seal Asset Authority lock;
- re-derives the current owner;
- re-derives live issuer/passport/pulse/challenge evidence state;
- recomputes the SHA-256 evidence root using the same canonical representation;
- checks the active chain parent;
- recomputes the continuity root and expected Snapshot ID;
- inserts the checkpoint atomically;
- supports exact retry idempotency;
- denies browser roles direct execution.

The PostgreSQL 17 fixture/runtime suite for this RPC is green in the V4 Security Gate.

Deployment order:

1. apply `20260823181500_reality_continuity_authority_v400.sql`;
2. verify RPC ACL/search-path/hash invariants;
3. deploy matching `evo-reality-continuity`;
4. run controlled prepare → sign → commit smoke test and a transfer-race regression check.

## Production data checks still required before release

Before final promotion:

- confirm zero orphan credit-consumption rows;
- confirm paid `consumed_credits` counters match PAID consumption records;
- re-check RLS/security advisor after all deployment changes;
- verify exact deployed function versions/hashes after rollout;
- confirm configured allowed browser origins;
- record rollback target versions;
- resolve historical duplicate test identity `V1-TEST-001` through an auditable lifecycle action rather than deletion.

## Deployment rule

This inventory does **not** authorize production changes. V4 migrations/functions are deployed only after explicit owner authorization, in dependency order, followed by read-only security validation and controlled smoke tests.
