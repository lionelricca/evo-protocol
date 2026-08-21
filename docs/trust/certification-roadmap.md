# EVO Trust Standards & Certification Roadmap · V3.2

## Objective
Build EVO so that technical interoperability and security maturity can increase over time without claiming certifications or legal status before they are actually obtained.

## Track A · W3C Verifiable Credentials

Target baseline: **W3C Verifiable Credentials Data Model v2.0**.

EVO should be able to export a Proof or selected Passport evidence as a machine-verifiable credential with mappings for:
- issuer
- credentialSubject
- validFrom / validUntil where applicable
- credentialStatus
- evidence
- credentialSchema
- cryptographic securing mechanism

Initial deliverable:
1. define an EVO credential schema;
2. generate standards-oriented JSON from an existing EVO Proof;
3. keep current EVO verification working independently;
4. later implement an interoperable signing mechanism compatible with the W3C VC ecosystem.

Reference: https://www.w3.org/TR/vc-data-model-2.0/

## Track B · ISO/IEC 27001

Target: prepare EVO as an organization and service for a future ISO/IEC 27001:2022 certification project.

This is an organizational information-security management certification, not a certification that individual EVO documents are true.

Readiness work should include:
- information security scope
- asset inventory
- risk assessment and treatment
- access-control policy
- secrets/key management policy
- supplier/cloud risk
- backup and continuity
- incident response
- logging and monitoring
- secure development lifecycle
- vulnerability handling
- change management
- privacy/data retention rules
- evidence and audit trail

Do not display an ISO certification badge until an accredited certification process has actually been completed.

Reference: https://www.iso.org/standard/27001

## Track C · Chile electronic-signature ecosystem

Chile has a formal accreditation route for providers of electronic-signature certification services under the national electronic-signature framework.

Near-term strategy: **integration, not accreditation**.

EVO should first integrate a legally recognized/accredited provider where a customer needs advanced electronic signature or equivalent regulated trust services. EVO remains the product UX, proof history, QR and verification layer.

Becoming an accredited provider itself is a later business decision requiring dedicated legal, operational and security analysis.

Official starting points:
- Chile Ministry of Economy digital procedures: accreditation of certification service providers
- Law 19.799 on electronic documents and electronic signatures

## Track D · eIDAS / European qualified trust services

Near-term strategy: integrate a qualified trust service provider when European customers require qualified electronic signatures, seals, timestamps or related services.

Do not call EVO a QTSP or claim qualified status unless the formal conformity-assessment and supervisory process has actually been completed.

A particularly relevant future integration for B2B Document Proof is an **electronic seal for a legal entity** plus trusted timestamping.

Official discovery source: https://eidas.ec.europa.eu/

## Product architecture implication

EVO must separate evidence layers:

1. **EVO cryptographic proof** — hash, wallet signature, history, public verification.
2. **Verified organization evidence** — domain/organization evidence controlled by EVO policies.
3. **External regulated trust evidence** — advanced/qualified signature, electronic seal or timestamp from an external accredited/qualified provider.

The UI must never collapse these into a generic green “verified” label without explaining which layer was verified.

## Order of execution

### Phase 1
- W3C VC mapping and export prototype
- security policies and architecture inventory
- formal terminology for evidence levels

### Phase 2
- ISO/IEC 27001 gap assessment
- select candidate certification body/consultant only when scope and company structure are ready
- evaluate Chile trust-service integration APIs

### Phase 3
- external legal signature/seal integration
- W3C interoperable credentials in production
- ISO/IEC 27001 certification project if commercially justified

### Phase 4
- evaluate direct regulated-provider accreditation only if transaction volume and economics justify it

## Non-negotiable claims policy

EVO may say what it technically proves today. It must not say:
- ISO certified before certification;
- legally signed when only a wallet signature exists;
- qualified electronic seal/signature without a qualified provider;
- document contents are true merely because their hash matches;
- physical authenticity is proven solely by a digital record.
