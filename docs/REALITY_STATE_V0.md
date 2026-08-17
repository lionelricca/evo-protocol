# EVO Reality Evidence + Proof of Continuity V0

Status: deterministic specification / 0 EVO / 0 POL

## Purpose

EVO separates **objective evidence state** from **signed continuity** and from **AI analysis**.

This separation is intentional:

- **Evidence Root** fingerprints the current verifiable registry state.
- **Continuity Root** links one accepted evidence checkpoint to the previous accepted checkpoint and is signed by the current owner.
- **EVO AI Guardian** analyzes the graph but does not participate in cryptographic truth construction.

This prevents an AI model update, risk-policy change or UI change from silently changing the cryptographic identity of an asset.

## Layer 1 — Reality Evidence State

The canonical V0 evidence state contains only explicit registry facts:

```json
{
  "version": "EVO-REALITY-EVIDENCE-V0",
  "sealId": "EVO-...",
  "sealDigest": "<64 lowercase hex chars>",
  "sealStatus": "ACTIVE | REVOKED | SUPERSEDED",
  "issuerWallet": "0x...",
  "issuerTrust": "SELF_DECLARED | WALLET_PROVEN | DOMAIN_VERIFIED | ORGANIZATION_VERIFIED | SUSPENDED",
  "issuerProfileHash": "<64 lowercase hex chars | NONE>",
  "currentOwner": "0x...",
  "passportHead": "<64 lowercase hex chars | NONE>",
  "pulseHead": "<64 lowercase hex chars | NONE>",
  "challengeHead": "<accepted Challenge ID | NONE>",
  "physicalProofHead": "<future secure physical proof ID | NONE>"
}
```

### Important exclusions

The Evidence State does **not** contain:

- Guardian risk score;
- Guardian verdict;
- confidence percentages;
- temporary pending Challenges;
- IP address;
- precise location;
- browser fingerprint;
- raw identity documents;
- NFC secret keys;
- private keys.

Derived analysis is allowed to change without invalidating historical cryptographic evidence.

## Evidence Root

```text
canonicalEvidence = canonical_json(RealityEvidenceStateV0)
evidenceRoot = SHA-256(UTF8(canonicalEvidence))
```

The public representation is lowercase hexadecimal without `0x`.

The Evidence Root changes only when a cryptographically relevant evidence head or trust state changes.

## Layer 2 — Proof of Continuity

An Evidence Root becomes a continuity checkpoint only when the current owner signs it against the previously accepted continuity checkpoint.

Canonical checkpoint payload:

```json
{
  "version": "EVO-CONTINUITY-V0",
  "sealId": "EVO-...",
  "previousContinuityRoot": "<64 lowercase hex chars | GENESIS>",
  "evidenceRoot": "<64 lowercase hex chars>",
  "signerWallet": "0x...",
  "signedAt": "<UTC ISO-8601 timestamp>"
}
```

```text
canonicalCheckpoint = canonical_json(ContinuityPayloadV0)
continuityRoot = SHA-256(UTF8(canonicalCheckpoint))
```

The wallet signs a human-readable message containing the same fields.

## Chain

```text
GENESIS
   ↓
Continuity Root #1
   ↓
Continuity Root #2
   ↓
Continuity Root #3
   ↓
...
```

Every accepted checkpoint references exactly one previous accepted checkpoint.

The database SHOULD enforce that one active checkpoint cannot have two different active children. This prevents silent forks.

## Why two roots are better than one

A single root that mixes state, history, AI and chain metadata has undesirable properties:

- AI-policy changes alter the hash;
- repeated checkpoints can create meaningless new states;
- it becomes unclear whether a hash identifies evidence or chain position.

EVO therefore uses:

```text
Evidence Root = WHAT IS TRUE IN THE REGISTRY NOW
Continuity Root = WHO ACCEPTED THAT STATE AFTER WHICH PRIOR STATE
Guardian = WHAT THE EVIDENCE MAY MEAN
```

## Current-owner rule

A continuity checkpoint MUST be signed by the current owner derived from the accepted Passport ownership history.

For a never-transferred Seal, the issuer wallet is the initial owner.

A stale signer MUST be rejected.

## Stale-state rule

When a client prepares a checkpoint, the server returns:

- current Evidence Root;
- latest accepted Continuity Root;
- current owner;
- signature message.

At commit time, the server recomputes all three.

If evidence or ownership changed between preparation and signature submission, the checkpoint is rejected as stale and must be prepared again.

## Replay rule

A previously accepted continuity signature cannot create another checkpoint because:

- the previous root is already consumed as a chain parent;
- the Evidence Root is already checkpointed for that Seal;
- the signed timestamp has a short acceptance window.

## What continuity proves

A valid continuity chain proves that:

- each accepted checkpoint referred to a specific deterministic evidence state;
- each checkpoint extended the previously accepted checkpoint;
- the wallet considered current owner at that time signed the checkpoint payload;
- rewriting an old accepted checkpoint breaks all later continuity links unless the entire accepted chain is replaced.

It does **not** prove by itself that a physical product is genuine.

That higher assurance requires secure physical binding such as cryptographic NFC and appropriate issuer policy.

## Future physical proof

When secure NFC is introduced, `physicalProofHead` will point to the latest accepted server-verified physical proof record.

The NFC secret never enters the Evidence State. Only a public proof identifier or digest does.

## Future blockchain anchoring

EVO does not need to write every Passport, Pulse or Challenge directly on-chain.

A future low-cost anchoring strategy can periodically publish the latest `continuityRoot` for selected Seals or batches.

This preserves an externally timestamped commitment while keeping detailed operational data off-chain.

## Canonicalization

For both payloads:

1. all required keys MUST exist;
2. keys MUST be sorted lexicographically;
3. JSON MUST use UTF-8;
4. JSON MUST contain no insignificant whitespace;
5. enum values MUST use the exact defined strings;
6. wallet addresses MUST be normalized to lowercase before payload construction;
7. absent evidence MUST use the explicit `NONE` sentinel;
8. unknown enum values MUST be rejected rather than silently normalized.

## Security principle

Cryptographic state construction must remain deterministic, explicit and independently reproducible.

**AI can interpret the evidence. AI cannot define the evidence.**
