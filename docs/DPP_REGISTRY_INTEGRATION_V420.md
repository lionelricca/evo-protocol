# EVO V4.2/V4.3 — EU DPP Registry Integration

Status: adapter implemented fail-closed / test-environment first / no production Registry credentials / external battery semantic blocker active

## Objective

Connect EVO Battery Passport to the European Commission Digital Product Passport Registry through a server-side integration that preserves EVO's decentralised passport data model and never exposes Registry credentials to browser JavaScript.

The EU Registry is an authoritative index/registration layer. It stores registration data and identifiers; the complete DPP data remains hosted by the economic operator or its authorised DPP service provider.

## Current external state — 24 August 2026

- The EU DPP Registry and its testing environment have been operational since 20 July 2026.
- The Commission supports registration through its user interface and states that API registration is part of the Registry architecture.
- The current Economic Operator User Guide is v1.01, last published 28 July 2026.
- A verified economic operator organisation is required before DPPs can be registered.
- Organisation verification uses an EC-sealed PDF declaration that must be countersigned/sealed offline with a **QES or QSeal from a Qualified Trust Service Provider (QTSP)**.
- The test environment is separate from production, requires a different EU Login, and uses the same organisation verification requirements.
- For Batteries, the current UI exposes item-level registration. Model and batch identifiers are optional metadata for the item.
- The UPI is mandatory, URL-based, HTTPS, and the current guide states a 50-character maximum.
- File upload accepts JSON or XML and supports a maximum batch of **100** DPP registration requests.
- A request receives a **correlation ID**; successful outcomes expose the corresponding UPI and Registry-generated URI.
- If one DPP in a multi-DPP submission fails validation, the whole submission is rejected.
- **Critical external blocker:** the Commission guide states that successful Battery DPP registration is not currently available because the battery semantic catalogue/content is still under development. EVO cannot truthfully claim a completed Battery Registry E2E until the Commission enables that semantic layer.
- Six of eight harmonised DPP standards are published/referenced; remaining standards and battery access-right implementation details remain tracked dependencies.
- Battery passports become mandatory on 18 February 2027 for LMT batteries, EV batteries and industrial batteries above 2 kWh within scope.

## Trust boundary

```text
Browser / customer UI
        |
        | EVO authenticated workflow
        v
EVO server authority
        |
        | validated + authorised registration job
        v
EVO DPP Registry adapter
        |
        | future Commission API contract / credentials
        v
EU DPP Registry TEST
```

Rules:

1. Registry credentials never enter browser JavaScript.
2. EU Login passwords or reusable personal credentials are never stored by EVO.
3. Registry writes require an authorised economic-operator context.
4. A successful EVO passport creation does not imply successful EU Registry registration.
5. Registry registration does not imply product conformity or certification.
6. Test and production Registry environments remain separated.
7. Live Registry submission stays disabled until the official Battery semantic schema and API/auth contract are captured and validated.

## Implemented V4.3 adapter

Repository function: `supabase/functions/evo-dpp-registry/index.ts`

Current actions:

- `status` — exposes non-sensitive integration readiness and external blockers;
- `validate` — validates one record or a batch using current public Registry constraints;
- `prepare` — generates one deterministic EVO internal registration envelope;
- `batch_prepare` — generates an envelope for up to 100 unique UPI records;
- `submit` — **fails closed** until the official API contract is pinned and Battery registration is actually enabled by the Commission.

Security properties:

- intended deployment with Supabase `verify_jwt=true`;
- privileged actions require server secret `EVO_DPP_ADMIN_SECRET`;
- no wildcard browser CORS;
- HTTPS-only UPI validation;
- obvious localhost/private UPI targets rejected before external use;
- non-standard URL ports rejected;
- duplicate UPI values rejected inside a batch;
- request body bounded;
- deterministic SHA-256 request fingerprint;
- no Commission credentials, tokens or keys committed to the repository;
- no live external `fetch` submission path exists yet.

The generated envelope deliberately declares:

`commissionSubmissionCompatibility: NOT_CLAIMED`

It is an EVO preparation/audit object, **not** a substitute for the Commission JSON/XML template or API schema.

## Future protected server model

When live/test submission becomes possible, use a protected table such as `evo_dpp_registry_registrations` with fields including:

- `id`
- `passport_id`
- `passport_version_id`
- `economic_operator_id`
- `registry_environment`
- `registry_uri`
- `registry_status`
- `correlation_id`
- `request_fingerprint`
- `registered_at`
- `last_checked_at`
- `proof_reference`
- `response_fingerprint`
- `attempt_count`
- `last_error_code`
- `created_at`
- `updated_at`

Do not store reusable Registry access tokens, EU Login credentials or QES/QSeal private material in this table.

## Registration state machine

```text
NOT_REGISTERED
      |
      v
LOCAL_READY
      |
      +---- external semantic/API blocker ----> WAITING_FOR_EU_ENABLEMENT
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

Manual/terminal states:
- REJECTED
- IDENTITY_REVIEW
- SCHEMA_REVIEW
- WITHDRAWN / REVOKED when supported by the applicable Registry workflow
```

## Idempotency

Every outbound registration must use a deterministic request fingerprint derived from the controlled registration payload and exact EVO passport/version identity.

Before future submission:

1. verify that the passport version is still authoritative;
2. verify that the economic operator is authorised and Registry-verified;
3. check the protected registration table for the same fingerprint;
4. if a successful registration already exists, return the existing URI/evidence instead of writing again;
5. if a previous attempt is retryable, preserve the original audit chain;
6. capture the Commission correlation ID for each external request.

## Commission mapping boundary

The exact Commission JSON/XML template and API request contract must be captured from the current Registry/test environment once Battery semantic registration is enabled.

```text
EVO Battery Passport
        ↓
versioned DPP semantic mapper
        ↓
EVO deterministic Registry envelope
        ↓
Commission Battery schema mapper (PENDING)
        ↓
Commission API/file submission adapter (PENDING)
```

Do not guess field names or silently map EVO data into an unverified external schema.

## Registration evidence

After a successful future Registry request EVO must retain, as applicable:

1. Commission correlation ID;
2. returned Registry URI;
3. exact UPI registered;
4. product group and granularity;
5. response/evidence fingerprint;
6. timestamp and environment;
7. secure proof-of-registration reference/document where made available.

Customer language must distinguish `EVO PASSPORT CREATED` from `REGISTERED IN EU DPP REGISTRY`.

## Failure policy

Never silently convert Registry failure into success. Multi-record file submission should be treated atomically because the current Commission guide states that one invalid DPP causes the complete submission to be rejected.

Customer-facing states should distinguish:

- EVO passport created;
- waiting for Commission Battery semantic enablement;
- Registry registration pending;
- Registry registered;
- Registry rejected/review required;
- Registry temporarily unavailable.

## Implementation gates

### Gate 1 — code/offline preparation — IMPLEMENTED

- server-only fail-closed adapter;
- current UPI/batch constraints captured;
- deterministic request fingerprints;
- no browser Registry secrets;
- dedicated regression test and workflow.

### Gate 2 — Commission organisation onboarding — EXTERNAL

- create/use separate EU Login for TEST;
- enrol the economic operator;
- obtain and sign/seal the EC declaration using valid QES/QSeal from a QTSP;
- complete Commission verification;
- retain verification evidence outside public repository code.

### Gate 3 — Battery semantic/API contract — EXTERNAL

- Commission enables successful Battery registration;
- capture current JSON/XML template and semantic catalogue version;
- capture documented API authentication and endpoints;
- version and hash the contract fixtures used by EVO;
- update adapter from `NOT_CLAIMED` to a specifically tested schema version only after evidence exists.

### Gate 4 — controlled TEST integration — EXTERNAL + EVO

- one authorised Battery registration in TEST;
- capture correlation ID and returned URI;
- repeat the same local fingerprint and confirm EVO idempotency;
- reproduce one safe validation failure;
- record evidence pack.

### Gate 5 — production enablement — NOT YET ALLOWED

- independent review of Registry credentials/roles;
- protected audit table and retention policy;
- rollback/incident procedure;
- production environment allowlist;
- explicit release approval;
- no `EU Certified` or equivalent claim.

## NFC relationship

NFC remains complementary. The mandatory DPP data-carrier/identifier path must satisfy the applicable EU framework. Secure NFC can add clone-resistance and physical-binding evidence for premium products but does not replace regulatory DPP registration.

The physical pilot continues to target genuine NXP NTAG 424 DNA / TagTamper, using server-side cryptographic verification and unique per-tag keys.

## Commercial language

Allowed now:

- `EU DPP Registry-ready architecture`
- `Battery Passport readiness and Registry preparation`
- `Server-side Registry integration prepared`

Allowed only after observed TEST evidence:

- `EU DPP Registry integration tested`
- `Successfully tested against the Commission Registry`

Not allowed without an independent legal/certification basis:

- `EU Certified`
- `EU-approved DPP provider`
- `Battery Passport Certified`
- `Guaranteed EU compliance`

## Official sources tracked

- Regulation (EU) 2023/1542, Articles 77–78.
- European Commission — Digital Product Passport Registry.
- European Commission — DPP Registry User Guide for Economic Operators, v1.01, 28 July 2026.
- European Commission — Digital Product Passport for Batteries / data points by category.
- Commission Implementing Decision (EU) 2026/1736 on harmonised DPP standards.
