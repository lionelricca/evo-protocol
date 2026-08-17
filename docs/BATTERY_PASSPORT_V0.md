# EVO Battery Passport V0

## Purpose

EVO Battery Passport V0 is the first regulated-market vertical built on EVO Protocol.

It is designed to help economic operators prepare battery passport data for Regulation (EU) 2023/1542 without presenting EVO itself as a notified body, legal certifier, or EU authority.

The compliance engine provides **readiness assessment**, not legal certification.

## Regulatory trigger

Article 77(1) of Regulation (EU) 2023/1542 requires a battery passport from **18 February 2027** for:

- LMT batteries;
- industrial batteries with capacity greater than 2 kWh;
- electric vehicle batteries.

The responsible economic operator is the operator placing the finished battery on the EU market or putting it into service.

## EVO architecture

EVO separates four regulatory access layers:

1. `PUBLIC`
   - Battery-model information accessible to the general public.
2. `LEGITIMATE_INTEREST`
   - Detailed composition, replacement parts, dismantling and safety information.
3. `AUTHORITY`
   - Compliance test report results for notified bodies, market-surveillance authorities and the Commission.
4. `INDIVIDUAL_LEGITIMATE_INTEREST`
   - Battery-specific performance, state of health, status and usage history.

Restricted information is not exposed directly through browser-readable database tables.

## Database objects

### `evo_battery_models`

Stores the signed model-level record:

- EVO model ID;
- issuer wallet;
- operator/model identifier;
- model name;
- battery category;
- nominal energy;
- public information block;
- legitimate-interest block;
- authority block;
- deterministic data hash;
- wallet signature;
- record status.

An incomplete model is stored as `DRAFT`. A model is promoted to `ACTIVE` only when the current V0.1 model-readiness rules return `READY`.

### `evo_battery_passports`

Stores one individual battery passport linked to an active model:

- EVO passport ID;
- unique battery identifier;
- serial number;
- optional EVO Seal binding;
- issuer wallet;
- battery lifecycle status;
- restricted individual-data block;
- deterministic data hash;
- wallet signature.

### `evo_battery_passport_versions`

Immutable history of accepted individual passport snapshots.

## Edge Function

`evo-battery-passport`

Current actions:

- `requirements`
- `assess`
- `prepare_model`
- `commit_model`
- `get_model`
- `prepare_passport`
- `commit_passport`
- `get_passport`

Writes use a prepare/sign/commit flow with an EVM wallet signature. The function recomputes deterministic hashes and verifies the signature server-side before accepting data.

## Readiness states

### Field states

- `READY`
- `MISSING_DATA`
- `NOT_APPLICABLE`

A conditional field may only be treated as `NOT_APPLICABLE` when its applicability has been explicitly resolved. Evidence supporting that decision should be retained.

### Model states

- `READY`
- `MISSING_DATA`
- `NOT_APPLICABLE`

The applicability result is intentionally phrased as a readiness determination:

- `LIKELY_REQUIRED`
- `NOT_APPLICABLE_BY_ART77_1`
- `NEEDS_CLASSIFICATION_REVIEW`

This is not a legal opinion.

## Deterministic integrity

Every accepted model and individual passport is canonicalized and SHA-256 hashed before signing.

The signed model message is:

```text
EVO BATTERY MODEL V0
Model ID: <model-id>
Data Hash: <sha256>
Issuer: <wallet>
Signed: <iso-time>
```

The signed individual-passport message is:

```text
EVO BATTERY PASSPORT V0
Passport ID: <passport-id>
Data Hash: <sha256>
Issuer: <wallet>
Signed: <iso-time>
```

EVO does not custody the issuer private key.

## Current safeguards

- RLS enabled on all battery tables.
- Direct `anon` and `authenticated` table privileges revoked.
- Public output is filtered through the Edge Function.
- Restricted model and individual blocks are excluded from public passport responses.
- Wallet signatures are verified server-side.
- Prepared signatures expire after ten minutes.
- Model IDs and passport IDs are derived from deterministic state hashes.
- Incomplete models are not published as active models.
- No token transfer is involved.

## Not implemented yet

- EU DPP Registry submission.
- ISO/IEC 15459 identifier-provider integration.
- Final CEN/CENELEC harmonised DPP exchange implementation.
- Role credential verification for legitimate-interest access.
- Market-surveillance/notified-body credential gateway.
- Automated ERP/BMS connectors.
- Secure NFC physical binding.
- Independent conformity assessment or certification.

## Primary regulatory mapping

- Regulation (EU) 2023/1542 Article 77 — battery passport.
- Regulation (EU) 2023/1542 Article 78 — technical design and operation.
- Annex XIII — information included in the battery passport.
- Annex VI Part A — general battery label information referenced by Annex XIII.

The requirements file and code must be reviewed whenever delegated acts, implementing acts, harmonised standards or official Commission guidance change.