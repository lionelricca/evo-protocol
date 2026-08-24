# EVO V4.0 RC · W3C VC 2.0 interoperability

## Decision

EVO targets **W3C Verifiable Credentials Data Model 2.0** as the stable interoperability baseline.

The current V4.0 RC implementation exports an **unsecured data-model representation**. It is deliberately marked `UNSECURED_EXPORT` and must not be presented to customers as a cryptographically secured W3C Verifiable Credential.

## Why this correction matters

An earlier prototype used placeholder `evo.example` URLs and emitted a VC-shaped JSON object without an interoperable W3C securing mechanism. That was useful for mapping fields, but calling it a secured or independently verifiable credential would overstate what EVO had implemented.

V4.0 RC separates the concepts:

1. **Data-model interoperability** — implemented as an export representation.
2. **JSON-LD vocabulary/context mapping** — implemented for EVO-specific terms.
3. **Credential structure schema** — published separately from the export-envelope schema.
4. **Cryptographic securing mechanism** — not yet implemented as a W3C Data Integrity / JOSE / COSE production path.

## Current export

`standards/evo-vc-dm-export-v400.mjs` maps EVO evidence to:

- W3C VC v2 context: `https://www.w3.org/ns/credentials/v2`;
- EVO JSON-LD context: `https://lionelricca.github.io/evo-protocol/contexts/evo-v1.jsonld`;
- URI-form issuer and credential identifiers;
- `validFrom`;
- credential subject;
- EVO proof ID;
- SHA-256 digest;
- verification URL;
- evidence level;
- a credential-level JSON Schema URL.

The EVO context defines every EVO-specific compact JSON-LD term used by the export, including `EvoProofCredential`, `evoId`, `proofType`, `digest`, `verificationUrl` and `evidenceLevel`.

## Schema separation

Two different schemas serve two different purposes:

- `schemas/evo-proof-credential-v400.schema.json` describes the VC-shaped credential object referenced by `credentialSchema`.
- `schemas/evo-vc-dm-export-v400.schema.json` describes EVO's outer `UNSECURED_EXPORT` envelope.

This separation is intentional. A `credentialSchema` must not point to a wrapper schema that does not describe the credential being validated.

The `credentialSchema.type` value `JsonSchema` follows the mechanism described by the W3C VC Data Model and its VC JSON Schema work. The VC JSON Schema specification is tracked as a separate W3C standards/draft line; EVO must not imply that using this field makes the credential W3C-certified.

## Security boundary

The export envelope includes:

- `secured: false`;
- `status: UNSECURED_EXPORT`;
- an explicit statement that a securing mechanism is still required.

It does not fabricate:

- a `proof`;
- a signature suite;
- a credential-status method;
- legal-signature status;
- qualified/accredited status.

The builder also rejects non-URI issuer, credential or verification identifiers rather than emitting a structurally misleading export.

## Production gate for a secured VC

Before EVO may label this export as a secured Verifiable Credential in the product UI, the implementation must add and test an interoperable securing mechanism, including key/identifier resolution, verification behavior, replay/status semantics where applicable, and independent interoperability tests.

The EVO-native wallet signature and provenance record remain valid EVO evidence, but they are not silently re-labelled as a W3C Data Integrity proof.

## Claims rule

Allowed now:

- “W3C VC Data Model 2.0 export representation”;
- “machine-readable interoperability export”;
- “unsecured VC-DM export; cryptographic securing mechanism pending”.

Not allowed now:

- “W3C certified”;
- “W3C-approved credential”;
- “cryptographically secured Verifiable Credential”;
- “qualified electronic credential/signature”.
