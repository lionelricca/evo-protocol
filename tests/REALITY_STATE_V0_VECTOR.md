# EVO Evidence + Continuity V0 — deterministic test vectors

These vectors define the exact canonical payloads and SHA-256 outputs for the first EVO Reality Evidence and Proof of Continuity formats.

## Evidence input

```json
{
  "version": "EVO-REALITY-EVIDENCE-V0",
  "sealId": "EVO-EXAMPLE-0001",
  "sealDigest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "sealStatus": "ACTIVE",
  "issuerWallet": "0x1111111111111111111111111111111111111111",
  "issuerTrust": "WALLET_PROVEN",
  "issuerProfileHash": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "currentOwner": "0x1111111111111111111111111111111111111111",
  "passportHead": "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  "pulseHead": "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  "challengeHead": "EVC-AAAAAAAA-BBBBBBBB-CCCCCCCC",
  "physicalProofHead": "NONE"
}
```

## Canonical Evidence JSON

```text
{"challengeHead":"EVC-AAAAAAAA-BBBBBBBB-CCCCCCCC","currentOwner":"0x1111111111111111111111111111111111111111","issuerProfileHash":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","issuerTrust":"WALLET_PROVEN","issuerWallet":"0x1111111111111111111111111111111111111111","passportHead":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc","physicalProofHead":"NONE","pulseHead":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd","sealDigest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","sealId":"EVO-EXAMPLE-0001","sealStatus":"ACTIVE","version":"EVO-REALITY-EVIDENCE-V0"}
```

## Expected Evidence Root

```text
0a46b4a51a27a45c65ed9f8d89f86c056cca1b0707494e2acbabe4920209e383
```

## Continuity input

```json
{
  "version": "EVO-CONTINUITY-V0",
  "sealId": "EVO-EXAMPLE-0001",
  "previousContinuityRoot": "GENESIS",
  "evidenceRoot": "0a46b4a51a27a45c65ed9f8d89f86c056cca1b0707494e2acbabe4920209e383",
  "signerWallet": "0x1111111111111111111111111111111111111111",
  "signedAt": "2026-08-17T00:00:00.000Z"
}
```

## Canonical Continuity JSON

```text
{"evidenceRoot":"0a46b4a51a27a45c65ed9f8d89f86c056cca1b0707494e2acbabe4920209e383","previousContinuityRoot":"GENESIS","sealId":"EVO-EXAMPLE-0001","signedAt":"2026-08-17T00:00:00.000Z","signerWallet":"0x1111111111111111111111111111111111111111","version":"EVO-CONTINUITY-V0"}
```

## Expected Continuity Root

```text
df55e50076b9936019163f8c169b3b6c58c2f077867aee7f273e3fbbe2d16b2c
```

## Required negative checks

A compatible implementation MUST produce a different Evidence Root when any objective evidence field changes, including:

- Seal digest or status;
- current owner;
- Passport head;
- Pulse head;
- accepted Challenge head;
- issuer profile hash or trust state;
- physical proof head.

A compatible implementation MUST produce a different Continuity Root when any checkpoint field changes, including:

- Evidence Root;
- previous Continuity Root;
- signer wallet;
- signed timestamp.

Guardian risk score, verdict and confidence are intentionally absent from both test vectors.
