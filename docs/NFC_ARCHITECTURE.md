# EVO NFC — Physical Proof Architecture

Status: **V4.5 software authority complete / NXP vectors validated / production replay registry deployed / physical tag pilot pending**

## Goal

EVO NFC binds an EVO Seal to a secure physical NFC tag so copying a QR or public URL is insufficient to reproduce the strongest physical-grade proof.

Reference hardware: **NXP NTAG 424 DNA**; use NTAG 424 DNA TagTamper where package-opening evidence is required. NXP documents AES-128, SUN/SDM, NFC Forum Type 4 and the TagTamper loop.

## Implemented software stack

- `supabase/functions/_shared/evo-aes-cmac.mjs` — AES-128 block operations, NIST SP 800-38B CMAC, NXP MACt, SDM session-key derivation, encrypted PICCData parsing and SUN verification.
- `supabase/functions/evo-nfc-verifier/index.ts` — server-side verification and controlled binding enrollment.
- `public.evo_nfc_tags` — protected tag/UID/Seal/replay registry; **contains no AES keys**.
- `public.evo_accept_nfc_counter(...)` — `SECURITY DEFINER`, empty `search_path`, service-role-only atomic authority.
- `tests/nfc-crypto-v440.test.mjs` — NXP AN12196 Rev. 2.0 runtime vectors and tampered-MAC rejection.
- `tests/nfc-replay-authority-v450.sql` — RLS/ACL, tag+UID+Seal binding, monotonic counter, replay and revoked-tag regression.
- dedicated NFC crypto and authority GitHub Actions gates.

Production migrations:

- `20260824154458_nfc_replay_authority_v450.sql`
- `20260824154519_nfc_explicit_deny_v450.sql`
- `20260824154708_nfc_seal_binding_authority_v450.sql`

Post-migration Supabase Security Advisor: **0 security lints**.

## Cryptographic basis

The implementation is checked against **NXP AN12196 Rev. 2.0 — 4 March 2025**.

CI validates the NXP reference results for:

1. encrypted PICCData decryption;
2. 7-byte UID and SDM read-counter extraction;
3. `SV2 = 3CC3 0001 0080 || UID || SDMReadCtr` session-key derivation;
4. AES-CMAC under NIST SP 800-38B;
5. NXP MACt truncation;
6. zero-length SDMMAC input;
7. non-empty dynamic SDMMAC input;
8. modified-MAC rejection.

Passing software vectors does not itself prove a physical tag was provisioned correctly.

## Trust decision

A successful public NFC result is deliberately conjunctive:

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

If crypto is valid but the counter is stale/repeated, EVO returns `REPLAY_REJECTED`.

If crypto + replay authority pass but the physical pilot is not yet approved, EVO returns:

`CRYPTO_AND_REPLAY_VALIDATED_PENDING_PHYSICAL_PILOT`

and keeps `nfcCryptoVerified=false`.

This prevents CI/test vectors from being misrepresented as physical evidence.

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

A tag is not trusted just because its URL names an EVO Seal.

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
10. only after physical testing, mark `physicalPilotApproved=true` for that specific secret-side tag profile.

Production provisioning must never expose an AES key in browser JavaScript, QR/NDEF public data, GitHub, logs or the public database.

## Pilot key policy

For a very small laboratory pilot, `EVO_NFC_PILOT_KEYS` may contain unique per-tag key profiles as a Supabase server secret. It is not a production-scale key-management design.

Enterprise target:

- diversified per-tag keys;
- KMS/HSM-backed storage/operations;
- separation of provisioning and verification authority;
- rotation and revocation procedures;
- auditable key lifecycle;
- no flat secret map at scale.

## Public URL

Reviewed first-pilot shape:

```text
https://<EVO-domain>/nfc/<public-tag-id>?picc_data=<encrypted-picc-data>&cmac=<dynamic-mac>
```

The public alias is not a secret. The AES key must never be present in the URL.

The first configuration remains pinned to the reviewed AN12196-compatible `SDMMACInputOffset == SDMMACOffset` / zero-length MAC-input path. Additional layouts require their own vectors and configuration review.

## Evidence language

Allowed technical levels:

- `DIGITAL REGISTERED`
- `DIGITAL SIGNATURE VERIFIED`
- `HASH VERIFIED`
- `LIVE SOFTWARE PROOF`
- `NFC CRYPTO VERIFIED` — only after the complete conjunctive gate above
- `TAMPER STATUS VERIFIED` — only after TagTamper parsing/provisioning has separately passed a physical test

Never infer `AUTHENTIC PRODUCT` solely from these technical states unless the issuer's legal/product policy supports that stronger assertion.

## Remaining physical pilot

### Software — COMPLETE

- NXP reference crypto vectors pass.
- Modified MAC is rejected.
- Protected tag registry deployed.
- Browser RLS is explicit deny-all.
- Atomic tag + UID + Seal + monotonic counter authority deployed.
- Replay and revoked-tag cases are tested.
- Final claim remains per-tag physical-pilot gated.

### Hardware — EXTERNAL

1. Obtain genuine NTAG 424 DNA samples; optionally TagTamper.
2. Provision non-default lab keys with NXP-supported tooling.
3. Configure the reviewed SDM offsets/NDEF layout.
4. Add the same unique keys only to Supabase server secrets.
5. Enrol tag binding through the controlled server action.
6. Perform repeated real taps and verify changing counters.
7. Replay an old URL and confirm rejection.
8. Copy the public URL to another tag and confirm rejection.
9. Alter MAC/PICCData and confirm rejection.
10. Only then set `physicalPilotApproved=true` for the tested tag.
11. For TagTamper, open the seal and validate tamper-state handling separately before enabling `TAMPER STATUS VERIFIED`.

## Token policy

The NFC pilot moves **0 EVO and 0 POL**. Public verification remains free.

## References

- NXP NTAG 424 DNA / NTAG 424 DNA TagTamper product documentation.
- **NXP AN12196 Rev. 2.0 — NTAG 424 DNA and NTAG 424 DNA TagTamper features and hints, 4 March 2025.**
- NIST SP 800-38B — CMAC.
