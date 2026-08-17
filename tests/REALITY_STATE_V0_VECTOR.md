# Reality State V0 — deterministic test vector

This vector fixes one canonical input and its expected SHA-256 output.

Any EVO implementation that claims `EVO-REALITY-STATE-V0` compatibility should reproduce this exact result.

## Input object

```json
{
  "version": "EVO-REALITY-STATE-V0",
  "sealId": "EVO-EXAMPLE-0001",
  "issuerTrust": "WALLET_PROVEN",
  "currentOwner": "0x1111111111111111111111111111111111111111",
  "passportHead": "PASSPORT-HEAD-001",
  "pulseHead": "PULSE-HEAD-001",
  "challengeState": "FRESH_ACCEPTED",
  "physicalProofState": "NONE",
  "riskState": "LOW",
  "previousRealityRoot": "GENESIS",
  "updatedAt": "2026-08-17T00:00:00.000Z"
}
```

## Canonical UTF-8 JSON

```text
{"challengeState":"FRESH_ACCEPTED","currentOwner":"0x1111111111111111111111111111111111111111","issuerTrust":"WALLET_PROVEN","passportHead":"PASSPORT-HEAD-001","physicalProofState":"NONE","previousRealityRoot":"GENESIS","pulseHead":"PULSE-HEAD-001","riskState":"LOW","sealId":"EVO-EXAMPLE-0001","updatedAt":"2026-08-17T00:00:00.000Z","version":"EVO-REALITY-STATE-V0"}
```

## Expected Reality Root

```text
a86f638546f25bfa503cc51669cd83b3efbd6d9786e0611fc996c77821ecdc69
```

## Negative checks

Each of the following MUST produce a different root:

- changing `currentOwner`;
- changing one character of `pulseHead`;
- changing `physicalProofState` from `NONE` to `NFC_VERIFIED`;
- changing `previousRealityRoot`;
- changing `updatedAt`;
- omitting a required field;
- serializing a semantically different value.

A compatible implementation should reject invalid enum values before hashing rather than silently normalizing unknown states.
