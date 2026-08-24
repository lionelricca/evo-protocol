# EVO NFC Pilot V4.2.1

Status: **laboratory contract / no production keys / no production NFC authority**

## Objective

Turn the NFC architecture into a testable EVO product boundary without pretending that software alone has already validated a physical tag.

The V4.2.1 milestone defines what EVO may expose publicly **after** a trusted server-side verifier has checked an NFC cryptographic proof.

This milestone does not implement NXP key provisioning, AES/SUN verification, tag personalization or a production NFC endpoint.

## Official hardware baseline

Pilot target:

- NXP NTAG 424 DNA for cryptographic physical binding;
- NXP NTAG 424 DNA TagTamper where package/opening state matters.

The implementation must be checked against current official NXP documentation before real provisioning, including:

- NTAG 424 DNA product documentation;
- NTAG 424 DNA data sheet `NT4H2421Gx`;
- Application Note `AN12196` — NTAG 424 DNA and NTAG 424 DNA TagTamper features and hints;
- TagTamper-specific documentation when tamper loops are used.

EVO must not invent cryptographic field layouts or keys from memory.

## V4.2.1 implementation

### Public evidence contract

`standards/evo-nfc-proof-v421.mjs`

The public contract accepts only a **server decision**. It does not receive or verify secret tag keys.

A proof can become `NFC_CRYPTO_VERIFIED` only when all of these are true:

1. verifier mode is `SERVER_SIDE_NTAG424`;
2. MAC/authentication decision is valid;
3. tag is bound to the expected EVO Seal;
4. no replay is detected;
5. dynamic counter/freshness policy passes;
6. tag ID, Seal ID and verification timestamp are valid.

Any missing authority fails closed.

### Tamper state

When a supported TagTamper tag is cryptographically verified:

- `INTACT` can add `TAMPER_STATUS_VERIFIED`;
- `OPEN` can add `TAMPER_STATUS_VERIFIED` plus risk signal `TAMPER_OPEN`;
- an open tamper loop does not invalidate that the NFC cryptographic proof was genuine, but it changes the public status to `VERIFIED_TAMPER_OPEN`.

### Claims boundary

Every public NFC proof carries:

```text
physicalAuthenticity=false
```

A cryptographically verified tag is evidence that the expected secure tag participated in the verification. It is not, by itself, a legal or factual declaration that the attached product is authentic.

## Public schema

`schemas/evo-nfc-proof-v1.schema.json`

The schema:

- contains no secret-key field;
- permits only the public evidence result;
- fixes `verifierMode` to server-side NTAG424 authority;
- fixes `physicalAuthenticity` to `false`;
- distinguishes verified, tamper-open and rejected states.

## Regression tests

`tests/nfc-proof-v421.test.mjs`

Current test cases cover:

- valid cryptographic server decision;
- invalid MAC;
- replay;
- tag not bound to the Seal;
- browser/local verifier rejected;
- TagTamper intact;
- TagTamper open;
- accidental secret fields removed from the public result;
- schema claim boundary.

## What is deliberately NOT implemented yet

- AES key provisioning;
- SUN/SDM cryptographic verification;
- raw NXP encrypted PICC data parsing;
- production `evo_nfc_tags` table;
- production tag-enrollment RPC/function;
- production public NFC verification endpoint;
- KMS/HSM key storage;
- NFC-backed authoritative Pulse;
- Guardian NFC scoring;
- public `NFC CRYPTO VERIFIED` UI.

## Next hardware gate

Before implementing cryptography:

1. obtain genuine NTAG 424 DNA samples;
2. obtain a small number of TagTamper samples;
3. select an NFC reader/writer compatible with secure configuration;
4. provision one test tag using non-production keys;
5. reproduce official NXP test vectors;
6. confirm dynamic data changes across taps;
7. reject modified MAC/data;
8. test replay/counter policy;
9. only then implement the EVO lab verifier.

## Security rules

- Never commit AES/master/per-tag keys.
- Never expose tag keys to browser JavaScript.
- Never store tag secrets in a public Supabase table or public API response.
- Use different credentials for laboratory and production.
- The browser may display an NFC proof; it must never create the authoritative cryptographic decision.
- A copied QR or copied NFC URL must never receive physical-grade evidence by itself.

## Promotion rule

V4.2.1 remains laboratory-only until physical tests demonstrate that:

- a genuine provisioned tag verifies;
- a copied URL does not verify as another tag;
- a replay is handled according to policy;
- a modified authenticated payload is rejected;
- TagTamper state changes are correctly interpreted where applicable.
