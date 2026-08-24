# EVO Information Classification and Handling Standard — V0.1

Target alignment: ISO/IEC 27001:2022 readiness.

Status: internal handling standard. It does not replace legal/privacy advice and does not imply ISO certification.

## Purpose

Apply consistent protection to information according to business, security, regulatory and trust impact. Classification determines minimum handling expectations; a system may apply stronger controls where risk requires them.

## Classification levels

### PUBLIC

Information intentionally approved for unrestricted disclosure.

Examples:

- public EVO source/documentation;
- public DPP verification data intended by design;
- public identifiers, hashes and signatures where the product contract exposes them;
- published security/contact policy.

Minimum handling:

- integrity remains protected through version control/authoritative writes;
- publish only approved content;
- do not assume public information is safe to modify or impersonate;
- remove embedded secrets or personal data before publication.

### INTERNAL

Information intended for EVO operational use that would not normally create material harm if disclosed but should not be broadly published.

Examples:

- routine operational notes;
- non-sensitive architecture/configuration metadata;
- draft governance material;
- non-secret test evidence.

Minimum handling:

- share only for legitimate operational purposes;
- store in managed systems/accounts;
- do not publish by default;
- apply normal access control and retention discipline.

### CONFIDENTIAL

Information whose unauthorized disclosure, alteration or misuse could harm customers, EVO operations, procurement, privacy or security.

Examples:

- customer integration metadata;
- incident and audit working papers;
- privileged account inventory without passwords;
- supplier contracts/security evidence;
- payment reconciliation records;
- non-public operator/business data.

Minimum handling:

- access on need-to-know basis;
- authenticated managed storage;
- avoid copying into public repositories/issues/chats;
- encrypt in transit using provider-supported secure channels;
- redact before sharing externally;
- retain only as required for service, security, contract or law.

### RESTRICTED

Highest EVO-controlled classification. Unauthorized disclosure or alteration could directly compromise a root of trust, privileged administration, regulated obligations or customer security.

Examples:

- production service/administrative secrets;
- private API tokens;
- signing/private cryptographic keys controlled by EVO;
- NFC AES keys;
- account-recovery secrets;
- incident evidence containing live credentials or highly sensitive exploitation detail.

Minimum handling:

- approved provider secret store or specifically approved secure mechanism;
- no raw value in GitHub, source bundles, browser code, public tables, ordinary tickets or screenshots;
- strict least privilege;
- access/revocation/rotation evidence;
- redact from logs;
- do not create plaintext backup copies merely for convenience;
- rotate/revoke on suspected exposure.

### OUT OF SCOPE / PROHIBITED TO COLLECT

Information EVO deliberately refuses to custody under the current product model.

Examples:

- customer wallet seed phrases;
- customer wallet private keys;
- unrelated payment-card/bank credentials not required by the chosen payment provider integration.

Handling rule:

- do not request;
- do not store;
- if accidentally received, minimize further exposure, follow incident/privacy handling as appropriate and remove it safely from systems where permitted;
- never use prohibited information as a troubleshooting requirement.

## Classification assignment

The asset/information owner assigns classification based on:

- confidentiality impact;
- integrity impact;
- availability/business-continuity impact;
- legal/regulatory/contract requirements;
- authentication/cryptographic role;
- whether aggregation increases sensitivity.

If uncertain, use the higher reasonable classification until reviewed.

## Marking

Where practical, documents containing non-public information should identify their class in metadata/header or storage location conventions.

Do not embed classification labels inside cryptographic payloads or public standards data unless the schema explicitly supports/needs them.

## Handling matrix

| Activity | PUBLIC | INTERNAL | CONFIDENTIAL | RESTRICTED |
| --- | --- | --- | --- | --- |
| Public repository | Allowed if approved | Normally no | No | Never |
| Public issue/PR body | Allowed if approved | Avoid | No | Never |
| Managed internal/cloud storage | Allowed | Allowed | Allowed with access control | Only approved secure mechanism |
| Browser frontend bundle | Allowed | Only if intended | No sensitive fields | Never secrets |
| Logs | Allowed if useful | Minimize | Redact/minimize | Never raw secret values |
| External sharing | Unrestricted after approval | Need-based | Authorized/secure channel | Exceptional, explicit authorization and secure mechanism |
| Backups | As needed | Managed | Protected | Secret-specific recovery/rotation design; avoid plaintext copies |
| Disposal | Normal | Managed deletion | Secure deletion/retention process | Revoke/rotate + secure deletion where applicable |

## Public DPP nuance

A Digital Product Passport may intentionally expose selected technical/product data publicly while other data is restricted by access-right rules. Classification must be applied at field/data-set level where the regulatory model distinguishes public and restricted access.

Publishing a DPP field does not authorize arbitrary mutation. Integrity and provenance controls remain high or critical even when confidentiality is PUBLIC.

## Cryptographic evidence nuance

Hashes, public keys and signatures may be PUBLIC while the associated private key is RESTRICTED. Never infer that cryptographic material has one classification as a whole.

## NFC nuance

Public/proof layer may expose:

- tag identifier where approved;
- UID if product design accepts disclosure;
- read counter and non-secret verification state;
- tamper evidence state.

RESTRICTED:

- AES keys;
- administrative NFC secret;
- key-derivation inputs that are themselves secret;
- provisioning credentials.

No document, issue or test fixture may use a real production NFC key as a convenience sample.

## Incidents and vulnerability reports

Vulnerability reports can move from CONFIDENTIAL to RESTRICTED when they include:

- live credentials;
- exploit detail enabling immediate compromise;
- customer data;
- cryptographic secrets.

Use `.github/SECURITY.md` and `INCIDENT_RESPONSE.md`; public disclosure occurs only after appropriate review/coordination.

## Retention

A formal retention schedule remains to be approved as the commercial/legal operating model matures. Until then:

- minimize collection;
- retain security/audit evidence necessary to demonstrate authoritative history and incident response;
- do not delete regulated/contractual evidence solely to simplify storage;
- do not keep RESTRICTED material indefinitely without a documented reason;
- use provider/legal requirements to refine retention before enterprise contracts.

## Exceptions

A handling exception must record:

- information/classification;
- reason;
- compensating controls;
- owner/approver;
- expiry/review date.

No exception can authorize collecting customer seed phrases/private keys under the current product model.

## Review

Review at least annually and after material regulatory, architecture, customer-data or NFC key-management changes.
