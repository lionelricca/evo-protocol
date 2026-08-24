# EVO Material Supplier Register — Initial V0.1

Review date: 2026-08-24

Target alignment: ISO/IEC 27001:2022 readiness.

Status: initial factual register based on currently observed EVO architecture and repository evidence. It is **not** a completed supplier due-diligence assessment and does not claim that any supplier certification automatically applies to EVO.

## Rating model

- **CRITICAL** — compromise/outage can directly affect an EVO root of trust, authoritative production state or regulated/commercial operation.
- **HIGH** — material production, payment, identity, supply-chain or regulatory dependency.
- **MEDIUM** — important but replaceable dependency with bounded direct authority.
- **FUTURE** — dependency class identified but supplier/onboarding not yet selected/completed.

## Current register

| ID | Supplier / dependency | Service used by EVO | State | Materiality | Evidence observed | Security / continuity gaps still to close |
| --- | --- | --- | --- | --- | --- | --- |
| S-001 | GitHub | Source repository, pull requests, Actions CI and current Pages/public deployment dependency | ACTIVE | CRITICAL | Repository `lionelricca/evo-protocol`; CI/release/SBOM/ISMS evidence; repository owner account has `admin` permission | `main` branch protection/ruleset still disabled; MFA/private vulnerability reporting/contractual settings not verified through available integration; source/CI continuity exercise pending |
| S-002 | Supabase | Production PostgreSQL, Edge Functions, logs, secret environment and server authority | ACTIVE | CRITICAL | Production project observed; deployed V4.6 NFC verifier; RLS/ACL/RPC checks; Security Advisor observed at 0 security lints after V4.6 deployment | Administrator/MFA review not yet evidenced; active-plan backup/retention and measured restore capability must be verified before SLA/certification claims; supplier terms/shared-responsibility evidence needs formal review |
| S-003 | DePay | Browser payment widget for current smart checkout | ACTIVE IN CODE | HIGH | `v1/checkout.js` is regression-tested to pin `https://sdk.depay.com/widgets/v13.0.45.js`; server-side EVO checkout independently verifies submitted settlement/entitlement state | Provider security/availability/terms review not yet archived; external script availability is a browser supply-chain dependency; controlled paid E2E still pending |
| S-004 | European Commission DPP Registry / EU Login | Regulatory DPP registration and economic-operator identity workflow | EXTERNAL / ONBOARDING PENDING | HIGH | Registry and TEST environments documented as operational; current EVO adapter remains fail-closed for Battery submission | EVO organisation enrolment not claimed complete; separate TEST EU Login and QES/QSeal verification required; Battery semantic catalogue still blocks successful Battery registration; final usable API/auth/schema contract not pinned |
| S-005 | NXP | NTAG 424 DNA / TagTamper secure NFC silicon and official cryptographic reference material | PILOT HARDWARE PENDING | HIGH | V4.6 cryptography validated against reviewed NXP vectors; software supports TagTamper C/O/I state and replay authority | Genuine physical tags/provenance/provisioning source not yet recorded; real closed/open/replay/alteration pilot pending; no physical tag approved |
| S-006 | Qualified Trust Service Provider (QTSP) | Future QES/QSeal required for Commission organisation verification and any future regulated signing service selected by EVO | FUTURE — NOT SELECTED | HIGH | Commission onboarding requirement documented | Provider must be selected and current QTSP status/scope independently verified; custody/responsibility for signing material must be defined; EVO must not claim QTSP status merely by consuming a QTSP service |
| S-007 | Public blockchain networks / wallet RPC path | Customer wallet signatures and current USDC settlement networks | ACTIVE EXTERNAL DEPENDENCY | HIGH | Checkout tests currently support Polygon, Base, Arbitrum, Optimism, Avalanche and Ethereum; wallet signatures remain customer-controlled | Exact wallet/RPC providers depend on user environment and are not fully controlled by EVO; network/RPC outage and chain-finality assumptions require commercial continuity/reconciliation rules |
| S-008 | Domain / DNS provider | Naming and routing for any production EVO custom domain | PROVIDER DETAIL PENDING IN ISMS | HIGH | ISMS scope identifies DNS/domain as in-scope supplier dependency | Exact provider/account, MFA, recovery contacts, DNSSEC/registrar-lock posture and exit process must be recorded before enterprise audit readiness |
| S-009 | Independent penetration-test provider | External high-assurance security assessment | FUTURE — NOT SELECTED | HIGH | Required by EVO security/ISMS roadmap before high-assurance enterprise claims | Select independent qualified provider; define scope covering browser/API/Supabase/payment/wallet/NFC; retain report and remediation evidence |
| S-010 | ISO/IEC 27001 certification body | Independent certification audit | FUTURE — NOT SELECTED | HIGH | Certification roadmap identifies accredited certification route | Verify current accreditation and scope; keep implementation consulting independent from certification decision as required for credibility; Stage 1/Stage 2 not yet performed |

## Current supplier conclusions

### GitHub

Observed fact on 2026-08-24:

- `lionelricca` has **admin** permission on `lionelricca/evo-protocol`;
- `main` was previously re-checked and remains unprotected through the available GitHub branch metadata;
- all current EVO CI workflows are evidence, not a substitute for enforcing required checks at branch/ruleset level.

MFA status is **NOT VERIFIED** by the available GitHub integration and must not be inferred.

### Supabase

Observed production evidence includes:

- server/database authority in the connected production project;
- `evo_nfc_tags` RLS posture and zero enrolled rows at the V4.6 production review;
- `evo_accept_nfc_counter` restricted to service-role execution with safe `search_path`;
- V4.6 NFC verifier deployed as production function version 6;
- post-deploy Security Advisor returned 0 security lints.

These facts do not prove provider backup configuration, administrator MFA or contractual security terms. Those remain separate review items.

### DePay

The repository deliberately pins the reviewed browser widget release instead of a floating major URL. This reduces but does not eliminate external-script supply-chain risk.

EVO does **not** treat the widget callback alone as payment authority; checkout tests require server-side verification/recovery logic. A real controlled purchase remains required before declaring paid E2E evidence complete.

### Commission DPP Registry

The Commission Registry is a regulatory external dependency, not a commercial certification of EVO. Current documentation keeps Battery submission fail-closed until the Battery semantic layer and usable tested submission contract are available.

### NXP / NFC supply chain

Software vectors are not supplier provenance evidence for a physical tag. Hardware procurement/provisioning evidence must include actual tag model/source/UID and real cryptographic/tamper behavior before physical approval.

## Review actions

Before ISO Stage 1 or a high-assurance enterprise launch:

1. record provider/account owners for every ACTIVE CRITICAL/HIGH supplier;
2. collect current terms/security/privacy/shared-responsibility evidence appropriate to risk;
3. verify privileged authentication/MFA where EVO controls the account;
4. verify backup/export/exit mechanisms;
5. record incident/status notification channels;
6. identify any subprocessors/dependencies that materially change risk;
7. test at least one practical exit/recovery path for CRITICAL providers where feasible;
8. review and approve residual supplier risk.

## Evidence rule

Do not place passwords, tokens, private keys, seed phrases, API secrets or NFC AES keys in this register. Store only non-secret identifiers, status and evidence references.

## Review cadence

- CRITICAL/HIGH active dependencies: at least annually and after material incidents/service changes;
- FUTURE dependencies: review before onboarding/contracting;
- update immediately when a supplier is replaced, retired or gains new authority.
