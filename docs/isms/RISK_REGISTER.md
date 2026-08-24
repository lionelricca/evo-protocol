# EVO ISMS — Information Security Risk Register

Status: **controlled working register / V1.0 readiness baseline**

Review date: 2026-08-24  
Risk-acceptance authority: ISMS Accountable Owner

## Method

- Likelihood (L): 1–5.
- Impact (I): 1–5.
- Score = L × I.
- 15–25: HIGH — treatment required; residual acceptance must be explicit.
- 8–14: MEDIUM — treatment or documented acceptance + monitoring.
- 1–7: LOW — may be accepted with rationale.

A treatment is not complete merely because it is written here. `TREATED` requires objective evidence.

| ID | Risk | Owner | Inherent | Current treatment/evidence | Residual target | Status / next evidence |
|---|---|---|---:|---|---:|---|
| R-001 | Privileged GitHub compromise permits unauthorized source/release change | ISMS Owner | 15 | PR workflow, signed history, pinned Actions, Security Gate | 6 | OPEN — enable `main` protection + required checks |
| R-002 | Production credential/secret exposed in source/client | Security Owner | 15 | server-only secrets; `.env` excluded | 6 | TREATED/MONITOR — quarterly secret inventory/rotation record |
| R-003 | Database authorization/RLS defect exposes or corrupts data | Security Owner | 15 | RLS, explicit deny, SQL tests, Security Advisor 0 lints | 5 | TREATED/MONITOR — quarterly privilege evidence |
| R-004 | Privileged Edge Function bypasses transaction authority | Security Owner | 15 | authoritative RPCs + atomic SQL tests | 5 | TREATED/MONITOR |
| R-005 | Forged ownership/lifecycle alters trust history | Security Owner | 15 | signatures, owner checks, state machine | 5 | TREATED/MONITOR |
| R-006 | NFC replay/cloning falsely elevates copied evidence | Security Owner | 20 | NXP crypto, UID+Seal binding, atomic counter, physical approval gate | 8 | OPEN-EXTERNAL — real NTAG 424 DNA pilot + clone/replay evidence |
| R-007 | NFC key compromise enables forged physical evidence | Security Owner | 15 | no keys in DB/repo/browser | 6 | OPEN — controlled provisioning + KMS/HSM before scale |
| R-008 | Public QR copied and presented as physical authenticity | Product/Security Owner | 20 | QR is discovery only; claim boundaries | 6 | TREATED/MONITOR |
| R-009 | DPP Registry API/schema change causes invalid registration | Compliance/Technical Owner | 16 | fail-closed adapter, fingerprints, environment separation, regulatory watch | 6 | OPEN-EXTERNAL — Battery contract not yet available |
| R-010 | Unsupported regulatory/certification claim is marketed | ISMS/Compliance Owner | 15 | prohibited-claim policy/tests | 5 | TREATED/MONITOR |
| R-011 | Battery Passport data inaccurate/stale/incomplete | Product/Compliance Owner | 15 | readiness engine, signed updates | 7 | OPEN — complete responsibility/update/access workflow |
| R-012 | Restricted DPP information exposed | Security Owner | 15 | public/restricted separation | 7 | OPEN — entitlement/credential gateway |
| R-013 | Software dependency/supply-chain compromise | Security Owner | 16 | pinned Actions/imports, local QR, gates | 7 | OPEN — SBOM + vulnerability review cadence |
| R-014 | Cloud/database outage prevents verification/access | Operations Owner | 15 | provider resilience + export architecture | 8 | OPEN — backup/export + measured restore |
| R-015 | Evidence data corruption/loss prevents continuity | Operations Owner | 10 | hashes/version history/migrations | 5 | OPEN — encrypted backup + restore test |
| R-016 | Critical supplier compromise/outage affects EVO | Supplier Owner | 15 | supplier boundaries identified | 6 | OPEN — annual supplier reviews + exit evidence |
| R-017 | Administrator account takeover | ISMS Owner | 15 | platform auth/MFA where supported | 6 | OPEN — documented MFA/access/recovery review |
| R-018 | Privileged knowledge concentrated in one operator | ISMS Owner | 16 | version-controlled runbooks/code | 8 | OPEN — recovery contact/credential continuity |
| R-019 | Change reaches production without exact-head evidence | Technical Owner | 12 | PRs, release bundles, hashes, closeouts | 4 | OPEN — branch protection required |
| R-020 | Wallet/account stale state attributes data incorrectly | Technical Owner | 12 | explicit-connect/account-switch tests | 4 | TREATED/MONITOR — clean-browser release smoke |
| R-021 | Checkout/credit race/abuse causes inconsistency | Technical Owner | 12 | atomicity, rate limits, anti-Sybil, reconciliation | 5 | OPEN — controlled paid recovery test |
| R-022 | Silent rewrite/fork of evidence history | Security Owner | 15 | signed roots, atomic state, parent/current owner revalidation | 5 | TREATED/MONITOR |
| R-023 | AI Guardian presents unsupported authenticity conclusion | Product/Security Owner | 12 | AI separated from cryptographic authority | 5 | TREATED/MONITOR |
| R-024 | Incident response/notification inconsistent | Incident Coordinator | 12 | logs/advisors | 5 | OPEN — runbook + tabletop + corrective-action evidence |
| R-025 | Backups expose secrets/customer data | Operations Owner | 15 | backup design pending | 6 | OPEN — encryption/access/retention controls |
| R-026 | Vendor lock-in prevents DPP continuity | Product/Operations Owner | 12 | JSON/export architecture | 5 | OPEN — full export/restore/escrow decision |
| R-027 | Public web delivery lacks security headers | Technical Owner | 12 | browser CSP/security bootstrap | 5 | OPEN — verify HSTS/frame/policy response headers |
| R-028 | Historical duplicate test data weakens uniqueness claim | Product Owner | 6 | identity guard + resolution plan | 3 | OPEN-OWNER-SIGNATURE — signed lifecycle action only |
| R-029 | Independent attacker finds gap outside internal tests | ISMS Owner | 15 | automated security gates/advisors | 7 | OPEN-EXTERNAL — independent penetration/security assessment |
| R-030 | Security evidence becomes stale | ISMS Owner | 12 | automated gates + dated closeouts | 4 | OPEN — internal audit/management review/evidence cycle |
| R-031 | Climate-related disruption affects infrastructure/suppliers | Operations/Supplier Owner | 8 | cloud architecture | 4 | MONITOR — annual BCP/supplier resilience review |
| R-032 | Customer wallet compromise incorrectly attributed to EVO | Product Owner | 10 | no private-key custody; signing boundary | 4 | TREATED/MONITOR |
| R-033 | Excess personal-data processing creates privacy exposure | Compliance Owner | 8 | minimization principle | 4 | OPEN — data inventory/retention/DPA before expansion |
| R-034 | Missing ISMS operating evidence prevents ISO certification | ISMS Owner | 12 | controlled ISMS repository | 5 | OPEN — internal audit + management review + external certification audit |

## Priority treatment program

### P0 — before stronger enterprise/security claims

1. R-001/R-019 — protect `main` and require critical checks.
2. R-014/R-015/R-025/R-026 — backup/export/restore continuity evidence.
3. R-024/R-030/R-034 — incident exercise, internal audit and management review.
4. R-029 — independent penetration assessment.

### P1 — before physical NFC claim

1. R-006 — real hardware pilot and clone/replay testing.
2. R-007 — controlled provisioning + production-grade key-management decision.

### P1 — before restricted DPP enterprise rollout

1. R-011/R-012 — role/access and update-responsibility completion.
2. R-009 — Commission Battery Registry contract/test integration when externally available.

## Risk acceptance

Any HIGH residual risk requires a dated management decision with rationale and review date. External blockers remain `OPEN-EXTERNAL` until evidence exists or management explicitly accepts the limitation for a defined scope.

## Review triggers

Review at least quarterly and after incidents, major architecture/auth/cryptography changes, critical supplier changes, new DPP categories, material regulatory/security-standard changes, major customer requirements, internal audit, management review or certification audit.
