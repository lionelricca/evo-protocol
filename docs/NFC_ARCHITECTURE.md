# EVO NFC — Physical Proof Architecture

Status: **V4.4 cryptographic engine implemented / NXP vectors validated / physical pilot and atomic replay authority still pending**

## Goal

EVO NFC extends EVO Seal so a copied QR or copied public URL is not enough to reproduce a valid physical proof.

The reference implementation targets genuine **NXP NTAG 424 DNA**. Where package-opening evidence matters, NTAG 424 DNA TagTamper is the preferred variant. NXP currently lists NTAG 424 DNA as active and documents AES-128, Secure Unique NFC (SUN) / Secure Dynamic Messaging (SDM), NFC Forum Type 4 operation and the TagTamper loop.

## V4.4 software state

EVO now contains a real SDM cryptographic engine rather than only an architecture proposal:

- shared runtime: `supabase/functions/_shared/evo-aes-cmac.mjs`;
- server verifier: `supabase/functions/evo-nfc-verifier/index.ts`;
- runtime vectors: `tests/nfc-crypto-v440.test.mjs`;
- security/claim regression checks: `tests/nfc-verifier-v440.test.js`.

The implementation is pinned conceptually to **NXP AN12196 Rev. 2.0 — 4 March 2025**, specifically the AES-128 SDM/SUN session-key and SDMMAC examples.

The CI vectors verify:

1. encrypted PICCData decryption;
2. UID + SDM read-counter extraction;
3. `SV2 = 3CC3 0001 0080 || UID || SDMReadCtr` session-key derivation;
4. AES-CMAC according to NIST SP 800-38B;
5. NXP `MACt` truncation;
6. the zero-length SDMMAC example;
7. the non-empty dynamic-input SDMMAC example;
8. rejection of a modified MAC.

Passing those vectors proves the software calculation matches the reviewed NXP examples. It **does not** by itself prove a physical tag, key-provisioning procedure, replay policy or tamper loop has been validated in the field.

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
Tag supplies encrypted PICCData + dynamic MAC
        ↓
EVO NFC verifier checks SDM/SUN proof server-side
        ↓
Atomic counter/replay authority accepts or rejects the fresh read
        ↓
Verified physical tap becomes an NFC-backed EVO Pulse
        ↓
EVO Guardian recalculates risk and evidence confidence
        ↓
Public verification page shows the evidence level
```

## Why the NFC proof is different from QR

A QR is public data and can be photographed and reproduced.

The NFC layer depends on a secret that is not present in the public web page. The browser must never contain an AES key.

For NTAG 424 DNA, the web-friendly path is SDM/SUN: the tag places authenticated dynamic values into an NDEF URL during a tap and EVO verifies them server-side.

## V4.4 verification boundary

The current server verifier intentionally returns only:

`CRYPTO_MATCH_PENDING_REPLAY_AUTHORITY`

when the NXP cryptographic proof and enrolled UID match.

It still returns:

`nfcCryptoVerified: false`

because a physical-grade `NFC CRYPTO VERIFIED` claim requires all of the following:

- cryptographic SDM/SUN proof valid;
- decrypted UID matches the enrolled physical tag;
- read counter accepted atomically and not replayed;
- tag is ACTIVE and bound to exactly one expected EVO Seal;
- the physical provisioning/pilot evidence exists.

This prevents a crypto-only result from being promoted into a stronger physical claim.

## Proposed URL shape

Pilot target:

```text
https://<EVO-domain>/nfc/<public-tag-id>?picc_data=<encrypted-picc-data>&cmac=<dynamic-mac>
```

The public tag ID is only an alias. The URL MUST NOT contain the AES key.

For the first reviewed configuration EVO uses the AN12196-compatible `SDMMACInputOffset == SDMMACOffset` / zero-length MAC-input path. Other SDM layouts must be separately configured and vector-tested before use.

## Enrollment

A tag is not trusted merely because it says it belongs to an EVO Seal.

Enrollment is a controlled issuer action:

1. Create / select an active EVO Seal.
2. Read the genuine NFC tag during provisioning.
3. Assign a random EVO `tag_id` unrelated to the secret key.
4. Record the expected 7-byte UID internally.
5. Provision unique per-tag AES keys.
6. Configure the reviewed dynamic NDEF / SDM parameters.
7. Store secret key material server-side only.
8. Bind `tag_id ↔ UID ↔ seal_id` in the protected EVO registry.
9. Perform a known-good test tap.
10. Mark the tag `ACTIVE` only after cryptographic and counter verification succeeds.

Production provisioning must never expose master or per-tag secrets to browser JavaScript.

## Key hierarchy

Pilot:

- unique AES key material per physical tag;
- server-side environment/secret storage only;
- no keys committed to GitHub;
- no keys stored in a public database/API;
- no master key in frontend code;
- small pilot key map only, with explicit rotation procedure.

Production target:

- key diversification;
- secret manager / KMS or HSM-backed verification;
- rotation and revocation procedures;
- strict provisioning roles;
- immutable audit log for enrollment and key changes.

A successful pilot does not justify keeping a flat environment JSON key map at enterprise scale.

## NFC-backed Pulse

Current EVO Pulse records public observations and intentionally does not by itself prove physical presence.

After full NFC authority is completed, server-only source classes may include:

- `NFC_VERIFIED`
- `NFC_TAMPER_OK`
- `NFC_TAMPER_OPEN`

Only the server may create these physical-grade sources after cryptographic and replay verification. A browser request alone must never label a Pulse as NFC verified.

## Guardian signals

### Positive evidence

- valid NFC cryptographic proof;
- fresh monotonic SDM counter;
- recent valid NFC proof;
- continuous NFC-backed Pulse chain;
- TagTamper intact, when separately implemented and validated;
- issuer and owner history consistent.

### Risk evidence

- invalid MAC / cryptographic response;
- decrypted UID different from enrollment;
- stale or repeated read counter;
- impossible counter rollback;
- tag bound to more than one active Seal;
- Seal bound to unexpected tag identity;
- TagTamper reports opened state;
- excessive failed physical proofs;
- valid digital Seal but no physical proof where product policy requires one.

No single heuristic should automatically declare a physical product counterfeit. Guardian reports evidence and risk, not unsupported certainty.

## Evidence levels

Suggested public language:

- `DIGITAL REGISTERED` — Seal exists.
- `DIGITAL SIGNATURE VERIFIED` — issuer/wallet signature is valid.
- `HASH VERIFIED` — supplied file matches the registered hash.
- `LIVE SOFTWARE PROOF` — one-time software challenge completed.
- `NFC CRYPTO VERIFIED` — secure NFC cryptographic proof + replay authority validated.
- `TAMPER STATUS VERIFIED` — separately supported tamper state validated.

`AUTHENTIC PRODUCT` must not be displayed solely from these technical checks unless the issuer/product policy legally and operationally supports that statement.

## First physical pilot

### Gate 1 — software vectors — COMPLETED V4.4

- NXP AN12196 Rev. 2.0 reference vectors pass in CI;
- modified MAC is rejected;
- shared crypto code is the same code imported by the Edge verifier;
- secrets are not accepted from the public request.

### Gate 2 — hardware — EXTERNAL

- obtain a small number of genuine NTAG 424 DNA tags;
- optionally obtain TagTamper samples;
- use an NFC reader/writer and NXP-supported provisioning tooling.

### Gate 3 — lab provisioning — EXTERNAL + EVO

- replace factory/default keys with non-production pilot keys;
- configure reviewed NDEF/SDM offsets;
- verify changing authenticated data over repeated taps;
- compare real tag output with EVO server verification.

### Gate 4 — replay authority — NEXT SOFTWARE GATE

- add protected `evo_nfc_tags` registry without secret keys;
- store tag/Seal/UID binding and last accepted counter;
- advance the counter atomically only after crypto success;
- reject repeated or lower counters under concurrent requests.

### Gate 5 — destructive / clone-resistance test — EXTERNAL

- copy the public URL to another NFC tag and confirm it cannot receive `NFC CRYPTO VERIFIED`;
- replay an old authenticated URL and confirm rejection;
- alter one byte of dynamic data and confirm rejection;
- if using TagTamper, open the seal and confirm the separately implemented state transition.

## Token policy

EVO NFC pilot moves 0 EVO and 0 POL. Verification remains free.

## References

- NXP NTAG 424 DNA / 424 DNA TagTamper product documentation.
- **NXP AN12196 Rev. 2.0 — NTAG 424 DNA and NTAG 424 DNA TagTamper features and hints, 4 March 2025.**
- NIST SP 800-38B — CMAC mode for authentication.

The implementation must continue to be checked against current official NXP documentation before provisioning real products.
