# EVO DPP Compliance Matrix

Status legend:

- `IMPLEMENTED` — present in EVO V0/V0.1.
- `PARTIAL` — architecture exists but further standards or credential work is required.
- `PLANNED` — not implemented yet.
- `EXTERNAL` — depends on an authority, notified body, identifier issuer or other third party.

| Requirement | Source | EVO control | Status | Evidence / next action |
|---|---|---|---|---|
| Battery passport from 18 Feb 2027 for LMT, EV and industrial >2 kWh | EU 2023/1542 Art. 77(1) | Applicability engine | IMPLEMENTED | `evo-battery-passport` returns likely-required / threshold / classification-review states |
| Model + individual battery information | Art. 77(2), Annex XIII | Separate model and individual records | IMPLEMENTED | `evo_battery_models` + `evo_battery_passports` |
| Public access layer | Annex XIII point 1 | Public model block | IMPLEMENTED | Public API excludes restricted blocks |
| Legitimate-interest model data | Annex XIII point 2 | Separate restricted block | PARTIAL | Data segregated; credential authorization gateway still required |
| Authority-only test reports | Annex XIII point 3 | Separate authority block | PARTIAL | Data segregated; notified-body / authority credential verification still required |
| Individual battery restricted data | Annex XIII point 4 | Separate individual data block | IMPLEMENTED / PARTIAL | Stored separately; role-based credential gateway still required |
| QR linked to unique identifier | Art. 77(3) | EVO QR architecture | PARTIAL | Battery-specific QR and compliant identifier integration pending |
| ISO/IEC 15459 or equivalent identifier requirements | Art. 77(3) | Identifier abstraction | PLANNED / EXTERNAL | Integrate approved issuing agency / GS1-compatible identifier path; do not claim compliance before implemented |
| Accurate, complete and up-to-date passport | Art. 77(4) | Readiness engine + signed updates | PARTIAL | Create/update signatures present; full update workflow and evidence policy pending |
| Open standards, interoperable, transferable, machine-readable, structured, searchable, no vendor lock-in | Art. 77(5) | JSON API + export-oriented architecture | PARTIAL | Formal harmonised DPP exchange format mapping pending |
| New passport linked after repurposing/remanufacturing | Art. 77(7) | EVO lifecycle/continuity architecture | PLANNED | Add predecessor passport relationship |
| Passport ceases after recycling | Art. 77(8) | `CEASED` lifecycle status | PARTIAL | Add signed cease/recycle workflow |
| Upload unique identifier to EU DPP Registry | Art. 77(10) | Registry connector | PLANNED / EXTERNAL | Integrate current Commission registry API/process when production onboarding is completed |
| Interoperability with other EU DPPs | Art. 78(a) | Open data model | PARTIAL | Map final harmonised standards and Commission implementation guidance |
| Free access according to rights | Art. 78(b) | Public verification free | PARTIAL | Restricted-access entitlement system pending |
| Data stored by responsible economic operator or authorised operator | Art. 78(c) | Operator-signed records | IMPLEMENTED / PARTIAL | Contractual operator-authorization evidence to add |
| Service provider does not sell/reuse customer data beyond service | Art. 78(d) | Information-security policy | PARTIAL | Add contractual DPA/service terms and audit evidence |
| Passport continuity after operator ceases activity | Art. 78(e) | Export + backup architecture | PLANNED | Independent backup/escrow strategy required |
| Restrict introduce/modify/update rights | Art. 78(f) | Wallet-signed prepare/commit flow | IMPLEMENTED / PARTIAL | Add delegated-role credentials and revocation |
| Authentication, reliability and integrity | Art. 78(g) | SHA-256 + wallet signatures + version history | IMPLEMENTED | Server recomputes hashes and verifies signatures |
| High security/privacy/fraud prevention | Art. 78(h) | RLS, direct grants revoked, restricted blocks, continuity roadmap | PARTIAL | Complete ISO 27001 controls, access credentials, secure NFC, monitoring and independent review |

## Commercial rule

EVO UI and sales material must use wording such as **readiness**, **requirements mapping**, **missing data** and **technical preparation** until an independent conformity/certification route applies.

Never display `EU Certified`, `Battery Passport Certified` or equivalent wording merely because the EVO readiness score is 100%.