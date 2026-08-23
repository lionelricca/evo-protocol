# EVO Trust Layer

**Proofs, Passports and verifiable lifecycle evidence for assets and documents.**

EVO is an independent trust-layer project for creating wallet-signed digital records, public verification pages and portable lifecycle evidence. The product combines asset passports, document integrity, service evidence, controlled ownership transfer and issuer evidence without claiming that a QR, blockchain record or self-declaration alone proves physical authenticity or legal truth.

## Current code status — V4.0.0 RC1

V4.0.0 RC1 is a release-readiness checkpoint built on the V3.3.18 security-hardening line. At the start of this release review, `codex/evo-v400-release-candidate` and `codex/evo-v330-security-hardening` pointed to the same audited commit (`c1be49a627e877879645275f525152226388ddce`).

The baseline commit passed:

- EVO Security Gate;
- EVO Document Proof checks;
- EVO Service Proof checks;
- EVO navigation checks;
- EVO navigation V2.7.3 checks.

A green branch is **not** the same as a complete production rollout. Some security controls still require explicit deployment, infrastructure configuration or independent verification. See `docs/RELEASE_READINESS_V400.md` and `docs/SECURITY.md` before promoting the RC.

## Product model

EVO separates evidence into explicit layers rather than using an unsupported binary “authentic/not authentic” claim.

Core flow:

`PROOF → PASSPORT → LIFECYCLE → AUTHORITY → VERIFY`

Supporting evidence includes:

- wallet signatures;
- local SHA-256 file hashing;
- issuer wallet/domain/organization evidence;
- owner/provider countersignatures;
- ownership transitions;
- lifecycle events;
- optional observation/risk signals;
- future stronger physical or regulated evidence.

Public telemetry such as QR scans, EVO Pulse or software-only Challenge signals is observational and cannot elevate authoritative trust by itself.

## Current capabilities

### EVO Proof / Seal

- one free demonstration Proof per eligible wallet;
- wallet-signed creation;
- local SHA-256 hashing;
- public verification record and QR;
- atomic entitlement consumption/registration path;
- active duplicate asset identity protection.

### EVO Passport

- current-owner model;
- signed lifecycle events;
- public history;
- two-party ownership transfer;
- per-Seal authority serialization and atomic transfer state machine.

### Document Proof

- exact file fingerprint calculated in the browser;
- original file does not need to be uploaded to EVO;
- issuer/reference metadata;
- public hash comparison;
- signed revoke/supersede lifecycle;
- historical records remain auditable.

Document Proof demonstrates EVO registration, signature, file-fingerprint integrity and lifecycle state. It does not by itself establish truth of content, legal originality or accredited-authority status.

### Service Proof

- signed maintenance/service evidence tied to an EVO asset;
- optional designated provider wallet;
- provider wallet must differ from owner wallet;
- explicit `OWNER_DECLARED`, provider-pending and provider-countersigned trust states;
- provider inbox in My EVO;
- Service Proofs included in Passport history.

### Issuer / organization evidence

- wallet-proven issuer profile;
- optional domain evidence;
- optional organization evidence;
- separate authority levels instead of presenting a typed organization name as verified identity.

### Checkout / EVO Proof balance

Commercial reference in the current UI:

- first eligible Proof: free, once per wallet;
- individual: **US$9.90** for one EVO Proof;
- pack: **US$49** for ten EVO Proofs;
- public verification remains free.

Checkout verifies settlement in Circle-issued USDC on the supported EVM networks configured in the application. The browser does not hold private keys or custody customer funds. Exact purchased/used/remaining Proof counters are private and require a wallet signature to read; the public status exposes only the minimum entitlement state required by the UI.

The receiving merchant wallet is intentionally public because it is an on-chain payment destination.

### Reality / Guardian layers

- Reality Continuity and authority-state building blocks;
- EVO Pulse and Challenge as non-authoritative observation signals;
- explainable Guardian risk analysis;
- no unsupported physical-authenticity inference.

### Future physical/standards layers

The repository includes design work for secure NFC, Digital Product Passport interoperability, verifiable credentials and other standards-oriented connectors. These documents describe direction/preparation and must not be presented as certifications already obtained.

## Security baseline

Security is treated as a release gate.

Current code includes, among other controls:

- no private-key/seed storage;
- RLS/minimum-grant design for exposed database surfaces;
- privileged writes through server-side authority paths;
- payload and format validation;
- replay/idempotency protections;
- checkout verification rate controls;
- atomic economic/ownership state transitions;
- local vendored QR dependency;
- browser CSP baseline;
- exact-origin CORS policy on the first set of privileged browser endpoints;
- explicit separation between observational and authoritative trust.

Important remaining release gates include branch protection, production-edge security headers, additional CORS rollout review, CSP reduction after browser/network inventory, a real production atomic-Seal E2E test, auditable cleanup of historical test state, rollback/key-rotation procedures and independent penetration/security review.

EVO must not be described as “unhackable”, “hacker-proof” or “100% secure”.

## Repository map

- `index.html` — hardened root launcher into the current application.
- `v1/` — current static browser application.
- `supabase/functions/` — Edge Functions and shared browser-origin policy.
- `supabase/migrations/` — PostgreSQL/RLS/atomic authority migrations.
- `tests/` — JavaScript regression checks and SQL/concurrency tests.
- `security/` — threat model and production-alignment audit material.
- `standards/` — trust/authority and interoperability building blocks.
- `schemas/` — portable schemas.
- `docs/` — architecture, verticals, ISMS preparation and release/security documentation.
- `DEVELOPMENT.md` — reproducible local-development workflow.
- `docs/RELEASE_READINESS_V400.md` — current RC audit, blockers and promotion sequence.

## Local development

The frontend has no required JavaScript build step. Node is used to standardize regression commands.

```bash
npm test
npm run test:security
npm run test:document
npm run test:service
npm run test:navigation
npm run test:release
```

For complete setup, Supabase local development, migrations and security rules, use `DEVELOPMENT.md`.

## Release discipline

1. Work on a branch, never directly on `main`.
2. Keep code state and production-deployment state separate.
3. Add regression coverage for every bug/security change.
4. Never commit privileged secrets.
5. Preserve signed/history records; use auditable lifecycle actions instead of silent deletion.
6. Keep economic and ownership transitions atomic and idempotent.
7. Do not weaken CORS/CSP/RLS to make local development easier.
8. Promote an RC only after the gates in `docs/SECURITY.md` and `docs/RELEASE_READINESS_V400.md` are satisfied.

## Development roadmap

Immediate sequence for the RC:

1. production deployment inventory;
2. real browser-to-production atomic Seal E2E validation;
3. remaining privileged endpoint CORS rollout with compatibility tests;
4. browser network inventory and CSP narrowing;
5. production-edge headers and protected `main`;
6. rollback/incident/key-rotation drill;
7. independent security review;
8. production release decision.

After the security/release baseline is complete, product expansion can continue around Document Provenance/EVO Origin, stronger issuer authority, standards interoperability and secure physical binding where there is a validated market need.

## Important

EVO is evidence infrastructure. Its assurance level comes from the quality and independence of the evidence attached to a record—not from the existence of a QR code alone.
