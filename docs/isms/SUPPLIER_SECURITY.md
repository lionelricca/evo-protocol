# EVO Supplier Security Procedure — V0.1

Target alignment: ISO/IEC 27001:2022 operational readiness.

Status: internal procedure. This document does not certify or endorse any supplier and does not imply that every supplier review has already been completed.

## Objective

Ensure that third parties which can affect EVO confidentiality, integrity, availability, regulated DPP continuity or roots of trust are identified, risk-ranked, reviewed and exited safely when necessary.

## Material suppliers

A supplier is material when loss, compromise or misconfiguration could materially affect EVO. Current categories include:

- source control / CI/CD provider;
- production database / Edge Function provider;
- hosting and DNS/domain providers;
- payment providers;
- wallet/RPC infrastructure where used;
- email/account-recovery providers for privileged administration;
- future EU DPP Registry identity/integration providers;
- future QES/QSeal/QTSP providers if regulated signing claims are offered;
- NFC tag/chip suppliers and provisioning tooling;
- independent security/pentest and certification providers.

## Supplier inventory fields

For every material supplier record:

```text
supplier=
service=
owner=
data_classes=
privileged_access=yes|no
trust_authority_impact=low|medium|high
availability_impact=low|medium|high
subprocessors_or_dependencies_known=
contract_or_terms_ref=
security_evidence_ref=
exit_method=
last_review_date=
next_review_date=
residual_risk=
```

Do not store provider passwords, API secrets or private keys in this inventory.

## Initial due diligence

Review proportionate to risk:

- authentication/MFA and administrator controls;
- encryption and secret-management capabilities;
- access boundaries and tenant isolation where relevant;
- audit/logging capabilities;
- backup/recovery options;
- incident/security notification terms;
- vulnerability/security practices;
- service availability/status mechanisms;
- data location/processing implications where material;
- export/exit capabilities;
- subcontractor/subprocessor reliance where relevant;
- current independent certifications/attestations only when verified from authoritative evidence.

Do not treat a marketing badge as proof of a specific control without checking scope and validity.

## Risk tiers

### High

Supplier can change authoritative production state, access RESTRICTED secrets/data, affect payment entitlement, or become a single point of failure for EVO trust authority.

High-risk suppliers require documented review before enterprise high-assurance use and after material service/security changes.

### Medium

Supplier affects important operations or internal/confidential data but not a direct root of trust.

### Low

Replaceable service with limited access and low impact.

## Contract and responsibility boundaries

For material suppliers identify:

- which security controls belong to EVO;
- which controls belong to the supplier;
- which are shared responsibilities;
- who must notify whom after incidents;
- how data/configuration can be exported or deleted;
- what evidence EVO can obtain for audit.

Using a certified cloud provider does not make EVO ISO-certified.

## Change monitoring

Reassess a material supplier when:

- there is a material security incident;
- service terms/security architecture materially change;
- EVO increases the sensitivity/volume of data processed there;
- a new regulated claim depends on the supplier;
- a critical feature is deprecated;
- an audit/pentest identifies supplier-related risk.

## Exit and continuity

For every High-risk supplier, define a realistic exit/recovery path. It may include:

- export authoritative data in open formats;
- preserve source/release hashes;
- rotate provider-specific secrets;
- redeploy code to an alternative environment;
- update DNS/configuration;
- reconcile authoritative event history;
- preserve legal/audit evidence required after termination.

An exit plan is not considered tested until a representative export/restore or migration exercise has been performed.

## Special supplier classes

### GitHub / source-control and Actions

- protect the default branch when repository administration allows;
- keep security-sensitive Actions pinned to immutable SHAs;
- preserve release/SBOM evidence linked to exact source commits;
- maintain account recovery and MFA controls.

The currently unprotected `main` branch remains a known supplier/configuration risk until GitHub ruleset/branch protection is actually enabled.

### Supabase / production authority

- RLS/ACL/security-definer controls remain EVO responsibility;
- verify production deployment versions and Security Advisor output;
- confirm backup/recovery capability against the active plan before promising RPO/RTO externally;
- keep service/NFC secrets in server-side secret mechanisms rather than database public tables or source.

### Payment providers

- provider settlement does not replace EVO entitlement/idempotency validation;
- never log private payment credentials;
- define reconciliation and refund/dispute responsibility before commercial scale.

### NFC hardware suppliers

- use genuine/reputable supply paths for physical-pilot evidence;
- record tag/chip model and provenance where practical;
- do not approve a physical NFC claim solely because the supplier says a tag is genuine;
- verify UID, cryptography, replay and tamper behavior on actual provisioned hardware.

### Certification and assurance suppliers

- certification bodies and implementation consultants should remain independent where required for credibility;
- verify accreditation/scope before contracting;
- a pentest provider report must identify tested scope and limitations.

## Review cadence

- High-risk suppliers: at least annually and after material events;
- Medium-risk suppliers: periodically based on risk;
- Low-risk suppliers: on significant change or renewal.

Before an ISO/IEC 27001 certification audit, ensure the material supplier inventory and evidence references are current.
