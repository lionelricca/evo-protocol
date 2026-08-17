# EVO NFC — Physical Proof Architecture

Status: design gate / no production keys / no token movement

## Goal

EVO NFC extends EVO Seal so a copied QR or copied public URL is not enough to reproduce a valid physical proof.

The reference implementation is based on secure NFC tags that can produce authenticated, changing data on each tap. For the first pilot we target NXP NTAG 424 DNA. Where package-opening evidence matters, NTAG 424 DNA TagTamper is the preferred variant.

## Trust statement

EVO must never claim that a QR alone proves a physical product is authentic.

A physical trust result is built from multiple independent layers:

1. EVO Seal — signed digital identity.
2. EVO Passport — signed lifecycle history.
3. EVO Pulse — chained observation history.
4. EVO Challenge — freshness / anti-replay control.
5. EVO NFC — cryptographic tag proof.
6. EVO Guardian — explainable risk analysis over all available evidence.

## Consumer flow

```text
Tap physical product
        ↓
Secure NFC tag opens EVO verification URL
        ↓
Tag supplies dynamic authenticated data
        ↓
EVO NFC verifier checks cryptographic proof server-side
        ↓
Proof accepted / rejected / replay or anomaly recorded
        ↓
Verified physical tap becomes an NFC-backed EVO Pulse
        ↓
EVO Guardian recalculates risk and evidence confidence
        ↓
Public verification page shows the evidence level
```

## Why the NFC proof is different from QR

A QR is public data and can be photographed and reproduced.

The NFC layer must depend on a secret that is not present in the public web page. The browser must not contain tag authentication keys.

For NTAG 424 DNA, the intended web-friendly path is Secure Dynamic Messaging / SUN: the tag can place authenticated dynamic values into an NDEF URL when it is tapped. EVO's server verifies those values with the provisioned tag key.

## Proposed URL shape

The exact field layout will be fixed only after the physical tag pilot and official NXP test vectors are validated.

Conceptual example:

```text
https://<EVO-domain>/nfc/<public-tag-id>?p=<dynamic-encrypted-data>&m=<dynamic-mac>
```

The public URL MUST NOT contain the AES key.

## Enrollment

A tag is not trusted merely because it says it belongs to an EVO Seal.

Enrollment is a controlled issuer action:

1. Create / select an active EVO Seal.
2. Read the genuine NFC tag during provisioning.
3. Assign a random EVO `tag_id` unrelated to the secret key.
4. Provision unique per-tag keys.
5. Configure the dynamic NDEF / SUN parameters.
6. Store only the data required for server verification.
7. Bind `tag_id ↔ seal_id` in the protected EVO registry.
8. Perform a known-good test tap.
9. Mark the tag `ACTIVE` only after server verification succeeds.

Production provisioning must never expose master or per-tag secrets to browser JavaScript.

## Key hierarchy

Pilot:

- unique AES key per physical tag;
- server-side only;
- no keys committed to GitHub;
- no keys stored in the public database/API;
- no master key in frontend code.

Production target:

- key diversification;
- secret manager / KMS or HSM-backed verification;
- rotation and revocation procedures;
- strict provisioning roles;
- audit log for enrollment and key changes.

## NFC-backed Pulse

Current EVO Pulse V0 records public observations and intentionally does not prove physical presence.

After NFC verification, a new source class can be introduced:

- `NFC_VERIFIED`
- `NFC_TAMPER_OK`
- `NFC_TAMPER_OPEN`

Only the server may create these physical-grade Pulse sources after cryptographic verification.

A browser request alone must never be able to label a Pulse as NFC verified.

## Guardian signals

Initial NFC-aware Guardian rules:

### Positive evidence

- valid NFC cryptographic proof;
- recent valid NFC proof;
- continuous NFC-backed Pulse chain;
- TagTamper intact, when available;
- issuer and owner history consistent.

### Risk evidence

- invalid MAC / cryptographic response;
- impossible or stale dynamic counter behavior;
- repeated identical authenticated payload where freshness is expected;
- tag bound to more than one active Seal;
- Seal bound to unexpected tag identity;
- TagTamper reports opened state;
- excessive failed physical proofs;
- valid digital Seal but no physical proof where the product policy requires one.

No single heuristic should automatically declare a physical product counterfeit. Guardian reports evidence and risk, not unsupported certainty.

## Evidence levels

Suggested public language:

- `DIGITAL REGISTERED` — Seal exists.
- `DIGITAL SIGNATURE VERIFIED` — issuer/wallet signature is valid.
- `HASH VERIFIED` — supplied file matches the registered hash.
- `LIVE SOFTWARE PROOF` — one-time software challenge completed.
- `NFC CRYPTO VERIFIED` — secure NFC cryptographic proof validated.
- `TAMPER STATUS VERIFIED` — supported tamper state validated.

`AUTHENTIC PRODUCT` must not be displayed solely from these technical checks unless the issuer/product policy legally and operationally supports that statement.

## First physical pilot

Gate 1 — hardware

- obtain a small number of genuine NTAG 424 DNA tags;
- optionally obtain TagTamper samples for package/seal testing;
- use an NFC reader/writer and NXP-supported tooling suitable for secure configuration.

Gate 2 — lab provisioning

- keep factory/default keys out of production;
- configure one test tag with non-production keys;
- validate official NXP SUN/SDM test vectors;
- verify changing authenticated data across repeated taps;
- reject modified MAC values;
- test server-side replay/counter logic.

Gate 3 — EVO integration

- add protected `evo_nfc_tags` registry;
- add server-only enrollment endpoint;
- add public NFC verification endpoint;
- create NFC-backed Pulse only after successful verification;
- feed audit results into Guardian.

Gate 4 — destructive / clone-resistance tests

- copy the public URL to another NFC tag and confirm it does not receive `NFC CRYPTO VERIFIED`;
- replay an old authenticated URL and confirm policy response;
- alter one byte of dynamic data and confirm rejection;
- if using TagTamper, open the seal and confirm state transition.

## Token policy

EVO NFC pilot moves 0 EVO and 0 POL.

Token use is considered only after the physical security gate passes. Verification remains free.

## References

- NXP NTAG 424 DNA / 424 DNA TagTamper product documentation.
- NXP AN12196 — NTAG 424 DNA and NTAG 424 DNA TagTamper features and hints.

The implementation must be validated against current official NXP documentation before provisioning real products.
