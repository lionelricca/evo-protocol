# EVO Asset and Information Inventory — V0.1

Target alignment: ISO/IEC 27001:2022 readiness.

Status: initial ISMS inventory for the V4.6 operating baseline. This is a management record, not certification evidence by itself. Secret values, passwords, private keys, seed phrases and raw NFC AES keys must never be placed in this file.

## Ownership model

Until dedicated roles exist, **EVO Management** is the accountable asset owner for shared production assets. Technical operation may be delegated, but accountability and review remain explicit.

Asset owners are responsible for:

- classification;
- approved use;
- access expectations;
- retention/recovery expectations;
- supplier dependencies;
- lifecycle/retirement decisions;
- evidence that required controls operate.

## Asset register

| ID | Asset / service | Type | Primary owner | Information handled | Criticality | Current boundary / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| A-001 | `lionelricca/evo-protocol` GitHub repository | Source / configuration / evidence | EVO Management | PUBLIC, INTERNAL, CONFIDENTIAL metadata; no production secrets | HIGH | Git history, PRs, CI, release evidence; `main` protection remains a known configuration gap |
| A-002 | GitHub Actions workflows | CI/CD / assurance | EVO Management | Source, test fixtures, generated evidence | HIGH | Security, Release, NFC, DPP, SBOM and ISMS gates; Actions pinned by SHA where implemented |
| A-003 | EVO source release bundle + manifests | Release evidence | EVO Management | PUBLIC/INTERNAL source evidence | HIGH | Exact source SHA and SHA-256 release artifacts |
| A-004 | SPDX SBOM artifacts | Supply-chain evidence | EVO Management | PUBLIC/INTERNAL dependency metadata | MEDIUM | `EVO SBOM checks`, SHA-256 artifact evidence |
| A-005 | Supabase production project | Production cloud authority | EVO Management | PUBLIC through RESTRICTED data depending on table/secret store | CRITICAL | Database, Auth/Edge Functions, logs, RLS/ACLs, Security Advisor |
| A-006 | Production PostgreSQL database | Authoritative data store | EVO Management | Product/DPP records, lifecycle, ownership, audit, NFC binding metadata | CRITICAL | RLS, privileged RPCs, atomic authority tests; no AES keys in public NFC table |
| A-007 | Supabase Edge Functions | Server-side application authority | EVO Management | User inputs, signatures, identifiers, payment/NFC/DPP metadata | CRITICAL | Versioned deployments, CORS/custom authorization, CI syntax/security tests |
| A-008 | Supabase secret environment | Secret store | EVO Management | RESTRICTED service secrets and future/pilot NFC keys | CRITICAL | Server-side only; raw values intentionally absent from repository/inventory |
| A-009 | Public EVO web surface / GitHub Pages deployment | Customer-facing application | EVO Management | PUBLIC verification data and browser inputs | HIGH | Root entry/navigation/browser-security tests; clean-browser live evidence still pending |
| A-010 | Domain/DNS configuration used by EVO | Availability / identity | EVO Management | INTERNAL configuration | HIGH | Supplier/configuration asset; exact provider/config must be retained in operational inventory when production domain is fixed |
| A-011 | Wallet-signature integration | Customer identity/authorization interface | EVO Management | Public wallet addresses, signed messages, nonces | HIGH | EVO never owns customer seed phrases/private keys; server-side validation for authoritative actions |
| A-012 | Checkout/payment integration | Commercial transaction interface | EVO Management | Payment references, entitlement state, wallet/address metadata | HIGH | Payment verification/idempotency tests; controlled real paid E2E still pending |
| A-013 | EVO DPP Registry adapter | Regulatory integration component | EVO Management | DPP identifiers, UPI, operator/integration metadata | HIGH | Fail-closed server adapter; Commission Battery semantic/API completion remains external |
| A-014 | EU DPP Registry / EU Login dependency | External regulated supplier/interface | External + EVO shared responsibility | Organisation identity, registration metadata | HIGH | Registry operational; onboarding requires external identity/QES-QSeal process; EVO not yet claimed enrolled |
| A-015 | EVO secure NFC verifier | Physical-evidence verification service | EVO Management | UID, counters, encrypted SDM input, tag/seal binding | CRITICAL | NTAG 424 DNA/TagTamper crypto + atomic replay authority; physical pilot remains pending |
| A-016 | NFC pilot/production key material | Cryptographic secret | EVO Management | RESTRICTED AES/key material | CRITICAL | Per-tag/diversified target, server-side only, separate from public binding table |
| A-017 | Physical NTAG 424 DNA / TagTamper devices | Physical trust asset | EVO Management / provisioning operator | UID, counters, tamper state, provisioned cryptographic state | CRITICAL | No production physical tags enrolled/approved yet; genuine hardware pilot required |
| A-018 | CI/test fixtures and NXP cryptographic vectors | Engineering assurance | EVO Management | PUBLIC/INTERNAL non-secret vectors | HIGH | Deterministic regression evidence; must never be confused with real tag keys/results |
| A-019 | Security/ISMS documentation | Governance evidence | EVO Management | INTERNAL and PUBLIC policy metadata | HIGH | Scope, risk register, procedures, evidence index, disclosure policy |
| A-020 | Incident / audit / exercise records | Governance and forensic evidence | EVO Management | INTERNAL, CONFIDENTIAL or RESTRICTED depending on content | HIGH | Must be stored without raw secrets and retained according to future approved retention schedule |
| A-021 | Privileged administrator identities | Identity / access asset | EVO Management | CONFIDENTIAL account metadata; recovery data may be RESTRICTED | CRITICAL | Named accounts, MFA where available, quarterly review target |
| A-022 | Administrator workstations / browsers | Endpoint asset | Individual operator + EVO Management | Potential access to privileged sessions | HIGH | In ISMS physical/remote boundary; endpoint hardening evidence must mature before certification |
| A-023 | Supplier contracts/terms/security evidence | Supplier governance | EVO Management | INTERNAL/CONFIDENTIAL | MEDIUM | Supplier Security procedure; material supplier register/reviews still need operating evidence |
| A-024 | Independent pentest/audit reports | Assurance evidence | EVO Management | CONFIDENTIAL/RESTRICTED | HIGH | Not yet available; required before high-assurance enterprise claims |
| A-025 | ISO certification records / formal SoA | Certification governance | EVO Management | INTERNAL/CONFIDENTIAL with selected public certificate metadata | HIGH | Not yet available; formal certification program remains pending |

## Information inventory

| ID | Information set | Typical classification | Integrity need | Availability need | Notes |
| --- | --- | --- | --- | --- | --- |
| I-001 | Public DPP / product identity fields | PUBLIC | HIGH | HIGH | Public by design does not mean editable by anyone |
| I-002 | EVO Seal / passport identifiers | PUBLIC | CRITICAL | HIGH | Identifiers anchor verification and history |
| I-003 | Evidence hashes / roots / signatures | PUBLIC or INTERNAL | CRITICAL | HIGH | Integrity is the primary security property |
| I-004 | Ownership and lifecycle history | PUBLIC/CONFIDENTIAL depending on field | CRITICAL | HIGH | Authoritative mutation requires controlled workflows |
| I-005 | Issuer/operator identity evidence | PUBLIC through CONFIDENTIAL | HIGH | MEDIUM | Trust levels must remain distinguishable |
| I-006 | Customer integration/config metadata | CONFIDENTIAL | HIGH | MEDIUM | Minimize collection and public exposure |
| I-007 | Security/operational logs | INTERNAL/CONFIDENTIAL | HIGH | MEDIUM | May contain identifiers; avoid unnecessary personal data |
| I-008 | Incident/forensic evidence | CONFIDENTIAL/RESTRICTED | CRITICAL | MEDIUM | Preserve chain/context without copying secrets unnecessarily |
| I-009 | Privileged access inventory | CONFIDENTIAL | CRITICAL | MEDIUM | Store account/role evidence, not passwords |
| I-010 | Service/API secrets | RESTRICTED | CRITICAL | HIGH | Provider secret store only |
| I-011 | NFC AES key material | RESTRICTED | CRITICAL | HIGH | Must never enter public repository/browser/table |
| I-012 | Customer wallet private keys / seed phrases | OUT OF SCOPE / PROHIBITED TO COLLECT | CRITICAL | N/A | EVO must not request, custody or inventory these values |
| I-013 | Payment references / entitlement records | CONFIDENTIAL | CRITICAL | HIGH | Needed for reconciliation/idempotency; no unnecessary card/bank secrets |
| I-014 | DPP Registry credentials / QES-QSeal private material | RESTRICTED if ever controlled by EVO | CRITICAL | HIGH | Do not store personal EU Login passwords or qualified-signature private material unless a future architecture explicitly requires and governs it |
| I-015 | Source code and public documentation | PUBLIC | HIGH | HIGH | Public visibility does not reduce supply-chain integrity requirements |
| I-016 | Risk, audit and certification working papers | INTERNAL/CONFIDENTIAL | HIGH | MEDIUM | Some evidence may be selectively shared under NDA |

## Classification rules

This inventory uses the handling scheme defined in `INFORMATION_CLASSIFICATION_AND_HANDLING.md`:

- PUBLIC
- INTERNAL
- CONFIDENTIAL
- RESTRICTED
- OUT OF SCOPE / PROHIBITED TO COLLECT where EVO intentionally refuses custody.

When an information set contains fields of different sensitivity, apply the highest relevant classification unless fields are technically separated with explicit controls.

## Lifecycle rules

For each critical asset:

1. identify creation/onboarding evidence;
2. define approved access and use;
3. track material configuration changes;
4. define backup/export/restore expectations where applicable;
5. revoke/rotate credentials on role/provider change;
6. export or preserve required evidence before retirement;
7. securely delete/revoke sensitive material when no longer required and when legal/contractual retention permits.

## Known gaps retained deliberately

This register does not mark the following as complete:

- protected `main` branch/ruleset;
- live clean-browser E2E evidence;
- controlled paid checkout E2E;
- real physical NFC provisioning/pilot;
- measured backup/restore RPO/RTO;
- complete privileged account review evidence;
- complete material supplier review evidence;
- independent pentest;
- formal Statement of Applicability;
- internal audit and management review;
- ISO/IEC 27001 certification.

## Review

Review at least quarterly during certification preparation and after major architecture, supplier, regulated-market or physical-NFC changes. New production systems or material information sets must be added before they are treated as covered by the ISMS.
