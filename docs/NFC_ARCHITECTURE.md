# EVO NFC — Physical Proof Architecture

Status: **V4.6 software authority complete including NTAG 424 DNA TagTamper parsing / NXP vectors validated / production replay registry deployed / physical tag pilot pending**

## Goal

EVO NFC binds an EVO Seal to a secure physical NFC tag so copying a QR or public URL is insufficient to reproduce the strongest physical-grade proof.

Reference hardware:

- **NXP NTAG 424 DNA** for secure physical binding;
- **NXP NTAG 424 DNA TagTamper** when permanent/current opening evidence matters.

NXP documents AES-128, SUN/SDM, NFC Forum Type 4, encrypted dynamic file data and the TagTamper loop.

## Implemented software stack

- `supabase/functions/_shared/evo-aes-cmac.mjs` — AES-128 block operations, NIST SP 800-38B CMAC, NXP MACt, SDM MAC/ENC session-key derivation, encrypted PICCData parsing, encrypted SDM file-data decryption and TagTamper C/O/I parsing.
- `supabase/functions/evo-nfc-verifier/index.ts` — server-side verification, TagTamper interpretation and controlled binding enrollment.
- `public.evo_nfc_tags` — protected tag/UID/Seal/replay registry; **contains no AES keys**.
- `public.evo_accept_nfc_counter(...)` — `SECURITY DEFINER`, empty `search_path`, service-role-only atomic authority.
- `tests/nfc-crypto-v440.test.mjs` — NXP AN12196 Rev. 2.0 runtime vectors, encrypted SDM data, dynamic MAC input and tampered-MAC rejection.
- `tests/nfc-replay-authority-v450.sql` — RLS/ACL, tag+UID+Seal binding, monotonic counter, replay and revoked-tag regression.
- dedicated NFC crypto and authority GitHub Actions gates.

Production migrations:

- `20260824154458_nfc_replay_authority_v450.sql`
- `20260824154519_nfc_explicit_deny_v450.sql`
- `20260824154708_nfc_seal_binding_authority_v450.sql`

Post-migration Supabase Security Advisor: **0 security lints**.

## Official cryptographic basis

The implementation is checked against:

- **NXP AN12196 Rev. 2.0 — 4 March 2025**;
- **NXP NT4H2421Tx data sheet Rev. 3.0 — 31 January 2019** for TagTamper behavior.

CI validates the NXP reference results for:

1. encrypted PICCData decryption;
2. 7-byte UID and SDM read-counter extraction;
3. `SV1 = C33C 0001 0080 || UID || SDMReadCtr` ENC session-key derivation;
4. `SV2 = 3CC3 0001 0080 || UID || SDMReadCtr` MAC session-key derivation;
5. AES-CMAC under NIST SP 800-38B;
6. NXP MACt truncation;
7. zero-length SDMMAC input;
8. non-empty dynamic SDMMAC input;
9. encrypted SDM file-data IV/session-key calculation and decryption;
10. modified-MAC rejection.

Passing software vectors does not itself prove a physical tag was provisioned correctly.

## TagTamper semantics

NXP defines two mirrored status bytes in this order:

`TTPermStatus || TTCurrStatus`

Supported values are:

- `43h` / ASCII `C` = **Close**;
- `4Fh` / ASCII `O` = **Open**;
- `49h` / ASCII `I` = **Invalid / feature not enabled**.

`TTPermStatus` becomes Open irreversibly after an opening is detected. EVO maps:

- `C + C` → `INTACT`;
- either status `O` → `OPEN`;
- `I` or unknown status → `UNKNOWN` and no final TagTamper-grade claim.

For TagTamper, EVO decrypts the authenticated SDM encrypted mirror server-side. The browser never receives the AES key.

## Reviewed V4.6 TagTamper pilot layout

The pilot is deliberately pinned to one auditable NDEF/SDM shape:

```text
https://<EVO-domain>/nfc/<public-tag-id>?picc_data=<32-hex>&enc=<32-hex>&cmac=<16-hex>
```

For the TagTamper profile:

- `PICCENCData` contains encrypted UID + SDM read counter;
- `enc` is one 16-byte `SDMENCFileData` block rendered as 32 ASCII hex characters;
- the pilot places `TTPermStatus || TTCurrStatus` at plaintext bytes `0..1` inside that encrypted block (`ttStatusIndex=0`);
- `SDMMACInputOffset` starts at the first ASCII hex character of the `enc` value;
- `SDMMACOffset` is after the literal `&cmac=`;
- therefore the backend MAC input is derived internally as exactly:

```text
<enc>&cmac=
```

This matches the non-empty dynamic-input pattern demonstrated in AN12196 Table 5. EVO does not accept an arbitrary caller-supplied MAC input for this profile.

Other offsets/layouts require a new reviewed profile and vectors before use.

## Trust decision

Normal NTAG 424 DNA:

```text
NXP SDM/SUN MAC valid
        AND
Decrypted UID = enrolled UID
        AND
Public tag_id = enrolled tag binding
        AND
Expected EVO Seal = registry Seal
        AND
Tag status = ACTIVE
        AND
Read counter > last accepted counter atomically
        AND
Physical pilot approved for that specific tag
        ↓
NFC_CRYPTO_VERIFIED
```

TagTamper adds one more mandatory condition:

```text
Authenticated encrypted TTStatus decrypts to valid C/O state
```

An `OPEN` state does **not** mean the cryptographic tag proof is fake; it means the secure tag verified while reporting that the seal has been opened. The public proof layer may therefore expose `VERIFIED_TAMPER_OPEN` plus `TAMPER_OPEN` risk.

If crypto is valid but the counter is stale/repeated, EVO returns `REPLAY_REJECTED`.

If TagTamper decrypts to `I`/invalid, EVO returns `TAGTAMPER_STATUS_INVALID` and keeps `nfcCryptoVerified=false`.

If crypto + replay authority pass but the physical pilot is not yet approved, EVO returns:

`CRYPTO_AND_REPLAY_VALIDATED_PENDING_PHYSICAL_PILOT`

and keeps `nfcCryptoVerified=false`.

## Atomic replay authority

`evo_accept_nfc_counter` updates a tag only when all of these match inside one database decision:

- `tag_id`;
- expected 7-byte UID;
- expected `seal_id`;
- `status='ACTIVE'`;
- new 24-bit counter is strictly greater than `last_counter`.

The `UPDATE ... WHERE p_counter > last_counter` decision makes repeated or lower counters fail after the first accepted write, including competing attempts against the same stored counter state.

Browser roles have no direct table access and no EXECUTE authority on the RPC. The Edge verifier calls it through server authority only.

## Enrollment

Controlled pilot enrollment requires:

1. active EVO Seal;
2. genuine tag read during provisioning;
3. random public `NFC-...` alias;
4. expected UID;
5. unique pilot AES keys;
6. reviewed SDM/NDEF configuration;
7. keys stored only in server secret/environment storage;
8. server `enroll_binding` action to bind tag + UID + Seal in `evo_nfc_tags`;
9. real known-good tap;
10. for TagTamper, confirm valid closed status before opening the loop;
11. perform the deliberate open test and confirm permanent/current status handling;
12. only after physical testing, mark `physicalPilotApproved=true` for that specific secret-side tag profile.

Production provisioning must never expose an AES key in browser JavaScript, QR/NDEF public data, GitHub, logs or the public database.

## Pilot key profile

The pilot secret map supports two intentionally restricted modes.

Normal tag shape:

```json
{
  "NFC-<PUBLIC-ID>": {
    "enabled": true,
    "sealId": "EVO-XXXXXXXX-XXXXXXXX-XXXXXXXX",
    "expectedUid": "<14 HEX>",
    "metaReadKey": "<32 HEX SECRET>",
    "fileReadKey": "<32 HEX SECRET>",
    "tagType": "NTAG_424_DNA",
    "macInputMode": "ZERO_LENGTH",
    "physicalPilotApproved": false
  }
}
```

TagTamper shape:

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

Placeholders above are documentation only. Real secrets belong only in Supabase server secrets.

For enterprise scale, replace the flat pilot map with diversified per-tag keys and KMS/HSM-backed operations, provisioning/verification role separation, rotation, revocation and auditable key lifecycle.

## Evidence language

Allowed technical levels:

- `DIGITAL REGISTERED`
- `DIGITAL SIGNATURE VERIFIED`
- `HASH VERIFIED`
- `LIVE SOFTWARE PROOF`
- `NFC CRYPTO VERIFIED` — only after the complete conjunctive gate
- `TAMPER STATUS VERIFIED` — only after cryptographic TagTamper parsing and the physical pilot

Never infer `AUTHENTIC PRODUCT` solely from these technical states unless the issuer's legal/product policy supports that stronger assertion.

## Remaining physical pilot

### Software — COMPLETE

- NXP reference crypto vectors pass.
- Encrypted SDM data vector passes.
- Dynamic MAC-input vector passes.
- TagTamper C/O/I semantics implemented fail-closed.
- Modified MAC is rejected.
- Protected tag registry deployed.
- Browser RLS is explicit deny-all.
- Atomic tag + UID + Seal + monotonic counter authority deployed.
- Replay and revoked-tag cases are tested.
- Final claim remains per-tag physical-pilot gated.

### Hardware — EXTERNAL

1. Obtain genuine NTAG 424 DNA and TagTamper samples.
2. Provision non-default unique lab keys with NXP-supported tooling.
3. Configure the reviewed SDM offsets/NDEF layout above.
4. Add the same unique keys only to Supabase server secrets.
5. Enrol tag binding through the controlled server action.
6. Tap the closed TagTamper and confirm `INTACT`.
7. Repeat real taps and verify increasing counters.
8. Replay an old URL and confirm rejection.
9. Copy the public URL and confirm it cannot substitute for a differently bound tag.
10. Alter MAC/PICCData/enc and confirm rejection.
11. Open the tamper loop and confirm `OPEN` plus persistent open evidence.
12. Only then set `physicalPilotApproved=true` for the tested tag.

## Token policy

The NFC pilot moves **0 EVO and 0 POL**. Public verification remains free.

## References

- NXP NTAG 424 DNA / NTAG 424 DNA TagTamper product documentation.
- **NXP AN12196 Rev. 2.0 — NTAG 424 DNA and NTAG 424 DNA TagTamper features and hints, 4 March 2025.**
- **NXP NT4H2421Tx Rev. 3.0 — NTAG 424 DNA TT data sheet, 31 January 2019.**
- NIST SP 800-38B — CMAC.
