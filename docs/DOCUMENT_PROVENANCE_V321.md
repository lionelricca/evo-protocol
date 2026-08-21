# EVO Origin · Document Provenance Profile V3.2.1

Status: prototype / not a legal certification claim.

## Product decision

EVO should enter document authenticity through **provenance and integrity**, not through the vague claim that a file is "original".

The product name for this branch is **EVO Origin**.

Core promise:

> Verify that this exact file matches the version an identified issuer registered, inspect its provenance chain, and see which independent trust evidence has been attached.

This is stronger and more precise than a generic blockchain timestamp while remaining compatible with regulated signatures and trust services.

## What EVO Origin proves at the base layer

For every document version EVO records:

- SHA-256 digest of the exact bytes;
- EVO Seal ID;
- issuer wallet and optional issuer domain;
- registration time;
- public verification URL;
- optional parent digest for a version chain;
- explicit evidence level.

The base EVO layer can prove an exact-file match and an issuer declaration. It does **not** by itself prove:

- that the statements inside the document are factually true;
- that the document was created at the moment claimed by the issuer;
- that the issuer has a regulated legal identity;
- that the file is a legally privileged "original";
- that a wallet signature is equivalent to a qualified electronic signature.

## Evidence ladder

### Level 1 — EVO cryptographic proof

Exact file hash + EVO issuer declaration + public verification.

### Level 2 — EVO domain-bound issuer

Level 1 plus an EVO-verified organization/domain binding.

### Level 3 — External validated evidence

Level 2 or Level 1 plus independently validated evidence such as:

- RFC 3161 timestamp token;
- PAdES signature validation;
- C2PA Content Credential where the asset format/use case is suitable;
- W3C Verifiable Credential representation.

### Level 4 — External regulated trust

Evidence validated against an applicable accredited/qualified trust-service framework, for example a qualified trust service in the EU or an accredited electronic-signature provider where local law requires it.

EVO must name the exact trust evidence instead of reducing all levels to a generic green "verified" badge.

## Version provenance

Each new version may reference the SHA-256 digest of its parent.

This creates a simple directed chain:

```text
VERSION A
hash A
   ↓ derived_from
VERSION B
hash B
   ↓ derived_from
VERSION C
hash C
```

A verifier can therefore distinguish:

- the exact registered version;
- a later revision;
- an unrelated file;
- a file whose content changed after registration.

Future work can add signed transformation events and multi-parent derivations.

## Best commercial wedge

Do not start with consumer PDFs or generic e-signature replacement. Those markets are crowded.

Prioritize **B2B technical evidence documents** where authenticity, revisions and issuer reputation matter but the customer often lacks a dedicated provenance layer:

1. inspection reports;
2. maintenance/service certificates;
3. commissioning reports;
4. calibration certificates;
5. test reports;
6. equipment condition reports;
7. warranty/service records;
8. engineering deliverables;
9. compliance evidence packages;
10. OEM technical certificates.

These documents exist in almost every industrial market and naturally connect to EVO Asset Passport and Service Proof.

## Why this wedge is attractive

- global applicability;
- recurring document volume;
- B2B willingness to pay;
- natural API/integration demand;
- high cost of altered or unverifiable reports;
- complements e-signature platforms instead of immediately competing head-on with them;
- can cross-sell into Asset Passport, Service Proof, warranty and resale history;
- allows privacy-preserving verification because the full document does not need to be publicly uploaded.

## Self-selling verification flow

### Issuer

1. selects or drops a document;
2. hash is calculated locally where possible;
3. issuer identity is attached;
4. optional parent version is selected;
5. EVO registers the proof;
6. QR / verification link is returned;
7. optional external signature/timestamp connector is offered.

### Verifier

1. opens QR or verification page;
2. drops the received file;
3. browser calculates the file hash;
4. EVO compares it with the registered digest;
5. result shows exact-match / modified / different version;
6. evidence ladder explains issuer, domain, timestamp, signature and regulated evidence separately.

## Standards direction

- W3C Verifiable Credentials Data Model 2.0: interoperable machine-readable export.
- C2PA Content Credentials 2.3: provenance interoperability for compatible digital-content use cases.
- ETSI PAdES: PDF signature validation and long-term signature profiles where applicable.
- RFC 3161-compatible timestamp evidence: independent time evidence.
- eIDAS/EUDI trusted lists: qualified EU trust evidence when relevant.
- Chile Law 19.799 ecosystem: integration with accredited signature-certification providers when a Chilean legal-signature requirement exists.

These are integration targets. They are not certifications currently held by EVO.

## Revenue model

Recommended initial packaging:

- Free: verify any public EVO Origin record;
- Starter: small monthly issuance allowance;
- Business: organization/domain identity + higher volume + branded QR;
- API: per-issuance and per-validation pricing;
- Trust add-ons: external timestamp/signature validation at pass-through cost plus EVO margin;
- Enterprise: SSO, audit export, retention policies, connectors and SLA.

The verifier should remain free. Revenue should primarily come from issuers that need trustworthy evidence at scale.

## Next implementation steps

1. integrate this profile with the existing Document Proof registration flow;
2. add local drag-and-drop hash verification to the public page;
3. expose version-chain UI;
4. export a W3C VC 2.0 representation;
5. implement external evidence adapters behind clear validation states;
6. add organization policy for who may issue documents under a verified domain;
7. create a pilot template for technical-service and inspection companies.

## Non-negotiable claims policy

EVO may say:

- exact file match;
- registered by this EVO issuer;
- domain binding verified by EVO, when actually verified;
- external timestamp/signature evidence validated, when actually validated;
- qualified/accredited trust evidence, only when the external provider and service have been verified as such.

EVO must not say "legally original", "government certified", "qualified", "accredited" or equivalent unless the applicable external evidence or EVO's own formal status actually supports that claim.
