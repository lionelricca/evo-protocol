# EVO Backup, Restore and Business Continuity Procedure — V0.1

Target alignment: ISO/IEC 27001:2022 operational readiness.

Status: internal procedure for current pilot/early-production operations. Targets below are internal planning targets, not customer SLA commitments and not proof that recovery has already been tested.

## Objectives

- preserve authoritative evidence and configuration needed to recover EVO;
- avoid treating one cloud provider or one administrator account as the only copy of critical information;
- define what must be restorable before commercial high-assurance claims;
- require actual restore tests rather than assuming backups work.

## Criticality tiers

### Tier 0 — Trust authority

Examples:

- production database schemas and authoritative records;
- ownership/transfer authority;
- Service Proof and Reality Continuity authority;
- NFC tag/UID/Seal/replay bindings;
- configuration required to validate evidence;
- production secret inventory metadata, excluding secret values from normal backups.

Loss or corruption can affect integrity of EVO trust claims.

### Tier 1 — Production service

Examples:

- Edge Function source/deployment definitions;
- public verification/issuance surfaces;
- DPP integration configuration;
- checkout and entitlement logic;
- CORS/security configuration.

### Tier 2 — Audit and engineering evidence

Examples:

- Git history;
- CI logs/artifacts;
- release manifests/SBOMs;
- policies, risk register and incident evidence.

### Tier 3 — Replaceable/non-authoritative material

Examples:

- caches;
- rebuildable local working files;
- non-authoritative generated previews.

## Recovery objectives

The current internal pilot targets are:

- Tier 0: target RPO <= 24 hours and target RTO <= 8 hours;
- Tier 1: target RPO <= 24 hours and target RTO <= 8 hours;
- Tier 2: target RPO <= 24 hours and target RTO <= 24 hours.

These targets must be replaced with measured values after restore exercises. Do not publish them as customer SLA values unless contractually approved and operationally demonstrated.

## Backup strategy

### Source and configuration

GitHub is the authoritative source history for repository-managed code and documents. Critical release evidence must be reproducible from a specific commit SHA and CI run.

Where a provider configuration is not represented in Git, maintain a documented inventory of the configuration and the authoritative console/project that owns it.

### Database

Production database recovery must rely on supported Supabase/Postgres backup/recovery capabilities appropriate to the active plan, plus export procedures where necessary for independent evidence or migration.

Do not state that point-in-time recovery or a particular retention period exists unless verified against the active production plan.

### Secrets

Raw production secrets and NFC AES keys must not be copied into ordinary repository backups or documentation exports.

Continuity planning for secrets means preserving:

- secret identifier/purpose;
- owner;
- authoritative secret store/provider;
- rotation/recovery procedure;
- dependent services.

If a secret value cannot be recovered safely, the recovery procedure is to rotate and re-establish it, not to keep plaintext backup copies.

### Release evidence

Preserve, when available:

- release/version number;
- source commit SHA;
- workflow/run ID;
- release manifest;
- source ZIP hash;
- SBOM hash/artifact digest;
- production Edge Function version/bundle SHA;
- migration identifiers;
- post-deploy security-advisor evidence.

## Restore procedure

A controlled restore exercise must validate, as applicable:

1. identify the chosen recovery point;
2. preserve the current state before destructive recovery work;
3. restore into a non-production or isolated verification environment when practical;
4. validate schema and critical authority routines;
5. validate RLS and privileged ACLs;
6. validate application/Edge Function compatibility;
7. run deterministic security/release/NFC tests applicable to the restored state;
8. compare authoritative record counts/hashes or other integrity evidence;
9. measure actual RPO/RTO achieved;
10. document gaps and corrective actions.

A backup is not considered proven merely because a provider dashboard says that a backup exists.

## Minimum restore checks for EVO

For the current V4.6 line, a restore validation should explicitly confirm:

- `VERSION`/release metadata alignment;
- EVO security/release gates can run from recovered source;
- critical Supabase tables have expected RLS posture;
- `evo_accept_nfc_counter` retains `SECURITY DEFINER`, safe `search_path` and service-role-only execution;
- no AES key material appears in `public.evo_nfc_tags`;
- revoked or replayed NFC evidence does not become accepted after recovery;
- authoritative ownership/transfer/service-proof routines retain expected constraints.

## Continuity scenarios

### GitHub unavailable or repository access lost

- use existing local/exported source only as temporary recovery evidence;
- restore access through verified organization/account recovery;
- do not accept unverified source archives as authoritative without matching known commit/release hashes;
- record any emergency deployment source and reconcile it back into version control.

### Supabase regional/service outage

- fail closed for authoritative writes when database authority cannot be reached;
- avoid locally inventing accepted ownership/NFC/replay decisions;
- preserve pending customer requests for safe retry only where idempotency is guaranteed;
- use provider status/evidence and restore/recovery procedures before resuming authority.

### Production database corruption

- stop affected authoritative writes;
- preserve forensic evidence;
- select a verified recovery point;
- restore and validate integrity before reopening writes;
- reconcile any transactions/events that occurred after the recovery point.

### Compromised secrets

Continuity is achieved by rotation/revocation, not restoration of a known-compromised value. Follow `ACCESS_AND_SECRET_MANAGEMENT.md` and the incident procedure.

### NFC key compromise

- disable affected profiles/bindings as required;
- rotate/provision replacement key material securely;
- rerun per-tag physical pilot before re-enabling strongest NFC claim;
- never mark old compromised reads as physically verified by inference.

## Restore-test cadence

Before an external ISO/IEC 27001 certification audit or high-assurance enterprise launch:

- perform at least one documented database restore exercise;
- perform at least one source/release reconstruction exercise;
- test secret-rotation recovery for a non-destructive representative secret;
- record measured RPO/RTO and corrective actions.

Thereafter, perform continuity/restore exercises periodically and after major architecture/provider changes.

## Evidence template

```text
exercise_id=
date_utc=
scope=
recovery_point=
start_time_utc=
end_time_utc=
measured_rpo=
measured_rto=
integrity_checks=
security_checks=
result=PASS|PARTIAL|FAIL
gaps=
corrective_actions=
owner=
```

## Review

Review this procedure at least annually, after a material outage/data-loss incident, after significant provider architecture changes, and before committing to customer recovery SLAs.
