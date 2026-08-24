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
| ISO/IEC 15459 or equivalent identifier requirements | Art. 77(3) + DPP technical framework | Identifier abstraction | PARTIAL / EXTERNAL | Six harmonised DPP standards are published/referenced; map adopted identifier/data-carrier requirements and integrate an approved issuing-agency / GS1-compatible path before claiming conformity |
| Accurate, complete and up-to-date passport | Art. 77(4) | Readiness engine + signed updates | PARTIAL | Create/update signatures present; complete responsibility/update policy still required |
| Open standards, interoperable, transferable, machine-readable, structured, searchable, no vendor lock-in | Art. 77(5), Art. 78(a) | JSON API + export-oriented architecture | PARTIAL | Map EVO schema/export to published harmonised DPP standards and Commission semantic repository/API |
| New passport linked after repurposing/remanufacturing | Art. 77(7) | EVO lifecycle/continuity architecture | PLANNED | Add predecessor passport relationship |
| Passport ceases after recycling | Art. 77(8) | `CEASED` lifecycle status | PARTIAL | Add signed cease/recycle workflow |
| Register unique identifier and required metadata in EU DPP Registry | Art. 77(10) + ESPR DPP Registry framework | `evo-dpp-registry` server adapter | PARTIAL / EXTERNAL | Registry/test site are operational. EVO validates current public constraints and prepares deterministic envelopes. Commission User Guide v1.01 states successful Battery registration is still unavailable because the battery semantic catalogue/content is under development; live submission therefore remains fail-closed |
| UPI requirements for current Battery Registry flow | Commission DPP Registry User Guide v1.01 | UPI validator | IMPLEMENTED / PARTIAL | Adapter requires HTTPS, current 50-character limit and rejects obvious local/private targets; final JTC 24 conformance still requires the authoritative identifier standard/profile |
| Item-level Battery registration metadata | Commission DPP Registry User Guide v1.01 | Registry envelope | IMPLEMENTED / PARTIAL | Current UI uses `ITEM` granularity with optional model/batch identifiers; exact Commission JSON/XML/API schema remains external pending semantic enablement |
| Registry batch submission limits | Commission DPP Registry User Guide v1.01 | Batch preparation | IMPLEMENTED | EVO caps batches at 100, rejects duplicate UPI values and treats batch validation as all-or-nothing before external submission |
| DPP Registry proof/evidence | DPP Registry framework | Registration evidence model | PLANNED / EXTERNAL | Future successful request must capture correlation ID, returned UPI/URI and secure proof/reference where available |
| Interoperability with other EU DPPs | Art. 78(a) | Open data model | PARTIAL | Map harmonised standards, Commission semantic repository and documented Registry APIs; track remaining standards expected in 2026 |
| Free access according to rights | Art. 78(b) | Public verification free | PARTIAL | Public verification is free; restricted-access entitlement/credential system still pending |
| Data stored by responsible economic operator or authorised operator | Art. 78(c) | Operator-signed records | IMPLEMENTED / PARTIAL | Add contractual/operator-authorisation evidence and Registry organisation binding |
| Service provider does not sell/reuse customer data beyond service | Art. 78(d) | Information-security policy | PARTIAL | Add contractual DPA/service terms, retention controls and audit evidence |
| Passport continuity after operator ceases activity | Art. 78(e) | Export + backup architecture | PLANNED | Independent backup/escrow/continuity strategy required |
| Restrict introduce/modify/update rights | Art. 78(f) | Wallet-signed prepare/commit flow | IMPLEMENTED / PARTIAL | Add delegated-role credentials, revocation and Registry/operator role mapping |
| Authentication, reliability and integrity | Art. 78(g) | SHA-256 + wallet signatures + version history | IMPLEMENTED | Server recomputes hashes and verifies signatures |
| High security/privacy/fraud prevention | Art. 78(h) | RLS, direct grants revoked, server-only Registry boundary, continuity roadmap | PARTIAL | Complete ISO 27001 controls, secure NFC, monitoring, branch protection and independent review |

## Regulatory changes incorporated on 24 August 2026

The EU DPP Registry and testing environment became operational on 20 July 2026. The Registry is now a real integration target rather than a future concept. The Commission states that registration is available through a secure user interface and API and that the Registry stores identifiers, registration data and high-level metadata while detailed DPP content remains decentralised.

However, the Commission's DPP Registry User Guide for Economic Operators v1.01 (28 July 2026) explicitly states that **successful registration of DPPs for Batteries is not currently available** because the Battery semantic catalogue/content is still under development. This is an external Commission-side blocker, not an EVO software defect.

The same guide currently defines these useful integration constraints:

- Battery registration is item-level in the current UI;
- UPI is mandatory, URL-based and HTTPS, with a stated maximum length of 50 characters;
- optional Model Identifier and Batch Identifier can accompany an item registration;
- file submission accepts JSON or XML;
- a file can contain at most 100 registration requests;
- one invalid DPP causes the complete multi-DPP submission to be rejected;
- each request receives a correlation ID;
- successful outcomes expose the corresponding UPI and Registry-generated URI;
- TEST is isolated from production and uses separate EU Login credentials;
- organisation verification in TEST still requires valid data plus QES/QSeal-based verification.

## EVO implementation state

`supabase/functions/evo-dpp-registry/index.ts` now provides a server-only fail-closed preparation boundary:

1. validates current public UPI constraints;
2. rejects obvious private/local targets and non-standard ports;
3. validates item-level Battery records;
4. prepares deterministic single/batch envelopes;
5. caps batches at 100 and rejects duplicate UPI values;
6. fingerprints the envelope with SHA-256 for future idempotency/audit;
7. requires a server secret for privileged preparation;
8. does not expose wildcard browser CORS;
9. explicitly labels the generated envelope `NOT_CLAIMED` for Commission-schema compatibility;
10. refuses live submission until the official Battery semantic/API contract is pinned and evidenced.

## Remaining V4.x priorities

1. Complete Economic Operator enrolment in the Commission TEST Registry using a separate EU Login and valid QES/QSeal process. `EXTERNAL`.
2. Wait for Commission Battery semantic registration enablement. `EXTERNAL`.
3. Capture the authoritative JSON/XML template and API/auth contract when available. `EXTERNAL`.
4. Version/hash the official contract fixtures and map EVO data to them. `EVO`.
5. Run one controlled TEST registration and capture correlation ID + returned URI. `EVO + EXTERNAL`.
6. Add protected registration-state storage and audit evidence before production writes. `EVO`.
7. Complete secure NFC physical pilot and evidence package. `EVO + HARDWARE`.
8. Complete ISO/IEC 27001 ISMS evidence and independent certification audit. `EVO + CERTIFICATION BODY`.

## Commercial rule

EVO UI and sales material may use wording such as **readiness**, **requirements mapping**, **Registry-ready architecture**, **missing data** and **technical preparation**.

Never display `EU Certified`, `Battery Passport Certified`, `EU DPP Certified Provider` or equivalent wording merely because EVO's readiness score is 100% or because the Registry preparation adapter is implemented.

## Official references tracked

- Regulation (EU) 2023/1542, Articles 77–78.
- European Commission, Digital Product Passport Registry, operational from 20 July 2026.
- European Commission, DPP Registry User Guide for Economic Operators v1.01, 28 July 2026.
- European Commission, Digital Batteries Passport — data points by category, updated August 2026.
- Commission Implementing Decision (EU) 2026/1736 on harmonised DPP standards.
