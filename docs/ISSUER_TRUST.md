# EVO Issuer Trust

Status: V0 active / no token movement / no legal brand verification yet

## Problem

A cryptographically valid EVO Seal proves that a wallet signed a record. It does **not** automatically prove that text such as `Nike`, `Rolex`, a university name, a manufacturer name, or another organization was entered by an authorized representative of that entity.

EVO therefore treats issuer identity as a separate evidence layer.

## Evidence model

Issuer Trust is **not a mandatory linear ladder**. A client does not need a website or domain to use EVO or to become organization-verified later.

EVO records independent evidence modules and Guardian explains which ones are present.

### SELF_DECLARED

No EVO Issuer profile exists for the signing wallet.

Meaning: the issuer label is metadata declared by the seal creator.

It must never be rendered as a verified brand identity.

### WALLET_PROVEN — base cryptographic proof

The issuer wallet has signed an EVO Issuer profile containing its public display name, EVO slug and optional website.

Meaning: cryptographic control of the wallet/profile is proven.

It does **not** prove legal ownership of a brand, employment by a company, trademark rights or control of a declared website.

### DOMAIN_VERIFIED — optional evidence

If the issuer controls an internet domain, it may prove that control using an independent challenge such as DNS TXT.

Meaning: the signing identity is connected to technical control of that domain at verification time.

A missing domain is **not a negative signal**. Many legitimate businesses, professionals, workshops, producers and individuals do not operate their own domain.

### ORGANIZATION_VERIFIED — independent evidence path

A stronger organizational verification process may be completed without requiring a domain.

Possible evidence can include business registry records, tax/company identifiers, signed corporate authorization, verified institutional documentation or other evidence defined by a published EVO policy.

Sensitive source documents should not be made public by default. EVO should prefer storing verification outcomes, hashes and minimal audit metadata rather than exposing private documents.

The exact evidence requirements, renewal period, suspension policy and audit procedure must be defined before this state is enabled in production.

### Other future evidence modules

Issuer Trust may later support additional independent proofs such as:

- PERSON_VERIFIED
- BUSINESS_REGISTRY_VERIFIED
- PROFESSIONAL_LICENSE_VERIFIED
- PARTNER_ATTESTED
- PHYSICAL_LOCATION_VERIFIED
- NFC / hardware issuer credentials

No single optional evidence type should be required when it is irrelevant to the issuer.

### SUSPENDED

The issuer profile must not be treated as trusted while the suspension is active.

Guardian may elevate risk for seals associated with a suspended issuer.

## Security rules

1. Browser code cannot assign verification status.
2. Public database roles have SELECT only.
3. Profile creation/update requires a valid wallet signature.
4. A wallet signature can create `WALLET_PROVEN`, not stronger independent evidence.
5. Stronger evidence requires validation outside the self-declared profile.
6. Domain verification is optional and absence of a domain must not reduce trust by itself.
7. Organization verification must have a path for clients without websites/domains.
8. Guardian must describe exactly what each evidence item proves.
9. EVO must not imply legal brand authorization from wallet control or domain control alone.

## Duplicate issuance guard

The V1 Seal registry rejects an accidental second active seal when the same issuer submits both the same non-empty asset hash and the same non-empty serial/reference.

Legitimate reissue/replacement workflows should use an explicit lifecycle relationship rather than silently creating duplicate active identities.

## Long-term direction

Issuer Trust becomes one axis in the EVO Trust Graph:

```text
Issuer identity
      │
      ├── wallet proof
      ├── domain proof (optional)
      ├── organization proof (independent)
      ├── registry / license evidence
      ├── products / documents issued
      ├── disputes / suspensions
      └── historical verification behavior
```

Guardian can combine these evidence relationships without reducing trust to an unexplained black-box score and without excluding legitimate clients who lack a particular credential.
