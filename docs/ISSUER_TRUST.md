# EVO Issuer Trust

Status: V0 active / no token movement / no legal brand verification yet

## Problem

A cryptographically valid EVO Seal proves that a wallet signed a record. It does **not** automatically prove that text such as `Nike`, `Rolex`, a university name, a manufacturer name, or another organization was entered by an authorized representative of that entity.

EVO therefore treats issuer identity as a separate evidence layer.

## Trust ladder

### SELF_DECLARED

No EVO Issuer profile exists for the signing wallet.

Meaning: the issuer label is metadata declared by the seal creator.

It must never be rendered as a verified brand identity.

### WALLET_PROVEN

The issuer wallet has signed an EVO Issuer profile containing its public display name, EVO slug and optional website.

Meaning: cryptographic control of the wallet/profile is proven.

It does **not** prove legal ownership of a brand, employment by a company, trademark rights or control of the declared website.

### DOMAIN_VERIFIED — planned

The issuer proves control of a declared internet domain using an independent challenge, such as a DNS/website challenge.

Meaning: the signing identity is connected to control of that domain at verification time.

It still does not automatically prove every legal claim about the organization.

### ORGANIZATION_VERIFIED — planned

A stronger organizational verification process has been completed under a published EVO policy.

The exact evidence requirements, renewal period, suspension policy and audit procedure must be defined before this state is enabled in production.

### SUSPENDED

The issuer profile must not be treated as trusted while the suspension is active.

Guardian may elevate risk for seals associated with a suspended issuer.

## Security rules

1. Browser code cannot assign verification status.
2. Public database roles have SELECT only.
3. Profile creation/update requires a valid wallet signature.
4. A wallet signature can create `WALLET_PROVEN`, not higher verification levels.
5. Stronger verification levels require independent evidence outside the self-declared profile.
6. Guardian must describe what each level actually proves.
7. EVO must not imply legal brand authorization from wallet control alone.

## Duplicate issuance guard

The V1 Seal registry now rejects an accidental second active seal when the same issuer submits both the same non-empty asset hash and the same non-empty serial/reference.

Legitimate reissue/replacement workflows should later use an explicit parent/reissue relationship rather than silently creating duplicate active identities.

## Long-term direction

Issuer Trust becomes one axis in the EVO Trust Graph:

```text
Issuer identity
      │
      ├── signed wallet profile
      ├── domain evidence
      ├── organization evidence
      ├── products / documents issued
      ├── disputes / suspensions
      └── historical verification behavior
```

Guardian can use these evidence relationships without reducing trust to an unexplained black-box score.
