# EVO ISMS — ISO/IEC 27001 Readiness

Status: **management-system implementation / not ISO certified**

Baseline: ISO/IEC 27001:2022 + Amendment 1:2024 (climate action changes).

## Purpose

This directory is the controlled starting point for the EVO Protocol Information Security Management System (ISMS). It converts existing technical security controls into auditable management-system evidence.

Nothing in this directory authorizes the claim `ISO certified`, `ISO compliant` or equivalent. Certification requires an independent accredited certification process.

## Proposed ISMS scope

> Design, development, deployment, operation and support of EVO Protocol cloud and web services used to create, store, update, verify and export digital proofs, digital product passports, lifecycle evidence, issuer evidence, DPP Registry integration metadata and secure NFC verification evidence.

### In-scope systems

- `lionelricca/evo-protocol` source repository and GitHub Actions;
- production Supabase project used by EVO;
- PostgreSQL schema, RLS, authoritative RPCs and migrations;
- Supabase Edge Functions;
- EVO public web application / GitHub Pages delivery surface;
- authentication/wallet integration logic controlled by EVO;
- checkout/credit logic;
- DPP Registry adapters and registration evidence maintained by EVO;
- NFC server verifier, replay authority and key-handling process;
- operational documentation, incident records, risk records and audit evidence.

### Initially out of scope

- customer internal systems not administered by EVO;
- wallet providers and blockchain networks except as third-party dependencies;
- European Commission systems except the EVO-controlled integration boundary;
- NXP manufacturing/provisioning infrastructure except EVO's own provisioning procedure;
- certification-body systems;
- physical customer premises.

Out-of-scope dependencies remain subject to supplier/dependency risk management.

## Organizational context

### Internal issues

- small operating team / concentration of privileged knowledge;
- rapid release cadence;
- security-sensitive cryptographic and lifecycle claims;
- public repository with production-adjacent code;
- need to separate product readiness from certification/legal claims;
- customer trust depends on verifiable evidence and continuity.

### External issues

- EU Digital Product Passport and Battery Passport regulation;
- DPP Registry technical evolution;
- cloud/SaaS dependency on Supabase and GitHub;
- dependency on wallet/browser ecosystems;
- secure NFC hardware/tooling suppliers;
- cybersecurity threats against public verification and issuer workflows;
- contractual/privacy obligations from future enterprise customers.

### Climate-change consideration — Amendment 1:2024

EVO shall evaluate at least annually whether climate change is a relevant issue to the ISMS and whether interested parties have climate-related requirements relevant to information security or service continuity.

Current working conclusion: climate change is **relevant primarily to service continuity and supplier resilience**, including regional cloud outages, power/network disruption, customer continuity expectations and supplier concentration. The ISMS therefore treats geographic resilience, backup/restore capability and supplier continuity as risk considerations. This conclusion must be reviewed at management review and when the hosting architecture materially changes.

## Interested parties

| Party | Security-related need |
|---|---|
| EVO management/owner | controlled risk, continuity, trustworthy claims and recoverability |
| Customers / economic operators | confidentiality, integrity, availability, evidence portability and incident transparency |
| Verification users | accurate status, non-misleading claims and safe public endpoints |
| EU authorities / Registry | correct registration metadata and controlled operator authority |
| Cloud/code suppliers | proper credential use and compliance with service terms |
| Certification body / auditor | objective evidence of ISMS operation and continual improvement |
| Regulators / data subjects | applicable privacy, security and retention obligations |

## ISMS objectives — initial

1. Maintain **0 unresolved critical security findings** in production.
2. Maintain documented ownership and risk treatment for all high risks.
3. Run security gates on every release candidate.
4. Keep production secrets outside repository/browser bundles.
5. Test backup/restore and incident procedures on a defined schedule.
6. Maintain auditable change/deployment evidence.
7. Prevent unsupported security, regulatory and certification claims.
8. Complete an internal ISMS audit and management review before engaging a certification body.

## Roles

Until the organization expands, one person may hold multiple roles, but each responsibility must remain explicit:

- **ISMS accountable owner** — approves scope, risk acceptance and management review;
- **Security/technical owner** — implements controls, vulnerability/change management and evidence;
- **Incident coordinator** — owns incident classification, response and post-incident review;
- **Supplier owner** — reviews critical providers and continuity risks;
- **Internal auditor** — must audit objectively; certification preparation should use an independent reviewer where self-review would compromise objectivity.

## Controlled evidence already present

Examples of evidence available in the repository/production today:

- pinned GitHub Actions;
- Security Gate and focused functional workflows;
- atomic PostgreSQL authority tests;
- RLS and explicit deny policies;
- production Security Advisor checks;
- documented source/bundle hashes;
- production deployment closeouts;
- migration immutability controls;
- restricted CORS rollout;
- cryptographic NXP test vectors;
- fail-closed DPP Registry adapter;
- anti-replay NFC authority;
- prohibited-claims guidance.

## Required review cycle

- risk register: quarterly and after major incidents/architecture changes;
- asset inventory: monthly or upon material change;
- supplier review: at least annually and before adding a critical supplier;
- access review: quarterly;
- internal audit: at least annually before certification/surveillance;
- management review: at least annually and before initial certification audit;
- incident/BCP tests: at least annually, with corrective actions tracked.
