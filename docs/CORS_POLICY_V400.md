# EVO V4.0 RC · Browser CORS Policy

CORS is a browser integration policy, **not an authorization mechanism**. Sensitive EVO authority continues to come from wallet signatures, bounded/replay-safe messages, authoritative database RPCs, ownership/state checks and rate limits.

## Restricted official-browser endpoints

These endpoints are used by the official EVO browser application and reject untrusted browser Origins while preserving requests with no Origin for server-to-server/API use:

- `evo-checkout`;
- `register-evo-seal`;
- `register-evo-wallet`;
- `register-evo-issuer`;
- `evo-domain-verification`;
- `submit-evo-organization`;
- `register-evo-passport-event`;
- `evo-service-proof`;
- `evo-reality-continuity`;
- `evo-document-lifecycle`.

Allowed browser origins come from the shared `_shared/evo-cors.ts` policy. The built-in official origin is `https://lionelricca.github.io`; additional HTTPS production origins may be configured with `EVO_ALLOWED_ORIGINS`.

## Intentionally browser-public mixed API endpoints

Two endpoints retain wildcard browser CORS deliberately because they contain public discovery/export functionality and are intended to remain usable by compatible third-party browser integrations.

### Passport Transfer

`evo-passport-transfer` retains browser-public CORS.

Security does not depend on CORS:

- request bodies are bounded;
- `lookup` is a public offer-status operation;
- `inbox` requires a fresh wallet signature and binds the signed message to the requesting Origin;
- transfer offers require the current owner's signature and are created through the authoritative transfer RPC;
- acceptance requires the intended recipient's signature and uses the atomic transfer state machine;
- cancellation requires the sender's signature;
- ownership changes are serialized with the per-Seal Asset Authority lock.

The wildcard therefore permits integration; it does not grant transfer authority.

### Battery Passport

`evo-battery-passport` retains browser-public CORS because the same endpoint exposes public/readiness/export operations such as requirements, assessment, public model/passport reads and DPP export.

Mutation authority remains cryptographic/stateful:

- bodies and signatures are bounded;
- `commit_model` verifies the issuer wallet signature over the canonical model hash/ID/message and writes through `evo_register_battery_model_authoritative`;
- `commit_passport` verifies the issuer wallet signature over the canonical passport hash/ID/message and writes through the atomic Battery Passport RPC;
- browser roles do not receive direct privileged database authority.

## Decision

For V4.0 RC1, wildcard CORS on **Passport Transfer** and **Battery Passport** is an intentional interoperability decision, not an unresolved security TODO.

If a later enterprise deployment requires first-party-browser-only operation, EVO may split public read/export actions from mutation endpoints and apply restricted CORS to the mutation-only surfaces without changing the cryptographic authority model.
