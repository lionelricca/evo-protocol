# EVO V4.0 RC · Production Deployment Inventory

Audit date: 2026-08-23

This is a **read-only production inventory** of Supabase project `njvyrvmyhtplprdumzri`. It records what was observed in production and must not be interpreted as authorization to deploy or mutate data.

## Production migration history observed

Production currently records migrations through:

- atomic Seal + credit registration (`20260822105136`);
- active asset identity guard (`20260822105154`);
- checkout verification rate limit and explicit-deny policies (`20260822105213`, `20260822105251`);
- domain verification rate guard (`20260822110530`);
- organization pending guard (`20260822111047`);
- Asset Authority lock (`20260822112538`);
- Transfer State Machine (`20260822113209`);
- Battery atomic registration (`20260822113955`);
- authoritative Document Lifecycle (`20260823214939`).

The V4 Service Proof Authority migration `20260823180000_service_proof_authority_v400.sql` is **not present** in the observed production migration history.

## Privileged production RPC boundary observed

The following SECURITY DEFINER functions were observed with `search_path=''`, browser-role execution denied and `service_role` execution enabled:

- `evo_register_seal_with_credit(jsonb)`;
- `evo_checkout_take_verification_slot(text,text)`;
- `evo_register_passport_event_authoritative(jsonb)`;
- `evo_create_passport_transfer_offer_authoritative(jsonb)`;
- `evo_accept_passport_transfer_authoritative(...)`;
- `evo_register_battery_model_authoritative(jsonb)`;
- `evo_register_document_lifecycle_authoritative(jsonb)`.

Not observed in production at audit time:

- `evo_register_service_proof_authoritative(jsonb)`;
- `evo_countersign_service_proof_authoritative(jsonb)`.

That absence matters because the V4 RC Service Proof Edge Function expects these RPCs before it can be safely deployed.

## Active Edge Functions observed

| Function | Production version | `verify_jwt` | RC note |
| --- | ---: | --- | --- |
| `register-evo-seal` | 7 | false | custom wallet-signature/atomic path; JWT is not the authorization model |
| `register-evo-passport-event` | 6 | false | authoritative Passport Event RPC exists |
| `evo-passport-transfer` | 6 | false | mixed lookup/inbox/mutation endpoint; CORS compatibility decision remains |
| `evo-ai-guardian` | 4 | false | public risk-analysis semantics |
| `evo-pulse` | 4 | false | public observational signal only |
| `evo-challenge` | 3 | false | public software observation only |
| `register-evo-issuer` | 3 | false | custom wallet proof |
| `evo-ai-guardian-v04` | 3 | false | public explainable risk engine |
| `evo-domain-verification` | 4 | false | custom signed issue flow + DNS validation |
| `submit-evo-organization` | 5 | false | custom signed submission flow |
| `evo-reality-continuity` | 4 | false | restricted browser CORS observed; commit still inserts snapshot from Edge directly |
| `evo-battery-passport` | 3 | false | mixed public/export/mutation endpoint; CORS compatibility decision remains |
| `register-evo-wallet` | 5 | false | unsigned connect remains non-authoritative by design |
| `evo-checkout` | 13 | false | custom payment verification/private-balance proof model |
| `evo-document-lifecycle` | 3 | false | authoritative lifecycle RPC exists |
| `evo-service-proof` | 4 | false | restricted browser CORS observed, but production code still performs direct Service Proof insert/update |

`verify_jwt:false` is therefore not treated as equivalent to unauthenticated authority. Each sensitive endpoint must continue to enforce its own wallet-signature, state-machine, RPC, rate-limit and replay rules.

## Important branch/production drift

### Service Proof

Production `evo-service-proof` v4 already contains the shared restricted-origin CORS policy, but its create path still:

1. resolves the current owner in the Edge Function;
2. verifies the owner signature;
3. directly inserts `evo_service_proofs`.

Its countersign path also directly updates the row.

This leaves the ownership-check / write boundary outside one database transaction. V4 RC closes that gap with the per-Seal Asset Authority lock and two privileged RPCs. Therefore deployment order must be:

1. apply `20260823180000_service_proof_authority_v400.sql`;
2. verify RPC ACL/search-path/state invariants;
3. deploy the matching `evo-service-proof` Edge Function;
4. run a controlled post-deployment Service Proof smoke test.

Never deploy the RC Edge Function before its RPC migration.

### Reality Continuity

Production `evo-reality-continuity` v4 already has restricted-origin browser CORS and strong pre-insert verification, but the final checkpoint is still inserted directly by the Edge Function after the current-owner/evidence checks.

A transfer can theoretically race between the owner/evidence read and the snapshot insert. Production unique indexes protect chain forks/duplicate roots, but they do not by themselves make the signer-current-owner decision atomic with the snapshot write.

V4 RC should therefore add an authoritative per-Seal database boundary before calling Reality Continuity fully serialized with ownership transitions.

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
