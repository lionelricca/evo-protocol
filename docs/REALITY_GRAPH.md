# EVO Reality Graph

Status: V0.1 architecture / no token movement / no claim of physical authenticity by itself

## Idea

An EVO Seal should not be only a static identifier.

Every seal becomes the root of a continuously evolving **Reality Graph**: a linked set of independent proofs describing who created the identity, what happened to it, who owns it, how it has been observed, whether a fresh challenge was completed and, when supported, whether a secure physical NFC proof was verified.

The objective is simple:

> Copying an EVO QR or public URL must not be enough to copy the complete trust state of the asset.

A cloned label may reproduce public data. It cannot automatically reproduce the private signatures, ownership continuity, one-time challenges, chained observations, issuer evidence or secure NFC cryptographic state that form the Reality Graph.

## Graph inputs

A Reality Graph may include:

1. **Seal** — immutable signed digital identity and content digest.
2. **Issuer Trust** — evidence about the entity that created the Seal.
3. **Passport** — signed lifecycle and ownership events.
4. **Transfer** — two-signature ownership transitions.
5. **Pulse** — chained public observations.
6. **Challenge** — expiring one-time freshness proofs and replay audit.
7. **NFC Proof** — future secure hardware-backed cryptographic observations.
8. **Guardian** — explainable analysis of agreement, continuity and anomalies across the graph.

No single input is sufficient to prove physical authenticity.

## Reality State

For each Seal, EVO can expose a normalized current state:

```text
sealId
issuerTrust
currentOwner
passportHead
pulseHead
challengeState
physicalProofState
riskState
updatedAt
```

A canonical representation of this state can later be committed as a cryptographic digest:

```text
Reality Root = SHA-256(canonical Reality State)
```

The Reality Root is not intended to hide the public data. It gives EVO a deterministic fingerprint of the current trust state so that changes can be detected, compared and optionally anchored on-chain later.

## Temporal uniqueness

The key defensive property is **temporal uniqueness**.

A copied static label starts from the same public Seal ID, but the real asset continues producing new legitimate state transitions. A counterfeit copy can diverge from that history.

Examples:

- a transfer is signed by the current owner and accepted by the next owner;
- an EVO Pulse extends the previous Pulse chain;
- a Challenge is valid only once and expires;
- a secure NFC tag produces changing authenticated data;
- Guardian can compare current behavior against the accumulated history.

The more independent evidence sources are present, the harder it becomes to reproduce the complete state consistently.

## EVO Reality Levels

Public UI should show evidence levels instead of a binary authentic/fake claim.

### ERL 0 — REGISTERED

- valid EVO Seal exists.

### ERL 1 — SIGNED IDENTITY

- Seal signature is valid;
- issuer wallet is known.

### ERL 2 — CONTINUOUS HISTORY

- Passport and/or Pulse history is present;
- chain integrity checks pass;
- no critical continuity anomaly is detected.

### ERL 3 — TRUSTED DIGITAL IDENTITY

- stronger issuer evidence is present;
- ownership and lifecycle history are internally consistent;
- freshness / anti-replay evidence may be present.

### ERL 4 — PHYSICAL CRYPTO PROOF

- secure NFC cryptographic proof has been validated server-side;
- tag-to-Seal binding is valid;
- replay/counter policy passes.

### ERL 5 — HIGH-ASSURANCE PHYSICAL CONTINUITY

Future level reserved for assets that combine repeated physical proofs, tamper evidence, verified issuer policy and a consistent lifecycle history.

ERL 4 or ERL 5 still describe evidence strength. EVO should not display `AUTHENTIC PRODUCT` merely because a technical level was reached unless the issuer and product policy support that legal/operational claim.

## Guardian role

EVO AI Guardian should analyze relationships between evidence, not invent truth.

Guardian can detect signals such as:

- one Seal associated with conflicting active physical identities;
- repeated or impossible physical counters;
- ownership changes inconsistent with signed transfer history;
- broken Pulse chains;
- high-frequency observations inconsistent with product policy;
- duplicated asset hashes or serials;
- issuer evidence changes;
- valid digital history but missing physical proof for a product that requires it.

Guardian output remains explainable:

```text
Reality Level
Risk Score
Evidence Confidence
Positive Evidence
Conflicts / Anomalies
Limitations
```

## Why this is stronger than a normal digital certificate

A normal certificate is usually static: verify the document or identifier and return a result.

EVO's target model is dynamic:

```text
IDENTITY
   ↓
HISTORY
   ↓
OWNERSHIP
   ↓
OBSERVATIONS
   ↓
FRESHNESS
   ↓
PHYSICAL CRYPTO PROOF
   ↓
AI CONSISTENCY ANALYSIS
```

The value is not one secret algorithm. The defensibility comes from the accumulated network of signed events, physical bindings, issuer reputation, verification history and integration tooling.

## Privacy rule

The Reality Graph must not become a surveillance graph.

Public EVO Pulse V0 intentionally avoids IP address, precise location and browser fingerprinting. Future signals should follow data minimization by default. Sensitive evidence may be stored as hashes, attestations or access-controlled records instead of public raw data.

## Token policy

Reality Graph V0 moves **0 EVO and 0 POL**.

Future EVO utility may be attached to trust-creating operations such as issuer verification, premium enrollment, physical tag provisioning or selected registry anchoring. Public verification should remain free.

## Implementation sequence

1. Define canonical `RealityState V0` JSON schema.
2. Calculate `realityLevel` from explicit evidence only.
3. Add the Reality Level card to Guardian.
4. Add `realityRoot` generation and deterministic test vectors.
5. Store Reality snapshots for auditability.
6. Integrate secure NFC proof as a new graph edge.
7. Let Guardian compare successive snapshots for contradictions.
8. Consider optional blockchain anchoring only after tests and security review.

## Security principle

EVO must be designed so that a copied public identifier is useful for discovery but insufficient for high-assurance proof.

The product is not the QR.

**The product is the evolving proof graph behind the QR.**
