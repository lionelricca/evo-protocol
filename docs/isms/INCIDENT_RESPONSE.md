# EVO Incident Response Procedure — V0.1

Target alignment: ISO/IEC 27001:2022 operational readiness.

Status: internal procedure for the current founder-led / pilot stage. This document is not a customer SLA and does not imply ISO certification.

## Purpose

Provide a repeatable process for identifying, containing, investigating, recovering from and learning from information-security incidents affecting EVO Protocol, its production services, customer evidence, payment flows or secure-NFC trust paths.

## Scope

Applies to:

- GitHub source, Actions and release evidence;
- Supabase databases, Edge Functions, logs and secrets;
- public EVO verification and issuance surfaces;
- wallet-signature and checkout flows;
- DPP data and registry integrations;
- NFC pilot keys, enrolled tag bindings and replay authority;
- administrator accounts, devices and credentials used to operate EVO;
- material third-party provider incidents that can affect EVO confidentiality, integrity or availability.

## Roles

### Incident Lead

The person accountable for coordinating the incident, decisions, timeline and closure. Until EVO has a dedicated security function, management performs this role.

### Technical Lead

Owns containment, forensic preservation, remediation and service recovery.

### Communications Owner

Owns customer, supplier, regulator and public communications when required. No public statement may overstate certainty before facts are established.

One person may temporarily perform multiple roles in the founder-led stage, but every material action must still be recorded.

## Severity model

### SEV-1 — Critical

Examples:

- confirmed exposure of production secrets, signing material or NFC keys;
- unauthorized privileged production access;
- manipulation or loss of authoritative evidence;
- unauthorized movement of customer funds attributable to EVO;
- material breach affecting multiple customers or regulated data;
- active compromise that cannot yet be contained.

### SEV-2 — High

Examples:

- exploitable production vulnerability with credible attack path;
- confirmed account compromise without evidence of wider material impact;
- significant service outage affecting authoritative operations;
- integrity failure in checkout, entitlement, replay or ownership authority.

### SEV-3 — Medium

Examples:

- security control failure with limited impact;
- isolated abuse or denial-of-service issue;
- misconfiguration without confirmed compromise;
- vulnerability requiring remediation but no active exploitation evidence.

### SEV-4 — Low / Observation

Examples:

- hardening opportunity;
- suspicious event that does not meet incident criteria after triage;
- low-impact dependency or configuration finding.

Severity may be raised or lowered as evidence changes. The reason for a severity change must be recorded.

## Response lifecycle

### 1. Detect and record

Create an incident record containing at minimum:

- incident ID;
- UTC detection time;
- reporter/source;
- affected systems;
- initial symptoms;
- preliminary severity;
- evidence locations;
- incident lead.

Do not place passwords, private keys, seed phrases, full tokens or raw restricted customer data in the incident record.

### 2. Triage

Determine:

- whether confidentiality, integrity or availability is affected;
- whether authoritative EVO evidence can still be trusted;
- whether payment/wallet/NFC paths are involved;
- whether the issue is ongoing;
- approximate blast radius;
- whether external reporting obligations may apply.

### 3. Contain

Use the minimum containment necessary to stop additional harm. Depending on the incident this can include:

- disable or redeploy an affected Edge Function;
- revoke/rotate a compromised secret;
- suspend a tag, issuer or privileged path;
- temporarily fail closed a write/verification action;
- revoke compromised sessions or credentials;
- pause a risky integration;
- disable a checkout path rather than accepting uncertain payment state.

Containment must not destroy evidence needed for investigation.

### 4. Preserve evidence

Preserve, when available:

- Git commit and workflow SHAs;
- Supabase deployment/function versions;
- relevant database rows and timestamps;
- Edge Function, auth, database and hosting logs;
- configuration snapshots;
- security-advisor output;
- payment-provider transaction/reference identifiers;
- NFC UID/counter/tag binding metadata, excluding secret keys;
- hashes of exported evidence files.

Use read-only collection where practical. Record all production mutations made during containment.

### 5. Eradicate and remediate

Remove the root cause, which can include:

- patching code;
- changing access control;
- rotating secrets;
- correcting RLS/ACLs;
- invalidating compromised credentials or bindings;
- adding regression tests;
- updating dependencies;
- changing procedures or supplier controls.

Security-sensitive fixes must pass the normal EVO gates before promotion unless an emergency change is necessary to contain active harm. Emergency changes require retrospective review and permanent regression coverage.

### 6. Recover

Before returning an affected authoritative path to normal operation, verify:

- expected code/deployment version;
- database authority and RLS/ACL state;
- relevant security tests;
- secret/key state;
- known-bad sessions/tags/tokens have been revoked where applicable;
- monitoring shows no immediate recurrence.

Recovery evidence must be attached to or referenced by the incident record.

### 7. Communicate

Notify affected parties when contract, law, regulation, material risk or supplier obligation requires it.

Communications must distinguish:

- confirmed facts;
- current impact assessment;
- containment already completed;
- actions still under investigation.

Do not claim legal/regulatory notification obligations have been satisfied without verifying the applicable jurisdiction and facts.

### 8. Post-incident review

For SEV-1 and SEV-2 incidents, and for recurring SEV-3 incidents, record:

- root cause;
- timeline;
- what detected the issue;
- what contained it;
- customer/regulatory impact;
- corrective actions;
- owner and due date for each corrective action;
- required test/policy/risk-register updates.

Close an incident only when corrective actions are accepted, transferred to tracked work or explicitly risk-accepted by management.

## Special handling

### Wallets and payments

- Never request seed phrases/private keys during support or investigation.
- Do not move funds as a diagnostic step.
- Preserve transaction hashes/provider references rather than secrets.
- If payment state is ambiguous, fail closed and reconcile before granting irreversible value.

### NFC

- Treat suspected exposure of any NFC AES key as RESTRICTED.
- Revoke/disable affected profiles before generating replacement keys.
- Never paste NFC keys into GitHub issues, PRs, logs or public incident reports.
- `physicalPilotApproved` must not be restored until the replacement tag/profile passes the required pilot evidence.

### Evidence integrity

If authoritative evidence may have been altered, public verification must not silently continue to present it as trusted. The affected trust path must fail closed or explicitly expose the degraded state until integrity is re-established.

## Evidence template

Every material incident should retain:

```text
incident_id=
detected_at_utc=
severity=
incident_lead=
affected_systems=
confidentiality_impact=
integrity_impact=
availability_impact=
containment_actions=
evidence_refs=
root_cause=
recovery_validation=
notifications=
corrective_actions=
closed_at_utc=
```

## Testing and review

- Run a tabletop incident exercise before an external ISO/IEC 27001 certification audit.
- Repeat after major architecture changes or a material incident.
- Review this procedure at least annually.
- Exercise results are evidence; this procedure by itself is not evidence that incident response has been tested.
