# EVO V3.3 Security Hardening

## Objective

EVO is not described as "unhackable". The security objective is defense in depth: signed authorization, fail-closed validation, least privilege, abuse resistance, transparent evidence semantics, reproducible deployments and independent review.

## Findings addressed in V3.3

### 1. Public evidence must not inflate trust

`EVO Pulse` and `SOFTWARE_V0 Challenge` are intentionally public. Because any visitor can activate them, they are useful as activity/freshness telemetry but are not identity, ownership, origin or physical-presence evidence.

V3.3 assigns both classes `trustWeight: 0`.

Guardian may display these signals, but they cannot elevate Reality Level.

### 2. Reality Level requires stronger evidence

Reality Level elevation now depends on one or more of the following:

- wallet-signed lifecycle evidence;
- distinct provider countersignature;
- domain or organization verification where applicable;
- future cryptographic physical proof such as secure NFC;
- future validated external trust evidence.

Public page views, QR scans, public Pulse activity and public software challenges never elevate the assurance level on their own.

### 3. Public endpoints require abuse controls

The version-controlled Pulse and Challenge functions now include:

- bounded request bodies;
- origin allowlists for browser calls;
- localhost exception for development;
- `Cache-Control: no-store`;
- `X-Content-Type-Options: nosniff`;
- per-Seal rate limits;
- Challenge reuse while a valid pending challenge already exists;
- a hard attempt cap for Challenge responses.

These controls are defense in depth. Production edge/network rate limiting remains recommended.

### 4. Security-critical production code must be version controlled

A security review found that several deployed Supabase Edge Functions existed in production without matching source directories in `main`.

V3.3 begins eliminating this deployment drift by adding the hardened production candidates to `supabase/functions/` and placing regression tests around their security properties.

Target release rule:

> No security-sensitive Edge Function should be deployed from code that is absent from the release commit.

### 5. Database boundary verified

During the V3.3 review:

- all 22 tables in the exposed `public` schema had RLS enabled;
- sensitive tables used deny-direct-access policies for browser roles;
- privileged credit/payment/transfer RPCs were executable by `service_role`, not browser roles;
- Supabase Security Advisor returned zero lints at the time of review.

These observations are a point-in-time audit, not a permanent security guarantee.

## Remaining release gates

Before calling EVO production-hardened, complete all of these:

1. Protect GitHub `main` with required PR review and required successful CI checks.
2. Add a strict web Content Security Policy and related browser security headers. GitHub Pages may require a CSP meta policy or migration to hosting that supports response headers.
3. Remove the remaining unversioned Supabase production functions by importing or replacing them from reviewed source.
4. Apply the V3.3 hardened functions to production only after tests and review.
5. Add adversarial tests for replay, oversized input, malformed signatures, cross-wallet writes, concurrent transfer acceptance and payment replay.
6. Add dependency/supply-chain scanning and secret scanning.
7. Perform an independent penetration test before high-value or regulated deployments.
8. Establish incident response, key rotation and rollback procedures.

## Claims policy

Allowed:

- "security hardened"
- "wallet-signed authorization"
- "server-verified signatures"
- "RLS-protected data layer"
- "public signals do not elevate trust"

Not allowed without independent evidence:

- "unhackable"
- "100% secure"
- "impossible to attack"
- "certified secure"
- "penetration-tested" unless an independent test actually occurred

## Long-term innovation: EVO Assurance Graph

EVO should evolve from a single trust score to an evidence graph with independently weighted evidence classes:

- `PUBLIC_OBSERVATION` — weight 0
- `PUBLIC_SOFTWARE_FRESHNESS` — weight 0
- `WALLET_SIGNATURE` — cryptographic actor control
- `PROVIDER_COUNTERSIGNATURE` — independent second actor
- `DOMAIN_CONTROL` — domain authority
- `ORGANIZATION_VERIFICATION` — reviewed organizational identity
- `EXTERNAL_VALIDATED_EVIDENCE` — validated third-party evidence
- `REGULATED_TRUST_SERVICE` — regulated/qualified trust where applicable
- `PHYSICAL_CRYPTO_PROOF` — secure-element/NFC evidence

This prevents a large quantity of weak signals from ever outweighing one missing high-assurance proof.
