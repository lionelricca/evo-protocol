# EVO Reality State V0

Status: deterministic specification / 0 EVO / 0 POL

## Purpose

`RealityState V0` is the canonical machine-readable snapshot behind the EVO Reality Graph.

Its goals are:

- give every Seal a deterministic current trust-state fingerprint;
- make independent implementations produce the same hash for the same state;
- allow successive snapshots to be chained;
- prepare optional future blockchain anchoring without requiring blockchain writes for every event.

## Canonical fields

A V0 snapshot contains these fields only:

```json
{
  "version": "EVO-REALITY-STATE-V0",
  "sealId": "EVO-...",
  "issuerTrust": "SELF_DECLARED | WALLET_PROVEN | DOMAIN_VERIFIED | ORGANIZATION_VERIFIED | SUSPENDED",
  "currentOwner": "0x... | NONE",
  "passportHead": "<digest | NONE>",
  "pulseHead": "<digest | NONE>",
  "challengeState": "NONE | PENDING | FRESH_ACCEPTED | EXPIRED | REPLAY_REJECTED",
  "physicalProofState": "NONE | NFC_VERIFIED | NFC_TAMPER_OK | NFC_TAMPER_OPEN | NFC_REVOKED",
  "riskState": "LOW | MEDIUM | HIGH | UNKNOWN",
  "previousRealityRoot": "<64 lowercase hex chars | GENESIS>",
  "updatedAt": "<UTC ISO-8601 timestamp>"
}
```

No private key, NFC secret, raw identity document, IP address, precise location or browser fingerprint belongs in this public canonical state.

## Normalization

Before hashing:

1. every required field MUST exist;
2. keys MUST be sorted lexicographically;
3. JSON MUST use UTF-8;
4. JSON MUST contain no insignificant whitespace;
5. enum-like values MUST use the exact uppercase values defined above;
6. hexadecimal wallet addresses SHOULD be normalized consistently by the implementation before state creation;
7. timestamps MUST be UTC ISO-8601 strings;
8. absent optional evidence is represented by the explicit sentinel defined for that field, not by omitted keys.

Arrays are not part of RealityState V0. Event histories remain in their own registries; the state contains only their current authenticated heads.

## Reality Root

```text
canonical = canonical_json(RealityStateV0)
realityRoot = SHA-256(UTF8(canonical))
```

The public representation is lowercase hexadecimal without `0x`.

## Snapshot chain

The first state uses:

```text
previousRealityRoot = GENESIS
```

Every later state includes the accepted root of the immediately previous snapshot before calculating its own root.

Conceptually:

```text
GENESIS
   ↓
Reality Root #1
   ↓
Reality Root #2
   ↓
Reality Root #3
   ↓
...
```

This means changing an old accepted state changes its root and breaks every later link unless the entire chain is recomputed. A trusted registry or future on-chain anchor can therefore detect rewritten history.

## What a Reality Root proves

A valid root proves that a specific normalized state maps to a specific SHA-256 digest.

It does **not** prove by itself that:

- a physical object is authentic;
- issuer evidence is truthful;
- an NFC tag is genuine;
- a signed event describes something that really happened.

Those claims depend on the evidence sources and verification policies feeding the state.

## Update policy

A new snapshot SHOULD be created when a trust-relevant state changes, for example:

- Seal activation/revocation;
- issuer trust transition;
- accepted Passport event;
- accepted ownership transfer;
- Pulse head change;
- Challenge state transition that policy chooses to retain;
- accepted/rejected physical proof state relevant to the public trust model;
- Guardian risk-state transition if risk is intentionally included in the root.

V0 includes `riskState`, but future versions may separate derived AI analysis from cryptographic evidence state. Versioning prevents silent semantic changes.

## Concurrency rule

A state update SHOULD use compare-and-swap semantics:

```text
expected previousRealityRoot == current accepted realityRoot
```

If not, the write is rejected and recomputed from the newest state.

This prevents two concurrent lifecycle events from silently creating divergent accepted heads.

## Future anchoring

EVO does not need to write every Passport or Pulse event directly to a blockchain.

A future low-cost model may periodically anchor one accepted Reality Root:

```text
Seal ID → latest Reality Root
```

The detailed graph can remain off-chain while its accepted state is externally timestamped. This is only considered after deterministic tests and security review.

## Security rule

The root calculation MUST be deterministic and boring. No AI model participates in canonicalization or hashing.

AI Guardian may analyze the evidence graph, but cryptographic state construction must remain explicit, reproducible and testable.
