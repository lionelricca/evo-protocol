# EVO ISMS Scope — Controlled Readiness Baseline V1.0

Target baseline: **ISO/IEC 27001:2022 + Amendment 1:2024**.  
Status: defined for readiness; formal management-review approval remains required before certification.

## Scope statement

The EVO ISMS covers the design, development, deployment, operation and support of EVO Protocol cloud/web services used to create, store, process, update, verify and export Digital Product Passport records, product identity evidence, lifecycle records, document provenance, continuity proofs, issuer/organization evidence and secure NFC verification evidence.

## In-scope services

- EVO Seal, Origin, Passport and Service Proof;
- EVO Pulse/Challenge and Reality Continuity;
- EVO Guardian within its non-authoritative boundary;
- Battery Passport / DPP readiness services;
- EU DPP Registry integration metadata/adapter controlled by EVO;
- secure NFC server verification, binding/counter registry and EVO provisioning process;
- public verification interfaces;
- checkout/credit entitlement logic.

## In-scope information

Product/document/battery data; issuer/account/organization identifiers; public wallet addresses/signatures; hashes/evidence roots; lifecycle/ownership/service records; restricted DPP information where enabled; security/operational logs; customer configuration/integration metadata; NFC public tag/UID/Seal/counter metadata; Registry evidence metadata; ISMS risk/audit/incident records.

Cryptographic NFC secret keys and privileged service credentials are in scope as `SECRET` assets even though they must never be stored in the public repository/browser/public database.

## In-scope technology

- `lionelricca/evo-protocol` and GitHub Actions;
- Supabase production PostgreSQL/migrations/RLS/RPCs/Edge Functions;
- GitHub Pages / EVO-controlled public delivery;
- EVO-controlled DNS/domains;
- administrator endpoints/accounts;
- backup/export locations when introduced;
- approved NFC provisioning tooling.

## People and physical/remote boundary

Management, developers/security administrators, support and approved contractors with in-scope access are covered. EVO is primarily cloud-operated; the boundary also includes administrator workstations and any location/device used to hold or provision NFC trust material.

## Critical dependencies

GitHub, Supabase, DNS/domain providers, wallet/blockchain signature ecosystems, European Commission DPP Registry/onboarding systems, NXP secure NFC/provisioning tooling, future KMS/HSM and external auditors/certification bodies.

Third-party systems remain outside direct EVO administrative control but are subject to supplier/dependency risk management.

## Customer/external responsibility boundaries

EVO does not directly control customer ERP/internal systems, customer wallet private keys, factual truth of customer data, third-party platform security beyond the integration boundary, physical authenticity without approved physical binding, or authority/certification-body infrastructure.

Exclusions cannot be used to avoid risks EVO owns at its service/integration boundary.

## Organizational context

Internal issues include rapid release cadence, security-sensitive cryptographic/lifecycle claims, a small-team concentration risk, a public source repository and the need to separate technical evidence from legal/regulatory/AI claims.

External issues include EU Battery/DPP regulation, evolving Registry interfaces, cybersecurity threats, supplier concentration, NFC hardware trust and enterprise privacy/security expectations.

## Climate-change consideration — Amendment 1:2024

Climate change is currently considered relevant mainly to **availability, supplier resilience and business continuity**, including regional cloud/network/power disruption, extreme weather, geographic concentration and customer continuity expectations.

This conclusion and interested-party climate requirements are reviewed at least annually and whenever hosting, supplier concentration or physical provisioning materially changes.

## Security objectives

Protect confidentiality of restricted/secret information; integrity of product/lifecycle evidence; availability/recoverability of verification services; authenticity of administrative actions; traceability of critical changes; resistance to unauthorized modification/replay/credential compromise; and accuracy of public assurance claims.

## Review

Review at least annually and after material product architecture, legal entity, hosting, physical-proof, supplier or regulated-market change. Formal scope approval is recorded through management review before certification audit.
