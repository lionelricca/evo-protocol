# EVO V4.0 RC1 — Production Deployment Inventory

Snapshot date: 2026-08-23

This document separates **code state** from **deployed production state**. A green GitHub branch does not prove that its migrations or Edge Functions are live. Update this inventory after every production promotion and keep the release candidate blocked whenever material drift is known.

## Production database

Verified on the production Supabase project:

- `document_lifecycle_atomic_v3315` is applied.
- `evo_register_document_lifecycle_authoritative(jsonb)` exists.
- direct execution of that authoritative RPC is denied to `anon` and `authenticated` and allowed to the server authority role.
- the previously deployed atomic Seal, active asset identity, checkout verification, Asset Authority, transfer state-machine and Battery atomic migrations remain present in migration history.
- Supabase Security Advisor reported no security lints after the deployment work in this snapshot.

## Critical Edge Function inventory

| Function | Production version | Browser-origin state | Notes |
| --- | ---: | --- | --- |
| `register-evo-seal` | 7 | restricted | Atomic Seal + entitlement registration preserved. |
| `register-evo-passport-event` | 6 | restricted | Signed owner event + authoritative RPC preserved. |
| `evo-passport-transfer` | 6 | restricted | Signed inbox, offer, accept and cancel; transfer RPC state machine preserved. |
| `register-evo-wallet` | 5 | restricted | Unsigned first contact remains ephemeral until signed proof. |
| `register-evo-issuer` | 3 | restricted | Wallet-signed issuer profile flow. |
| `evo-domain-verification` | 4 | restricted | DNS verification abuse/rate boundary preserved. |
| `submit-evo-organization` | 5 | restricted | Signed organization submission and pending uniqueness handling preserved. |
| `evo-checkout` | 13 | restricted | Exact balance requires wallet signature; verification/rate/credit controls preserved. |
| `evo-document-lifecycle` | 3 | restricted | Atomic authoritative lifecycle RPC. |
| `evo-service-proof` | 4 | restricted | Owner/provider separation and provider countersign flow preserved. |
| `evo-reality-continuity` | 4 | restricted | Current-owner continuity commit and stale-root checks preserved. |
| `evo-battery-passport` | 3 | **CORS review pending** | Large multi-action surface; do not blanket-change before its dedicated regression pass. |

The restricted functions use the shared `_shared/evo-cors.ts` policy: the current official GitHub Pages origin is built in, additional trusted HTTPS origins are environment-configurable, local HTTP origins require an explicit development-only opt-in, opaque/null origins are rejected, and server-to-server requests without an `Origin` header remain compatible.

## Public / observational surfaces

The following functions are deliberately **not included in the critical-write CORS rollout** in this snapshot:

- `evo-pulse`;
- `evo-challenge`;
- `evo-ai-guardian`;
- `evo-ai-guardian-v04`.

These surfaces require an endpoint-specific review because some functionality is intentionally public/observational. Do not apply the critical-write CORS policy to them solely for consistency. CORS is a browser boundary, not a substitute for authorization, rate limits, signature verification or RLS.

## JWT configuration note

The current Edge Functions are deployed with Supabase platform `verify_jwt=false`. This is not, by itself, an authorization model. Critical flows instead use application-level signed wallet protocols, server-side validation, restricted RPC grants and/or other explicit controls. Each endpoint must keep its authentication/authorization assumptions documented and tested. Do not switch `verify_jwt` globally without checking browser/wallet/public compatibility endpoint by endpoint.

## Promotion rule

Before promoting V4.0 RC1 to a production release:

1. finish the Battery Passport CORS review and regression pass;
2. re-run all GitHub release/security workflows on the exact release commit;
3. verify the production migration list and Edge Function versions again;
4. perform a real browser-to-production atomic Seal E2E creation using a controlled test case;
5. verify rollback/key-rotation procedures;
6. complete hosting-edge security headers and final CSP review;
7. protect `main` and require the security/status checks;
8. complete an independent security review before high-assurance or enterprise security claims.

## Claims discipline

This inventory is deployment evidence, not proof that EVO is unhackable or immune to compromise. It supports narrower claims about which controls are present and deployed at this snapshot.