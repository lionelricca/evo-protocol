# EVO Protocol

**Portable trust and provenance for documents, assets and Digital Product Passports.**

## Current stage: V4.6.0 RC1

V4.6.0 RC1 is the current **software/readiness release candidate**. It is not an ISO certificate, EU provider certification, legal-originality statement, qualified signature or physical-product authenticity claim.

V4.0 RC1 was promoted to `main` on 2026-08-24. V4.1 consolidated Origin-first. V4.2 added EU DPP Registry integration readiness. V4.3 added the fail-closed Registry adapter. V4.4 implemented NTAG 424 DNA SDM/SUN cryptography. V4.5 added atomic tag/UID/Seal/counter replay authority. V4.6 adds the ISO/IEC 27001 ISMS readiness baseline. Historical marker retired: `Current stage: V4.2.1 Development Line`.

## Product family

- **EVO Origin** — exact-file verification, document provenance, revisions and issuer authority.
- **EVO Passport** — asset identity, ownership and lifecycle history.
- **EVO Service Proof** — owner-declared and provider-countersigned service evidence.
- **EVO Issuer Trust** — wallet, domain and organization evidence kept as distinct trust levels.
- **EVO DPP** — Battery/Digital Product Passport readiness and EU DPP Registry integration layer.
- **EVO Secure NFC** — optional cryptographic physical-binding layer using NTAG 424 DNA, server verification and anti-replay authority.
- **EVO Guardian / Reality Continuity** — explainable anomaly/continuity analysis; public telemetry never elevates authoritative trust.

## Commercial focus

The first commercial wedge is **B2B technical and quality documentation / document provenance**: inspection, maintenance, commissioning, calibration, test, equipment-condition, warranty/service and engineering evidence commonly exchanged as PDF.

The regulated growth line is EU Digital Product Passport infrastructure, beginning with Battery Passport readiness as the Commission framework becomes executable end to end.

## What EVO proves

EVO can prove exact-file SHA-256 match, the wallet/issuer that declared a signed action, recorded lifecycle relationships and independently validated evidence only when that authority actually exists.

EVO does **not** infer factual truth, legal originality, qualified-signature status, physical authenticity, regulatory conformity or certification merely from a hash, signature, QR, readiness score or NFC record.

See `docs/PROJECT_TRUTH_V400.md` and `docs/DOCUMENT_PROVENANCE_V321.md`.

## Free Proof and pricing

Public verification is free. The Free Proof is **one benefit per eligible user**, protected by server-side anti-abuse rules.

- Free Proof: one Proof for an eligible user.
- Individual: US$9.90 for one additional Proof.
- Pack 10: US$49 for ten additional Proofs.

There is **no active US$39/month company subscription**. The historical EVO token experiment is **not required** for current EVO Protocol purchases.

## Security baseline

The promoted baseline includes server-side signature checks, atomic registration/state transitions, duplicate-active-identity protection, anti-abuse controls, RLS/explicit-deny rules, authoritative database RPCs, rate/replay controls, restricted CORS, CSP/browser hardening, deterministic crypto tests, pinned GitHub Actions and PostgreSQL atomicity/concurrency suites.

These controls support **security-hardened / defense in depth** language, not “unhackable”, “100% secure” or “certified secure”.

## EU DPP Registry

The V4.3 server adapter is fail closed and designed for deterministic/idempotent registration preparation. The Commission Registry/test environment is operating, but the Battery semantic/catalogue work remains an external dependency for a successful official Battery Passport registration. EVO never fabricates Registry success.

See `docs/DPP_REGISTRY_INTEGRATION_V420.md` and `docs/DPP_COMPLIANCE_MATRIX.md`.

## Secure NFC

V4.4/V4.5 implement AES-128/AES-CMAC NTAG 424 DNA SDM/SUN verification, AN12196 Rev. 2.0 reference vectors, UID/read-counter extraction, server-only keys, tag ↔ UID ↔ EVO Seal binding and an atomic strictly monotonic replay counter.

A per-tag physical-pilot approval gate remains mandatory. The public contract keeps `physicalAuthenticity=false` and a pre-pilot read remains `CRYPTO_AND_REPLAY_VALIDATED_PENDING_PHYSICAL_PILOT`, not final physical verification.

See `docs/NFC_ARCHITECTURE.md`, `docs/NFC_PILOT_V421.md`, `standards/evo-nfc-proof-v421.mjs` and `schemas/evo-nfc-proof-v1.schema.json`.

## ISO/IEC 27001 readiness

V4.6 establishes a working ISMS baseline against **ISO/IEC 27001:2022 + Amendment 1:2024**, including climate-change context consideration. It includes scope/context, security policy, asset inventory, risk register, a working Statement of Applicability considering all 93 Annex A control IDs, operating controls, incident/continuity/restore procedures and internal-audit/management-review planning.

This is **readiness work, not ISO certification**. Certification requires management approval and operating evidence, internal audit, management review and an independent accredited certification process.

See `docs/isms/README.md` and `docs/GO_TO_MARKET_CERTIFICATION.md`.

## Standards direction

- W3C Verifiable Credentials Data Model 2.0 — current export remains explicitly unsecured.
- RFC 3161 / PAdES / regulated e-signature evidence — integration targets.
- C2PA — provenance interoperability target.
- eIDAS / qualified trust services — integrate qualified providers where required; EVO is not a QTSP.
- Chile Law 19.799 ecosystem — accredited-provider integration target when required.
- ISO/IEC 27001 — organizational certification-readiness track; no certificate is claimed.

## Repository map

- `v1/` — browser application.
- `standards/` and `schemas/` — evidence semantics.
- `supabase/` — migrations and Edge Functions.
- `tests/` — security, provenance, DPP, NFC, navigation and ISMS regression tests.
- `docs/isms/` — ISMS readiness records.
- `docs/PRODUCTION_CLOSEOUT_20260824.md` — production closeout evidence.
- `docs/RELEASE_CHECKLIST_V400.md` — historical V4 checklist and remaining assurance gates.
- `docs/PROJECT_TRUTH_V400.md` — authoritative product-claim boundary.

## Development and release status

`main` is the promoted code baseline. New changes use branches and applied production migrations are immutable.

V4.6.0 RC1 is a software/readiness release candidate. Stronger assurance remains gated by operational/external evidence: protected `main`, backup/restore and incident exercises, clean-browser evidence, independent penetration/security review, the real NFC hardware pilot, Commission Battery Registry availability and ISO certification if pursued.

## Product rule

**The QR is discovery. The evidence graph is the product.**

> EVO can prove that the file being checked is the exact registered version and show who declared it, its version history and the trust evidence attached to that record — without pretending that a hash alone proves legal originality or factual truth.
