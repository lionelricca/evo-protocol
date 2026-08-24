# EVO NFC Physical Pilot — V4.6

Status: **software verifier complete / production NFC authority deployed / no physical tag approved yet**

This file keeps its historical path for compatibility, but its current content describes the V4.6 physical-pilot gate.

## Objective

Move EVO from software-validated NFC cryptography to real physical evidence without treating test vectors, copied URLs or laboratory configuration as proof of a genuine deployed tag.

The software side currently includes:

- NTAG 424 DNA AES/SUN/SDM verification;
- encrypted PICCData parsing;
- UID + EVO Seal binding;
- atomic replay/counter authority;
- NTAG 424 DNA TagTamper encrypted-status decryption;
- NXP `TTPermStatus || TTCurrStatus` interpretation;
- per-tag `physicalPilotApproved` fail-closed gate.

## Official hardware baseline

Pilot target:

- NXP NTAG 424 DNA;
- NXP NTAG 424 DNA TagTamper for the opening-state test.

Official references used by the implementation:

- NXP AN12196 Rev. 2.0 — 4 March 2025;
- NXP NT4H2421Tx data sheet Rev. 3.0 — 31 January 2019;
- NIST SP 800-38B for AES-CMAC.

NXP documents the TagTamper values as:

- `43h` (`C`) = Close;
- `4Fh` (`O`) = Open;
- `49h` (`I`) = Invalid / feature not enabled.

The permanent status cannot be reset to Close after an opening is detected.

## Reviewed TagTamper NDEF layout

For the first physical pilot, use exactly the reviewed V4.6 shape:

```text
https://<EVO-domain>/nfc/<tag-id>?picc_data=<32-hex>&enc=<32-hex>&cmac=<16-hex>
```

Requirements:

- encrypted PICCData mirrors UID + SDM counter;
- `enc` is one encrypted 16-byte SDM file-data block;
- plaintext bytes `0..1` of that block contain `TTPermStatus || TTCurrStatus`;
- `SDMMACInputOffset` begins at the first character of the `enc` value;
- `SDMMACOffset` is placed after the literal `&cmac=`;
- server-side dynamic MAC input is therefore exactly `<enc>&cmac=`.

Do not improvise a different offset layout during the first pilot. A different layout requires a separate reviewed profile/test vector.

## Server profile before physical approval

Each real tag receives a unique secret-side profile. Example shape only:

```json
{
  "NFC-<PUBLIC-ID>": {
    "enabled": true,
    "sealId": "EVO-XXXXXXXX-XXXXXXXX-XXXXXXXX",
    "expectedUid": "<14 HEX>",
    "metaReadKey": "<32 HEX SECRET>",
    "fileReadKey": "<32 HEX SECRET>",
    "tagType": "NTAG_424_DNA_TAGTAMPER",
    "macInputMode": "ENC_ASCII_CMAC_SUFFIX",
    "ttStatusIndex": 0,
    "physicalPilotApproved": false
  }
}
```

Real AES keys must exist only in the Supabase server secret `EVO_NFC_PILOT_KEYS`; never in GitHub, browser code, screenshots, QR/NDEF public text or the public database.

## Physical pilot sequence

1. Obtain genuine NTAG 424 DNA and TagTamper samples from a traceable source.
2. Read and record the genuine 7-byte UID for each selected pilot tag.
3. Create/select an ACTIVE EVO Seal for the test object.
4. Generate unique non-default AES lab keys for that one tag.
5. Configure the reviewed SDM/NDEF layout with NXP-compatible tooling.
6. Add the per-tag profile to the server secret with `physicalPilotApproved=false`.
7. Call controlled `enroll_binding` so `tag_id ↔ UID ↔ seal_id` is stored in `evo_nfc_tags`.
8. Tap the unopened TagTamper tag and confirm:
   - valid SUN/SDM MAC;
   - UID match;
   - counter accepted;
   - `tamperState=INTACT`;
   - `nfcCryptoVerified=false` because physical approval is still false.
9. Tap again and confirm the counter increases.
10. Replay the previous URL and confirm `REPLAY_REJECTED`.
11. Modify one MAC/PICCData/enc character and confirm rejection.
12. Break/open the physical tamper loop.
13. Tap again and confirm `tamperState=OPEN` and verified TagTamper status.
14. Confirm the permanent open state remains Open on subsequent taps.
15. Record the evidence pack: tag type, UID, public tag alias, Seal ID, provisioning date, closed-tap result, replay result, altered-data result and opened-tap result. Never include AES keys.
16. Only after every required test passes, change that tag profile to `physicalPilotApproved=true`.
17. Perform one final tap and confirm the strong cryptographic result is emitted while `OPEN` still surfaces as a tamper risk when applicable.

## Pass criteria

The pilot passes only when all of these are demonstrated on a real tag:

- genuine tag can be read and provisioned;
- UID matches the enrolled profile;
- NXP cryptographic proof validates;
- counters increase across independent taps;
- a replayed counter is rejected;
- modified authenticated data is rejected;
- copied public URL does not create a new bound tag identity;
- TagTamper starts as `INTACT`;
- deliberate opening produces `OPEN`;
- permanent open evidence persists;
- no AES secret appears in browser/network-visible payloads, GitHub or public DB;
- `physicalPilotApproved` remains false until the test is complete.

## Claims boundary

A valid secure tag proves that the expected cryptographic tag participated in the verified tap. An `OPEN` state proves that the configured tamper mechanism reports an opening state.

Neither statement alone proves the factual or legal authenticity of the product to which the tag is attached.

The public proof therefore continues to carry:

```text
physicalAuthenticity=false
```

until a separate issuer/product assurance policy justifies a stronger statement.

## After the pilot

Once one TagTamper pilot passes, repeat the same procedure on multiple tags before treating provisioning as operationally reliable. For enterprise deployment, replace the flat pilot secret map with diversified per-tag keys and KMS/HSM-backed key operations plus auditable provisioning and rotation.
