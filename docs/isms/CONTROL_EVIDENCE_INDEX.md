# EVO ISMS Control Evidence Index — V0.3

Target standard: ISO/IEC 27001:2022 readiness.

Status: evidence index / gap tracker. This is **not** a Statement of Applicability and does not imply certification. A formal SoA must be prepared against an authorised copy of the complete applicable ISO/IEC 27001:2022 control set during the certification program.

## Purpose

Connect EVO security/ISMS requirements to actual repository, CI and production evidence so that policies are not treated as proof by themselves.

## Current evidence map

| Control area | Current evidence | Current state | Remaining evidence/gap |
| --- | --- | --- | --- |
| ISMS scope | `docs/isms/ISMS_SCOPE.md` | Documented | Management approval/effective-date evidence before audit |
| Information-security policy | `docs/isms/INFORMATION_SECURITY_POLICY.md` | Documented | Formal periodic review record |
| Risk management | `docs/isms/RISK_REGISTER.md` | Initial register exists | Owner/review cadence, residual scoring and treatment evidence must remain current |
| Asset ownership/inventory | `docs/isms/ASSET_AND_INFORMATION_INVENTORY.md` | Initial ISMS asset/information register documented | Periodic review/retirement evidence and final provider/config details |
| Information classification/handling | `docs/isms/INFORMATION_CLASSIFICATION_AND_HANDLING.md` | Handling standard documented | Operating evidence, exceptions and formal retention schedule |
| SoA preparation | `docs/isms/SOA_PREPARATION.md` | Formal preparation method documented | Licensed/current standard review, full applicability decisions and management-approved formal SoA pending |
| Secure development | PR workflow, Security Gate, Release Readiness, deterministic tests | Strong automated evidence | Independent SDLC audit/pentest still external |
| Supply-chain evidence | `package-lock.json`, SPDX SBOM gate, `docs/SUPPLY_CHAIN_ASSURANCE_V460.md` | Implemented for npm root/package evidence | Vendored assets, Actions/platform/SaaS inventory handled separately |
| Vulnerability disclosure | `.github/SECURITY.md` | Documented | GitHub private vulnerability reporting setting not verified/enabled from current integration |
| Vulnerability management | `docs/isms/VULNERABILITY_MANAGEMENT.md` | Procedure documented | Need operating history and independent pentest findings |
| Incident response | `docs/isms/INCIDENT_RESPONSE.md` | Procedure documented | Tabletop exercise and incident records not yet demonstrated |
| Access and secret management | `ACCESS_AND_SECRET_MANAGEMENT.md` + `PRIVILEGED_ACCESS_REGISTER.md` | Procedure + initial factual register | GitHub/Supabase/DNS/payment MFA/admin review and quarterly review evidence still pending |
| Backup / restore / continuity | `docs/isms/BACKUP_AND_CONTINUITY.md` | Procedure + internal targets documented | Actual restore exercise and measured RPO/RTO pending |
| Supplier security | `SUPPLIER_SECURITY.md` + `MATERIAL_SUPPLIER_REGISTER.md` | Procedure + initial factual register | Formal due-diligence evidence, account/MFA/contract/exit reviews and residual-risk approvals pending |
| Production inventory | `docs/PRODUCTION_INVENTORY_V400.md`, V4.6 closeout evidence | Documented technical inventory | Keep aligned after provider/config changes |
| Production database security | RLS/ACL tests, Security Gate, Supabase Security Advisor evidence | Automated + production evidence | Repeat after DDL/config changes |
| NFC cryptography | NXP vectors, NFC Crypto gate | Implemented software evidence | Genuine physical TagTamper pilot pending |
| NFC replay authority | atomic RPC tests + production ACL checks | Implemented software/production evidence | Physical tag enrollment and replay evidence pending |
| NFC physical claim | `physicalPilotApproved` gate | Fail-closed by design | No tag may be approved until real pilot passes |
| Release evidence | Release Bundle, exact commit SHA, SHA-256 manifest | Implemented | Git tag/release immutability process still not configured through available integration |
| Default branch integrity | CI gates exist | **Gap** | GitHub `main` branch/ruleset protection remains disabled |
| Public clean-browser evidence | Navigation/contract tests exist | **Gap** | Live clean-browser E2E still required |
| Paid checkout E2E | Checkout security/idempotency tests exist; DePay v13.0.45 dependency registered | **Gap** | Controlled real paid purchase → credit → consumption verification pending |
| DPP Registry integration | fail-closed adapter + DPP gate + current Commission state documentation | Readiness implemented | Registry/TEST are operational and organisation onboarding is actionable, but successful Battery registration still awaits Commission Battery semantic enablement and a pinned usable API/schema contract |
| Independent assurance | Internal CI/security controls | **Gap** | Independent pentest/security review pending |
| ISO/IEC 27001 certification | ISMS readiness documents + SoA preparation method | **Gap** | Formal approved SoA, internal audit, management review, Stage 1/Stage 2 certification pending |

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

## Current ISMS preparation baseline

The repository now contains an initial documented baseline for:

- scope and policy;
- risk register;
- asset/information inventory;
- classification/handling;
- access and secret management;
- initial privileged-access register;
- incident response;
- backup/continuity;
- vulnerability management;
- supplier security;
- initial material-supplier register;
- control-evidence tracking;
- SoA preparation method;
- vulnerability disclosure;
- secure-development/release/SBOM automation.

The supplier/access registers are stronger than blank templates because they record current facts such as the observed GitHub admin permission and pinned DePay version. They still remain E1/E2 until actual recurring reviews/MFA verification create E3 operating evidence.

## Immediate next evidence priorities

1. enable protection/ruleset on `main` with required checks;
2. perform and record clean-browser production E2E;
3. execute controlled paid checkout E2E;
4. run physical NTAG 424 DNA TagTamper pilot;
5. perform database restore and incident tabletop exercises;
6. verify MFA/admin scope for material privileged accounts and record the first quarterly access review;
7. perform formal due diligence on active CRITICAL/HIGH suppliers and approve residual supplier risk;
8. complete risk ownership/residual-risk/treatment tracking;
9. build the formal SoA from an authorised current standard copy and management approval;
10. perform internal audit and management review;
11. commission independent pentest;
12. proceed to accredited certification audit only after the operating evidence is mature.

## Review

Update this index whenever a control is promoted from policy to implementation, operating evidence or independent assurance. Keep unresolved external/operational gaps visible rather than converting them into unsupported claims.
