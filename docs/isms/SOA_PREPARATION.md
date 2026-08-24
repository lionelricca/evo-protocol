# EVO Statement of Applicability Preparation Method — V0.1

Target: prepare EVO for a formal ISO/IEC 27001:2022 Statement of Applicability (SoA).

Status: **preparation method only**. This document is not the formal SoA, does not reproduce ISO control text, and does not imply ISO/IEC 27001 certification.

## Why this document exists

A certification-ready SoA must be based on:

- the approved ISMS scope;
- current risk assessment and treatment decisions;
- legal, regulatory, contractual and business requirements;
- the applicable ISO/IEC 27001:2022 control reference set from an authorised/licensed copy of the standard;
- actual implementation and operating evidence.

EVO will not fabricate control descriptions from memory or treat a generic internet checklist as the authoritative standard.

## Source rule

When formal SoA work begins, use an authorised current copy of ISO/IEC 27001:2022 and the organisation's approved risk-treatment process.

This repository may record:

- control identifier;
- short internal control label/paraphrase;
- applicability decision;
- reason for inclusion/exclusion;
- implementation status;
- evidence references;
- control owner;
- review date.

Do not copy substantial copyrighted ISO control text into the public repository.

## Required SoA fields

Each formal SoA row should contain at minimum:

```text
control_id=
internal_control_label=
applicable=yes|no
applicability_reason=
risk_or_requirement_refs=
implementation_status=planned|documented|implemented|operating|independently_assured
control_owner=
evidence_refs=
exceptions_or_gaps=
last_reviewed=
```

## Decision process

For each reference control:

1. confirm it is within the current licensed standard/control set;
2. identify relevant EVO risks, obligations or business requirements;
3. decide whether it is applicable to the defined ISMS scope;
4. document the reason for applicability or justified exclusion;
5. map the control to existing EVO policy/procedure/technical evidence;
6. distinguish design/implementation from real operating evidence;
7. create treatment work for missing evidence or implementation;
8. assign accountable owner;
9. approve through management before presenting it as the formal SoA.

## Current EVO evidence sources available for future mapping

### Governance and risk

- `docs/isms/ISMS_SCOPE.md`
- `docs/isms/INFORMATION_SECURITY_POLICY.md`
- `docs/isms/RISK_REGISTER.md`
- `docs/isms/CONTROL_EVIDENCE_INDEX.md`

### Asset and information management

- `docs/isms/ASSET_AND_INFORMATION_INVENTORY.md`
- `docs/isms/INFORMATION_CLASSIFICATION_AND_HANDLING.md`

### Operational security

- `docs/isms/ACCESS_AND_SECRET_MANAGEMENT.md`
- `docs/isms/INCIDENT_RESPONSE.md`
- `docs/isms/BACKUP_AND_CONTINUITY.md`
- `docs/isms/VULNERABILITY_MANAGEMENT.md`
- `docs/isms/SUPPLIER_SECURITY.md`

### Secure development and technical authority

- `docs/SECURITY.md`
- GitHub PR history and required CI gates;
- Release Readiness and Security Gate;
- DPP Registry, NFC Crypto, NFC Authority, SBOM and ISMS gates;
- deterministic cryptographic/regression tests;
- production RLS/ACL and Security Advisor evidence;
- release bundles, source commit hashes and SBOM artifacts.

### Public disclosure and vulnerability intake

- `.github/SECURITY.md`

## Current high-confidence applicable areas

Without attempting to reproduce the formal Annex A wording, EVO's scope and risks clearly make controls in these internal areas relevant:

- information-security policies and responsibilities;
- asset ownership and information classification;
- identity, authentication, privileged access and least privilege;
- supplier/cloud security;
- incident management and evidence preservation;
- business continuity, backup and restore;
- secure development/change management;
- vulnerability and configuration management;
- logging/monitoring;
- cryptography and key/secret management;
- data protection and controlled deletion/retention;
- cloud/service availability;
- separation of development/production responsibilities as the organisation matures;
- physical/endpoint protection for administrator devices;
- independent assurance and audit activities.

The final applicability decision must still be made against the authorised standard and actual organisational context.

## Known gaps to resolve before formal approval

The future SoA must not hide these current gaps:

- GitHub `main` is not yet protected with branch/ruleset enforcement;
- privileged account/MFA review evidence is not yet collected as a formal register;
- material supplier reviews have not yet built an operating history;
- database/source recovery exercises have not yet produced measured evidence;
- incident-response tabletop evidence is pending;
- public clean-browser production E2E is pending;
- controlled paid checkout E2E is pending;
- physical NFC TagTamper pilot is pending;
- independent penetration/security review is pending;
- internal audit and management review are pending;
- certification-body Stage 1/Stage 2 audits have not occurred.

## Exclusion discipline

A control cannot be marked non-applicable merely because:

- the organisation is small;
- a cloud supplier performs part of the control;
- implementation is inconvenient;
- the control is currently missing.

If a supplier performs a control, EVO must still document the shared-responsibility boundary and evidence relied upon.

A missing applicable control is a gap/treatment item, not an exclusion.

## Evidence maturity

Use the evidence levels from `CONTROL_EVIDENCE_INDEX.md`:

- E0 — Planned
- E1 — Documented
- E2 — Implemented
- E3 — Operating evidence
- E4 — Independently assured

Formal audit readiness should favor E3 evidence for controls expected to operate repeatedly. E1 documentation alone is insufficient proof that a control is effective.

## Formalisation gate

Do not rename this file to `STATEMENT_OF_APPLICABILITY.md` or claim that EVO has an approved SoA until all of the following are true:

1. authorised ISO control source reviewed;
2. risk register/treatments current;
3. every reference control assessed for applicability;
4. reasons and evidence references completed;
5. gaps/treatments tracked;
6. management formally reviews/approves the SoA;
7. approved version/date/owner are recorded.

## Review

Update this preparation method when the ISMS scope, standard edition/amendments, certification route or major architecture materially changes.
