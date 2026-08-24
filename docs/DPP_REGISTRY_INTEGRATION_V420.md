# EVO V4.2 — EU DPP Registry Integration

Status: implementation plan / test-environment first / no production Registry credentials

## Objective

Connect EVO Battery Passport to the European Commission Digital Product Passport Registry testing environment using a server-side integration that preserves EVO's decentralized passport data model and never exposes Registry credentials to the browser.

The EU Registry is an index and registration layer, not the storage location for the complete EVO passport dataset.

## Current external state — 24 August 2026

- The EU DPP Registry has been operational since 20 July 2026.
- A testing environment is available.
- Economic operators can register through a secure UI or API.
- The Registry stores unique identifiers, registration data and high-level metadata.
- Detailed product/passport data remains decentralised under the responsibility of the economic operator or authorised DPP provider.
- Six of eight harmonised DPP standards are already published/referenced; remaining standards and battery access-right implementation details remain tracked dependencies.
- Battery passports become mandatory on 18 February 2027 for LMT batteries, EV batteries and industrial batteries above 2 kWh within scope.

## Trust boundary

```text
Browser / customer UI
        |
        | signed EVO request
        v
EVO server authority
        |
        | validated + authorised registration job
        v
EU DPP Registry adapter
        |
        | Registry credentials/tokens
        v
EU DPP Registry test environment
```

Rules:

1. Registry credentials never enter browser JavaScript.
2. EU Login/user credentials are not stored by EVO merely to simplify onboarding.
3. Registry writes require an authorised economic-operator context.
4. A successful EVO passport creation does not imply successful EU Registry registration.
5. A Registry registration does not imply product conformity or certification.
6. Test and production Registry environments must be cryptographically/configurationally separated.

## Proposed server model

Protected table: `evo_dpp_registry_registrations`

Suggested fields:

- `id`
- `passport_id`
- `passport_version_id`
- `economic_operator_id`
- `registry_environment` (`TEST`, future `PRODUCTION`)
- `registry_identifier`
- `registry_status`
- `request_fingerprint`
- `registered_at`
- `last_checked_at`
- `proof_reference`
- `response_fingerprint`
- `attempt_count`
- `last_error_code`
- `created_at`
- `updated_at`

Do not store access tokens or reusable secrets in this table.

## Registration state machine

```text
NOT_REGISTERED
      |
      v
READY_TO_REGISTER
      |
      v
SUBMITTING
  /       \
 v         v
REGISTERED  RETRYABLE_ERROR
                |
                v
             SUBMITTING

Terminal/manual-review states:
- REJECTED
- IDENTITY_REVIEW
- SCHEMA_REVIEW
- REVOKED / WITHDRAWN when supported by the applicable Registry workflow
```

## Idempotency

Every outbound registration must use a deterministic request fingerprint derived from the controlled registration payload and the EVO passport/version identity.

Before submitting:

1. verify that the passport version is still authoritative;
2. verify the economic operator is authorised;
3. search the protected EVO registration table for the same fingerprint;
4. if a successful registration already exists, return the existing registration evidence instead of writing again;
5. if the previous attempt is retryable, increment attempt metadata and preserve the original audit chain.

## Payload mapping

The exact live/test payload schema must be taken from current Commission technical documentation and observed test-environment behavior.

EVO should maintain a versioned mapper rather than hardcoding Registry fields throughout the product:

```text
EVO Battery Passport model
        ↓
DPP harmonised semantic mapper
        ↓
Registry registration payload mapper
        ↓
Commission API adapter
```

This lets EVO update standards mappings without rewriting the core passport model.

## Proof of registration

When the Registry provides or exposes a secure electronic proof/registration evidence, EVO should:

1. capture the external registration identifier;
2. retain the evidence/reference according to Commission rules;
3. hash the received evidence where technically appropriate;
4. bind the evidence to the exact EVO passport version;
5. expose only safe, non-sensitive proof metadata to the customer/public UI;
6. make the distinction clear between `REGISTERED IN EU DPP REGISTRY` and any separate conformity/certification claim.

## Failure policy

Never silently convert Registry failure into success.

Customer-facing states should distinguish:

- EVO passport created;
- Registry registration pending;
- Registry registered;
- Registry rejected/review required;
- Registry temporarily unavailable.

A Registry outage must not corrupt EVO's local passport authority or lose the registration job.

## Security requirements

- server-only Registry credentials;
- least-privilege service identity where supported;
- secret manager/KMS-backed storage;
- no credentials in GitHub, browser bundles or public Supabase tables;
- strict origin/auth checks on the EVO registration endpoint;
- audit log for every outbound registration attempt;
- bounded retries with backoff;
- request/response schema validation;
- sensitive-response redaction in logs;
- environment allowlist preventing accidental production writes from test builds;
- credential rotation procedure;
- incident-response runbook for Registry credential compromise.

## V4.2 implementation gates

### Gate 1 — Commission onboarding evidence

- create/use separate EU Login test identity as required by the Commission testing environment;
- enrol the test organisation;
- document organisation verification requirements;
- record the exact test-environment API/auth mechanism from current official documentation;
- do not copy reusable credentials into repository documentation.

### Gate 2 — offline contract layer

- implement versioned Registry payload schema fixtures;
- implement mapping from EVO battery passport to Registry metadata;
- add malformed/missing-field rejection tests;
- add idempotency tests;
- add environment-separation tests.

### Gate 3 — controlled test-environment integration

- one authorised test registration;
- capture registration identifier and evidence;
- repeat the same request and confirm idempotent behavior;
- test one expected validation failure;
- test temporary-error retry behavior if safely reproducible.

### Gate 4 — customer workflow

- show independent EVO and Registry states;
- provide clear registration evidence to the economic operator;
- never expose Registry secrets;
- never show `EU CERTIFIED` wording.

### Gate 5 — release readiness

- Security Gate green;
- Release Readiness green;
- dedicated Registry integration suite green;
- production credentials absent from repository and frontend bundle;
- independent review of production onboarding before enabling live Registry writes.

## NFC relationship

NFC is complementary and should remain a separate trust layer.

The EU battery passport requires a compliant data carrier/QR path. Secure NFC can add clone-resistance and physical binding for premium use cases, but it must not replace mandatory DPP carrier/identifier requirements unless the applicable legal/technical framework explicitly allows it.

For the NFC pilot, EVO continues to target genuine NXP NTAG 424 DNA / TagTamper using server-side SUN/SDM verification and unique per-tag keys.

## Commercial language

Allowed after test integration evidence exists:

- `EU DPP Registry integration tested`
- `Registry-ready workflow`
- `Supports Commission DPP Registry registration workflow`

Not allowed without independent basis:

- `EU Certified`
- `EU-approved DPP provider`
- `Battery Passport Certified`
- `Guaranteed EU compliance`

## Official sources

- Regulation (EU) 2023/1542, Articles 77–78.
- European Commission — Digital Product Passport Registry.
- European Commission — Digital Product Passport for Batteries.
- European Commission — DPP Registry User Guide for Economic Operators.
- European Commission — Digital Batteries Passport data points by category.
