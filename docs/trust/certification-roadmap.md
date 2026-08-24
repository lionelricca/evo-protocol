# EVO Trust Standards & Certification Roadmap · V4.0 RC

## Objective

Build EVO so interoperability and security maturity can increase without claiming legal status, accreditation or certification before it is actually obtained.

## Track A · W3C Verifiable Credentials

Stable target baseline: **W3C Verifiable Credentials Data Model 2.0**.

V4.0 RC includes a machine-readable export mapping but deliberately marks it `UNSECURED_EXPORT`. A production-grade W3C securing mechanism and interoperability verification are still required before EVO may present the export as a cryptographically secured Verifiable Credential.

Next work:

1. keep the current EVO-native proof and verification flow independent;
2. select a W3C-compatible securing path appropriate to the deployment model;
3. define key/identifier resolution and verification rules;
4. add credential status only when a real status method exists;
5. test with independent implementations.

## Track B · ISO/IEC 27001

Target: prepare the EVO operating organization and service for a possible future **ISO/IEC 27001:2022** certification project.

This would be an information-security-management certification. It would not certify the truth of individual EVO documents.

Readiness work includes:

- security scope and asset inventory;
- risk assessment/treatment;
- access control and secrets/key management;
- supplier/cloud risk;
- backup and continuity;
- incident response;
- logging and monitoring;
- secure development lifecycle;
- vulnerability/change management;
- privacy and retention;
- evidence/audit trail.

No ISO badge or certification claim may appear before an accredited certification process is completed.

## Track C · Chile electronic-signature ecosystem

Near-term strategy: **integration before accreditation**.

Where a Chilean customer needs a legally recognized advanced electronic signature or regulated trust service, EVO should integrate an appropriate accredited/provider ecosystem while remaining the provenance, QR, evidence-history and verification layer.

Becoming a certification-service provider itself is a later legal/business decision and must not be implied by normal EVO document issuance.

## Track D · eIDAS / European qualified trust services

Near-term strategy: integrate an actual qualified trust-service provider when European customers require qualified electronic signatures, seals, timestamps or related services.

EVO is not a QTSP and must not claim qualified status unless the formal conformity/supervisory requirements have actually been satisfied.

A particularly relevant future combination for industrial documents is legal-entity electronic seal evidence plus trusted timestamping, attached as a distinct external evidence layer.

## Track E · Document provenance interoperability

Relevant integration targets include:

- RFC 3161 timestamp evidence;
- PAdES validation for signed PDFs;
- C2PA Content Credentials for suitable content/media cases;
- W3C VC 2.0 representations;
- qualified/accredited external trust evidence where applicable.

Each external evidence adapter must expose its own validation state. EVO must never turn “adapter configured” into “evidence validated”.

## Product architecture rule

EVO separates:

1. **EVO cryptographic proof** — file hash, EVO signature, history and public verification;
2. **issuer authority evidence** — wallet, domain and organization levels;
3. **external validated evidence** — validated timestamp/signature/content credential;
4. **regulated/high-assurance evidence** — only when the relevant external authority/service and result have actually been verified.

The UI must name the evidence class rather than collapse everything into a generic “verified” label.

## Execution order

### Commercial pilot

- stabilize EVO Origin exact-file and issuer-authority flow;
- finish security/release gates;
- run real pilot issuance/verification;
- obtain first external customer/use case.

### Interoperability phase

- implement a real secured W3C VC path if customer integration justifies it;
- add selected timestamp/signature adapters;
- publish API/export contracts.

### Assurance phase

- formal ISO/IEC 27001 gap assessment;
- select qualified/accredited trust-service integrations by target market;
- commission independent penetration testing.

### Regulated-provider phase

Evaluate direct accreditation/regulated-provider status only if transaction volume, economics and strategic value justify the operational burden.

## Non-negotiable claims policy

EVO may state what it technically proves today. EVO must not say:

- ISO certified before certification;
- legally signed when only a wallet signature exists;
- qualified electronic seal/signature without a qualified provider and validated evidence;
- document contents are true merely because their hash matches;
- a file is legally original merely because it was registered first;
- physical authenticity is proven solely by a digital record;
- W3C certified/approved merely because EVO uses a W3C data model.
