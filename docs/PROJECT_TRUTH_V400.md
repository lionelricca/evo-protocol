# EVO Protocol V4.0 RC · Project Truth

This document is the release-candidate source of truth when older experiments, branches or conversations conflict.

## 1. Brand architecture

**EVO Protocol** is the umbrella.

Products / capabilities:

- **EVO Origin** — document integrity and provenance.
- **EVO Passport** — asset identity, ownership and lifecycle.
- **EVO Service Proof** — technical service evidence and provider countersignature.
- **EVO Issuer Trust** — wallet/domain/organization evidence.
- **EVO Guardian / Reality Continuity** — explainable risk and signed continuity.

“EVO Passport” is not the name of the entire protocol.

## 2. Primary commercial entry point

The first commercial wedge is **industrial and B2B technical-document provenance**.

Priority examples: inspection, maintenance, commissioning, calibration, test, condition, warranty, engineering, compliance, OEM/supplier, MTC/MTR, EN 10204 and CoA evidence.

The verifier stays free. Revenue should come primarily from issuance volume, issuer/business capabilities, APIs and later validated trust-service add-ons.

## 3. Exact meaning of an EVO document proof

Base EVO evidence can establish:

- exact-file SHA-256 match;
- EVO registration;
- issuer wallet declaration/signature;
- version/lifecycle relationships;
- separate domain / organization evidence when present.

Base EVO evidence does not establish by itself:

- factual truth of document contents;
- legal originality;
- legal authority of a free-text company name;
- qualified/advanced electronic-signature status;
- government approval or accreditation.

## 4. Issuer authority

Authority states must remain distinguishable:

- `SELF_DECLARED` — free-text identity only;
- `WALLET_PROVEN` — wallet control evidence;
- `DOMAIN_VERIFIED` — DNS/domain control evidence;
- `ORGANIZATION_VERIFIED` — active organization verification with legal name.

Domain verification is not organization/legal-name verification. A wallet signature is not an organization verification.

## 5. Public telemetry

EVO Pulse and the public SOFTWARE Challenge are observational. They can support anomaly/freshness analysis but **must never add positive authoritative trust by themselves**.

High-authority decisions come from signed history, independent countersignatures, verified issuer evidence and external regulated/physical evidence.

## 6. Payments and token

Current automated commercial plans:

- Free Proof: 1 per wallet;
- Individual: US$9.90;
- Pack 10: US$49.

Current settlement validation is based on official Circle USDC on supported EVM networks. Compatible source assets may be routed/swapped by the checkout/wallet experience, but EVO must not promise settlement in BTC, ETH, USDT or every token unless that path is actually implemented and verified.

The historical EVO token is a legacy/experimental line. It is **not required for current purchases** and must not be presented as the current commercial payment architecture.

The former US$39/month company-plan reference is not an active automated plan in V4.0 RC.

## 7. Standards and certification

Integration/readiness is not certification.

Current stable interoperability target: **W3C Verifiable Credentials Data Model 2.0**. V4.0 RC provides an explicitly unsecured data-model export. A W3C-compatible securing mechanism is still required before product UI may describe the export as cryptographically secured.

Future targets such as RFC 3161, PAdES, C2PA, eIDAS qualified trust services, Chile Law 19.799 providers and ISO/IEC 27001 must be described as integration/readiness/certification targets until actually completed.

## 8. Security language

Allowed language:

- security-hardened;
- defense in depth;
- wallet-signed authorization;
- server-verified signatures;
- RLS-protected data layer;
- atomic registration/state transitions;
- independently testable evidence.

Disallowed without independent basis:

- unhackable;
- 100% secure;
- impossible to attack;
- certified secure;
- penetration-tested, unless an independent test has actually occurred.

## 9. Release state

V4.0 is currently a **Release Candidate branch**. It is not final production until:

- CI is green on the final candidate head;
- a real UI/end-to-end smoke test succeeds;
- remaining branch-only backend changes are reviewed/deployed with explicit approval;
- `main` has protection/required checks;
- historical test-data exception `V1-TEST-001` receives an auditable lifecycle decision;
- the final merge is explicitly authorized.

## 10. Correction of unsupported historical statements

Do not use unsupported identities, domains, certifications, token-supply figures or other facts merely because they appeared in an old conversation or prototype. Release facts must be grounded in the repository, verified production configuration or explicit owner decisions.

In particular, no release artifact should invent a creator identity or an EVO domain that is not actually controlled/configured.
