# EVO ISMS Control Evidence Index — V0.1

Target standard: ISO/IEC 27001:2022 readiness.

Status: evidence index / gap tracker. This is **not** a Statement of Applicability and does not imply certification. A formal SoA must be prepared against the complete applicable ISO/IEC 27001:2022 Annex A control set during the certification program.

## Purpose

Connect EVO security/ISMS requirements to actual repository, CI and production evidence so that policies are not treated as proof by themselves.

## Current evidence map

| Control area | Current evidence | Current state | Remaining evidence/gap |
| --- | --- | --- | --- |
| ISMS scope | `docs/isms/ISMS_SCOPE.md` | Documented | Management approval/effective-date evidence before audit |
| Information-security policy | `docs/isms/INFORMATION_SECURITY_POLICY.md` | Documented | Formal periodic review record |
| Risk management | `docs/isms/RISK_REGISTER.md` | Initial register exists | Owner/review cadence and treatment evidence must remain current |
| Secure development | PR workflow, Security Gate, Release Readiness, deterministic tests | Strong automated evidence | Independent SDLC audit/pentest still external |
| Supply-chain evidence | `package-lock.json`, SPDX SBOM gate, `docs/SUPPLY_CHAIN_ASSURANCE_V460.md` | Implemented for npm root/package evidence | Vendored assets, Actions/platform/SaaS inventory handled separately |
| Vulnerability disclosure | `.github/SECURITY.md` | Documented | GitHub private vulnerability reporting setting not verified/enabled from current integration |
| Vulnerability management | `docs/isms/VULNERABILITY_MANAGEMENT.md` | Procedure documented | Need operating history and independent pentest findings |
| Incident response | `docs/isms/INCIDENT_RESPONSE.md` | Procedure documented | Tabletop exercise and incident records not yet demonstrated |
| Access and secret management | `docs/isms/ACCESS_AND_SECRET_MANAGEMENT.md` | Procedure documented | Privileged account inventory/MFA/access-review evidence must be collected |
| Backup / restore / continuity | `docs/isms/BACKUP_AND_CONTINUITY.md` | Procedure + internal targets documented | Actual restore exercise and measured RPO/RTO pending |
| Supplier security | `docs/isms/SUPPLIER_SECURITY.md` | Procedure documented | Material supplier register/reviews pending |
| Production inventory | `docs/PRODUCTION_INVENTORY_V400.md`, V4.6 closeout evidence | Documented technical inventory | Keep aligned after provider/config changes |
| Production database security | RLS/ACL tests, Security Gate, Supabase Security Advisor evidence | Automated + production evidence | Repeat after DDL/config changes |
| NFC cryptography | NXP vectors, NFC Crypto gate | Implemented software evidence | Genuine physical TagTamper pilot pending |
| NFC replay authority | atomic RPC tests + production ACL checks | Implemented software/production evidence | Physical tag enrollment and replay evidence pending |
| NFC physical claim | `physicalPilotApproved` gate | Fail-closed by design | No tag may be approved until real pilot passes |
| Release evidence | Release Bundle, exact commit SHA, SHA-256 manifest | Implemented | Git tag/release immutability process still not configured through available integration |
| Default branch integrity | CI gates exist | **Gap** | GitHub `main` branch/ruleset protection remains disabled |
| Public clean-browser evidence | Navigation/contract tests exist | **Gap** | Live clean-browser E2E still required |
| Paid checkout E2E | Checkout security/idempotency tests exist | **Gap** | Controlled real paid purchase → credit → consumption verification pending |
| DPP Registry integration | fail-closed adapter + DPP gate | Readiness implemented | Final Battery registry semantic/auth path remains external/current-EU dependency |
| Independent assurance | Internal CI/security controls | **Gap** | Independent pentest/security review pending |
| ISO/IEC 27001 certification | ISMS readiness documents | **Gap** | Formal SoA, internal audit, management review, Stage 1/Stage 2 certification pending |

## Evidence rule

For every control, distinguish:

1. **policy** — what EVO intends/requires;
2. **implementation** — what is technically/process-wise in place;
3. **operating evidence** — proof the control actually ran;
4. **independent evidence** — external audit/pentest/certification where required.

Do not mark a control complete merely because a policy file exists.

## Evidence quality levels

### E0 — Planned

Requirement identified, no implementation evidence.

### E1 — Documented

Policy/procedure exists.

### E2 — Implemented

Technical/process implementation exists and is testable.

### E3 — Operating evidence

Repeated real execution evidence exists (logs, reviews, exercises, production verification).

### E4 — Independently assured

Independent audit/test/certification evidence exists within its stated scope.

EVO should not use E4 language for E1–E3 evidence.

## Immediate next evidence priorities

1. enable protection/ruleset on `main` with required checks;
2. perform and record clean-browser production E2E;
3. execute controlled paid checkout E2E;
4. run physical NTAG 424 DNA TagTamper pilot;
5. perform database restore/tabletop incident exercises;
6. build privileged-account and material-supplier inventories;
7. commission independent pentest;
8. prepare complete formal SoA and internal-audit/management-review evidence before ISO certification audit.

## Review

Update this index whenever a control is promoted from policy to implementation, operating evidence or independent assurance. Keep unresolved external/operational gaps visible rather than converting them into unsupported claims.
