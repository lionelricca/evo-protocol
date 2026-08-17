# EVO Information Security Policy — Draft V0.1

Target standard: ISO/IEC 27001:2022

## Purpose

EVO protects the confidentiality, integrity and availability of information required to operate Digital Product Passport and product-trust services.

## Principles

1. **Least privilege** — access is granted only to the minimum systems and data required for a role.
2. **No private-key custody by default** — customer wallet private keys are never collected or stored by EVO.
3. **Secrets stay server-side** — service credentials and future NFC authentication keys must never be embedded in public frontend code or repositories.
4. **Evidence is deterministic** — cryptographic evidence construction is reproducible and independent from AI analysis.
5. **AI cannot define cryptographic truth** — Guardian may analyze evidence but cannot modify Evidence Roots or accepted continuity history.
6. **Security before value movement** — token or asset-moving functionality requires explicit security review and test gates.
7. **Data minimization** — collect only information required for regulatory, security or service purposes.
8. **Open and exportable data** — DPP architecture must avoid unnecessary vendor lock-in.
9. **Traceability** — security-relevant changes and privileged actions must be attributable and auditable.
10. **Continuous improvement** — risks, controls, incidents and audit findings are reviewed and improved over time.

## Access control

- privileged accounts must use strong authentication;
- administrative access must be individually attributable;
- shared credentials are prohibited where individual accounts are available;
- access is reviewed periodically and removed promptly when no longer needed;
- production access should be separated from normal development access as the organization matures.

## Secure development

- code changes must be version controlled;
- security-sensitive logic should receive review before production deployment;
- dependencies should be pinned where practical and monitored for vulnerabilities;
- secrets must not be committed to source control;
- critical cryptographic formats must have deterministic test vectors;
- high-risk changes require documented test evidence.

## Cryptography

- approved modern cryptographic primitives shall be used;
- hashing currently uses SHA-256 for EVO evidence fingerprints;
- signatures are verified server-side where authorization depends on them;
- future NFC secrets require per-tag key separation and protected server-side storage;
- key rotation and revocation procedures must be documented before production secure-NFC deployment.

## Data handling

Information should be classified at minimum as:

- PUBLIC
- INTERNAL
- CONFIDENTIAL
- RESTRICTED

Sensitive customer data, credentials, secrets and key material must not be exposed through public APIs unless explicitly intended and risk-assessed.

## Logging and monitoring

EVO shall progressively maintain logs sufficient to investigate:

- authentication and privileged access;
- critical configuration changes;
- security-relevant API failures;
- continuity conflicts;
- replay attempts;
- signature verification failures;
- administrative data changes;
- future NFC verification anomalies.

Logs must avoid unnecessary personal data.

## Incident management

Security events are assessed according to severity. Material incidents require:

1. containment;
2. preservation of relevant evidence;
3. impact assessment;
4. remediation;
5. customer/regulatory communication where required;
6. post-incident review;
7. corrective action tracking.

## Supplier security

Material suppliers and cloud providers must be evaluated for:

- security capabilities;
- service availability;
- data handling;
- access boundaries;
- incident notification;
- dependency risk;
- exit/export options where material to DPP continuity.

## Business continuity

Critical services must have documented backup, restoration and continuity expectations. Recovery procedures must be tested periodically as the production service matures.

## Compliance

EVO will identify and track applicable legal, regulatory, contractual and standards-based obligations, including requirements related to Digital Product Passports, battery passports, privacy and information security.

## Responsibility

Management remains accountable for the ISMS. Security responsibilities may be delegated but accountability cannot be outsourced.

## Review

This policy must be reviewed at least annually and after significant security incidents, major architecture changes or major regulatory changes.
