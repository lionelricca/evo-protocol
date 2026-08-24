# EVO DPP Compliance Matrix

Status legend:

- `IMPLEMENTED` — present in EVO and covered by repository evidence/tests.
- `PARTIAL` — architecture exists but further standards, registry, credential or operational work is required.
- `PLANNED` — not implemented yet.
- `EXTERNAL` — depends on an authority, notified body, identifier issuer or other third party.

Current regulatory snapshot: 24 August 2026.

| Requirement | Source | EVO control | Status | Evidence / next action |
|---|---|---|---|---|
| Battery passport from 18 Feb 2027 for LMT, EV and industrial >2 kWh | EU 2023/1542 Art. 77(1) | Applicability engine | IMPLEMENTED | `evo-battery-passport` returns likely-required / threshold / classification-review states |
| Model + individual battery information | Art. 77(2), Annex XIII | Separate model and individual records | IMPLEMENTED | `evo_battery_models` + `evo_battery_passports` |
| Public access layer | Annex XIII point 1 | Public model block | IMPLEMENTED | Public API excludes restricted blocks |
| Legitimate-interest model data | Annex XIII point 2 | Separate restricted block | PARTIAL | Data segregated; credential authorization gateway still required; battery access-rights implementing act remains a tracked external dependency |
| Authority-only test reports | Annex XIII point 3 | Separate authority block | PARTIAL | Data segregated; notified-body / authority credential verification still required |
| Individual battery restricted data | Annex XIII point 4 | Separate individual data block | IMPLEMENTED / PARTIAL | Stored separately; role-based credential gateway still required |
| QR linked to unique identifier | Art. 77(3) | EVO QR architecture | PARTIAL | Battery-specific QR and standards-conformant identifier integration pending |
| ISO/IEC 15459 or equivalent identifier requirements | Art. 77(3) + DPP technical framework | Identifier abstraction | PARTIAL / EXTERNAL | Six harmonised DPP standards are now published/referenced; map the adopted identifier/data-carrier requirements and integrate an approved issuing-agency / GS1-compatible path before claiming conformity |
| Accurate, complete and up-to-date passport | Art. 77(4) | Readiness engine + signed updates | PARTIAL | Create/update signatures present; complete update workflow, responsibility evidence and policy still required |
| Open standards, interoperable, transferable, machine-readable, structured, searchable, no vendor lock-in | Art. 77(5), Art. 78(a) | JSON API + export-oriented architecture | PARTIAL | Map EVO schema/export to the published harmonised DPP standards and Commission semantic repository/API |
| New passport linked after repurposing/remanufacturing | Art. 77(7) | EVO lifecycle/continuity architecture | PLANNED | Add predecessor passport relationship |
| Passport ceases after recycling | Art. 77(8) | `CEASED` lifecycle status | PARTIAL | Add signed cease/recycle workflow |
| Register unique identifier and required metadata in EU DPP Registry | Art. 77(10) + ESPR DPP Registry framework | Registry connector | PARTIAL | EU DPP Registry and testing environment have been operational since 20 Jul 2026 and support UI/API registration. Build EVO test-environment connector, organisation enrollment workflow, registration status/evidence capture and retry/idempotency controls |
| DPP Registry proof of registration | DPP Registry implementing framework | Registration evidence | PLANNED | Capture the secure electronic proof of registration returned/available through the Registry and bind it to the corresponding EVO passport/version |
| Interoperability with other EU DPPs | Art. 78(a) | Open data model | PARTIAL | Map final harmonised standards, Commission semantic repository and documented Registry APIs; track the remaining two DPP standards expected in 2026 |
| Free access according to rights | Art. 78(b) | Public verification free | PARTIAL | Public verification is free; restricted-access entitlement/credential system still pending |
| Data stored by responsible economic operator or authorised operator | Art. 78(c) | Operator-signed records | IMPLEMENTED / PARTIAL | Add contractual/operator-authorisation evidence and registry organisation binding |
| Service provider does not sell/reuse customer data beyond service | Art. 78(d) | Information-security policy | PARTIAL | Add contractual DPA/service terms, retention controls and audit evidence |
| Passport continuity after operator ceases activity | Art. 78(e) | Export + backup architecture | PLANNED | Independent backup/escrow/continuity strategy required |
| Restrict introduce/modify/update rights | Art. 78(f) | Wallet-signed prepare/commit flow | IMPLEMENTED / PARTIAL | Add delegated-role credentials, revocation and Registry/operator role mapping |
| Authentication, reliability and integrity | Art. 78(g) | SHA-256 + wallet signatures + version history | IMPLEMENTED | Server recomputes hashes and verifies signatures |
| High security/privacy/fraud prevention | Art. 78(h) | RLS, direct grants revoked, restricted blocks, continuity roadmap | PARTIAL | Complete ISO 27001 controls, access credentials, secure NFC, monitoring, branch protection and independent review |

## Regulatory changes incorporated on 24 August 2026

The previous matrix treated the EU DPP Registry as a future external dependency. That is no longer accurate.

The European Commission launched the Registry and a testing environment on 20 July 2026. Registration is available through a secure user interface or API, and the Registry stores unique identifiers, registration data and high-level metadata while detailed DPP content remains decentralised.

The Commission also reports that six of the eight harmonised DPP standards have been published/referenced and that updated Digital Batteries Passport data-point guidance was published in August 2026.

These changes move EVO from a purely preparatory Registry posture to an executable integration phase.

## V4.2 priority

1. Enrol a test organisation in the Commission DPP Registry testing environment.
2. Record the exact organisation/user verification requirements without embedding EU Login credentials in EVO.
3. Implement a server-side Registry adapter with strict environment separation (`test` / future `production`).
4. Make registration idempotent by EVO passport/version and external registry identifier.
5. Store registration state, timestamp, external identifier and proof/evidence reference in a protected registry table.
6. Never expose Registry credentials/tokens to browser JavaScript.
7. Add automated contract/schema tests using fixtures before any live API write.
8. Verify one controlled battery-passport registration end-to-end in the test environment.
9. Update the compliance matrix only after observed evidence exists.

## Commercial rule

EVO UI and sales material must use wording such as **readiness**, **requirements mapping**, **missing data**, **Registry-ready** and **technical preparation** until an independent conformity/certification route applies.

Never display `EU Certified`, `Battery Passport Certified`, `EU DPP Certified Provider` or equivalent wording merely because the EVO readiness score is 100% or because EVO can register a DPP in the Commission Registry.

## Official references tracked

- Regulation (EU) 2023/1542, Articles 77–78.
- European Commission, Digital Product Passport Registry, operational from 20 July 2026.
- European Commission, Digital Product Passport for Batteries.
- European Commission, Digital Batteries Passport — data points by category, updated August 2026.
