# EVO Go-to-Market + Certification Roadmap

Status: commercial strategy / August 2026

## Strategic decision

EVO should not initially sell blockchain, crypto, AI or generic digital seals.

The first commercial wedge is **regulated Digital Product Passport infrastructure**, beginning with **EU Battery Passports**.

The product should be positioned as:

> **EVO Battery Passport — Create, maintain and verify compliant battery passports without building your own DPP infrastructure.**

The customer already has a compliance problem. EVO's job is to make EVO the easiest, safest and most defensible way to solve it.

## Why batteries first

Battery passports are a strong beachhead because the product category combines:

- regulatory urgency;
- high-value physical assets;
- long product lifecycles;
- maintenance, reuse, remanufacturing and recycling events;
- multiple supply-chain actors;
- structured technical data;
- strong need for traceability and access control;
- natural value from QR and secure NFC binding;
- recurring updates rather than a one-time certificate.

This maps directly to EVO Seal, Passport, Proof of Continuity, Issuer Trust and Guardian.

## Target customers

Prioritize companies large enough to have compliance pain but small enough not to build their own DPP stack:

- battery pack manufacturers;
- industrial battery assemblers;
- stationary-energy-storage suppliers;
- EV and LMT battery suppliers;
- importers into the EU;
- private-label battery brands;
- remanufacturers and second-life operators;
- distributors that assume economic-operator responsibilities.

## Self-selling funnel

### Step 1 — Free DPP Readiness Scan

The prospect enters:

- battery category;
- capacity;
- destination market;
- manufacturer/importer role;
- current product identifiers;
- available lifecycle and technical data.

EVO returns:

- likely passport applicability;
- missing-data checklist;
- readiness score;
- sample passport preview;
- estimated implementation scope.

This is the lead-generation engine.

### Step 2 — Fixed-price pilot

A paid pilot covers 1–10 battery models and produces:

- structured product identity;
- DPP dataset;
- QR carrier;
- public/private access layers;
- lifecycle update workflow;
- Evidence Root;
- Proof of Continuity;
- export/API package;
- registry integration when applicable.

### Step 3 — EVO Compliance Cloud

Recurring SaaS pricing can combine:

- monthly platform fee;
- active passport count;
- passport issuance volume;
- API usage;
- enterprise connectors;
- support/SLA;
- secure NFC provisioning.

### Step 4 — Premium trust layer

For high-value products:

- Proof of Continuity;
- secure NFC;
- tamper evidence;
- Guardian anomaly analysis;
- warranty/resale/second-life history.

## Certification strategy

Certification is part of the product strategy, not an afterthought.

### Priority 1 — ISO/IEC 27001:2022

Target: obtain organization-level certification for EVO's information security management system.

Commercial purpose:

- demonstrate independent security governance;
- reduce enterprise procurement friction;
- strengthen trust with manufacturers and compliance teams;
- create the management framework required for handling sensitive DPP data;
- prepare EVO for future DPP service-provider certification requirements.

Scope should eventually cover:

- EVO cloud infrastructure;
- software development lifecycle;
- access control;
- key and secret management;
- incident response;
- supplier risk;
- backups and continuity;
- vulnerability management;
- change management;
- audit logging;
- customer data handling.

### Priority 2 — DPP-provider certification readiness

The EU Ecodesign for Sustainable Products Regulation allows the European Commission to establish requirements for Digital Product Passport service providers and, where appropriate, a certification scheme.

EVO must therefore maintain a **DPP Certification Readiness Matrix** mapping every future requirement to:

- technical control;
- documented policy;
- evidence artifact;
- automated test;
- responsible owner;
- certification status.

The objective is to apply as early as possible when an official certification scheme becomes available.

EVO must never market itself as "EU-certified DPP provider" until an applicable official scheme exists and EVO has actually passed it.

### Priority 3 — Standards-conformant identifiers and carriers

Battery Passport implementation must support the applicable ISO/IEC 15459 requirements for QR/unique identifiers and remain compatible with the open/interoperable architecture required by EU law.

Where useful, EVO should support GS1 identifiers and GS1 Digital Link so customers can reuse existing product identification infrastructure rather than become locked into EVO identifiers.

This is a conformity/interoperability objective, not a claim that GS1 itself has certified EVO unless such certification is separately obtained.

### Priority 4 — ISO 9001

After ISO 27001, consider ISO 9001 for the organization if industrial and enterprise procurement makes it commercially useful.

Value:

- documented quality processes;
- corrective/preventive action discipline;
- supplier/customer process controls;
- stronger industrial procurement profile.

### Priority 5 — privacy/cloud extensions

When justified by customers and data scope, evaluate:

- ISO/IEC 27701 for privacy information management;
- ISO/IEC 27017 for cloud-security controls;
- ISO/IEC 27018 where public-cloud processing of personally identifiable information becomes material.

Do not collect certificates for marketing. Add them only when they remove a real procurement, regulatory or risk barrier.

## Certification build order

### Phase A — now

Build EVO as if an auditor will review it tomorrow:

1. define ISMS scope;
2. asset inventory;
3. information classification;
4. risk register;
5. Statement of Applicability;
6. access-control policy;
7. secure-development policy;
8. incident-response process;
9. supplier-security process;
10. backup/business-continuity process;
11. vulnerability-management process;
12. internal audit trail.

### Phase B — pre-audit

- perform gap assessment;
- close high-risk gaps;
- collect evidence;
- run internal audit;
- perform management review;
- engage accredited certification body.

### Phase C — certification

- Stage 1 audit;
- corrective actions if required;
- Stage 2 audit;
- obtain ISO/IEC 27001 certificate;
- maintain surveillance audits and continual improvement.

## Candidate certification route from Chile

Organizations such as SGS Chile and Bureau Veritas Chile currently offer ISO/IEC 27001 certification services.

Before contracting any body, EVO should verify the exact certification scope and current accreditation in the INN accredited-organizations directory or another internationally recognized accreditation chain.

The certification body must be independent from the implementation consultant to preserve audit credibility.

## Product architecture requirements driven by certification

EVO should progressively implement:

- customer tenant isolation;
- least-privilege administration;
- immutable security/audit logs;
- environment separation;
- secret rotation;
- secure NFC key separation;
- backup/restore testing;
- documented incident handling;
- data-retention controls;
- export/no-lock-in mechanisms;
- public status and security documentation;
- software bill of materials;
- dependency and vulnerability monitoring;
- deterministic cryptographic test vectors.

## Commercial trust stack

The eventual enterprise message should be:

```text
REGULATORY NEED
      ↓
EVO DPP COMPLIANCE ENGINE
      ↓
OPEN / INTEROPERABLE IDENTIFIERS
      ↓
EVIDENCE ROOT
      ↓
SIGNED PROOF OF CONTINUITY
      ↓
SECURE PHYSICAL BINDING
      ↓
ISO 27001-CERTIFIED OPERATIONS
      ↓
FUTURE EU DPP-PROVIDER CERTIFICATION
```

## Expansion markets

After batteries, reuse the same compliance core for regulated product groups as requirements become concrete:

1. iron and steel / industrial materials;
2. aluminium and tyres;
3. textiles;
4. construction products;
5. furniture;
6. ICT/electronics and other DPP categories.

Non-regulated high-value markets such as industrial spare parts, heavy equipment, calibration certificates, luxury products and resale can use the premium Proof of Continuity/NFC layer without distracting from the compliance-first beachhead.

## Strategic principle

EVO should aim to become infrastructure that customers buy because they **must prove compliance and continuity**, not because they are interested in crypto.

**Compliance gets EVO into the company. Trust infrastructure makes EVO hard to replace.**
