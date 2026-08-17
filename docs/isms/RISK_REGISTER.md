# EVO ISMS Risk Register — Initial Draft V0.1

Scoring model:

- Likelihood: 1–5
- Impact: 1–5
- Inherent risk = Likelihood × Impact

This is an initial management register and must later include owners, target dates, residual-risk scores and formal risk acceptance.

| ID | Risk | Likelihood | Impact | Inherent | Initial treatment |
|---|---|---:|---:|---:|---|
| R-001 | Production service credential exposed in source code or client | 3 | 5 | 15 | Server-side secrets only; repository scanning; rotation procedure |
| R-002 | Unauthorized modification of DPP/product records | 3 | 5 | 15 | Server-side authorization; signatures; restricted write paths; audit logging |
| R-003 | Customer wallet private key compromise attributed to EVO | 2 | 5 | 10 | Never custody customer private keys; explicit UX and documentation |
| R-004 | Forged ownership/lifecycle event | 3 | 5 | 15 | Current-owner verification; signature validation; two-party transfer flow |
| R-005 | Replayed challenge or signed state | 3 | 4 | 12 | Expiration; one-time consumption; replay audit; continuity parent uniqueness |
| R-006 | Silent rewrite of historical trust state | 3 | 5 | 15 | Evidence Roots; signed Proof of Continuity; immutable audit strategy |
| R-007 | AI Guardian produces misleading authenticity conclusion | 3 | 4 | 12 | Evidence/AI separation; explainable output; explicit limitations; no binary unsupported claim |
| R-008 | Public QR copied to counterfeit product | 5 | 4 | 20 | Treat QR as discovery only; secure NFC roadmap; physical-proof evidence levels |
| R-009 | Secure NFC master/per-tag secret exposed | 2 | 5 | 10 | No frontend keys; per-tag keys; protected secret manager/KMS/HSM target; rotation/revocation |
| R-010 | Cloud/database outage makes passports unavailable | 3 | 5 | 15 | Backup/restore plan; monitoring; availability design; recovery testing |
| R-011 | Loss or corruption of DPP data | 2 | 5 | 10 | Backups; restoration tests; deterministic evidence heads; export capability |
| R-012 | Supplier compromise (GitHub/Supabase/DNS/etc.) | 3 | 5 | 15 | Supplier assessment; MFA; least privilege; dependency and incident procedures |
| R-013 | Dependency/supply-chain vulnerability | 4 | 4 | 16 | Version pinning; lockfiles where applicable; vulnerability monitoring; controlled updates |
| R-014 | Administrator account takeover | 3 | 5 | 15 | MFA; individual privileged accounts; access review; incident playbook |
| R-015 | Excessive collection of personal data | 2 | 4 | 8 | Data minimization; classification; privacy review; public Pulse excludes IP/location/fingerprint |
| R-016 | DPP architecture creates vendor lock-in contrary to regulatory expectations | 2 | 5 | 10 | Open formats; API/export; interoperable identifiers; standards compatibility |
| R-017 | Incorrect regulatory claim marketed as certified/compliant | 3 | 5 | 15 | Legal/compliance review; controlled claims; certification status register |
| R-018 | Battery Passport data inaccurate or stale | 3 | 5 | 15 | Data ownership rules; validation; update workflows; evidence timestamps; customer responsibilities |
| R-019 | Incorrect access rights expose commercially sensitive DPP data | 3 | 5 | 15 | Role/access model; private/public separation; authorization tests |
| R-020 | Continuity chain forks due to concurrent writes | 2 | 5 | 10 | One-active-child database constraint; stale-state checks; compare-and-swap flow |
| R-021 | Evidence Root semantics change without versioning | 2 | 4 | 8 | Explicit versioned canonical schemas and deterministic test vectors |
| R-022 | Security incident not detected or handled in time | 3 | 5 | 15 | Security logging; incident classification; response procedures; post-incident review |
| R-023 | Inability to demonstrate controls during ISO 27001 audit | 3 | 4 | 12 | Evidence repository; control owners; policy review records; internal audit program |
| R-024 | Future EU DPP-provider requirements differ from EVO architecture | 3 | 4 | 12 | Regulatory watch; certification-readiness matrix; modular interoperable design |

## Immediate high-priority risks

The initial treatment program should prioritize:

1. R-008 — copied QR / missing physical binding;
2. R-013 — dependency/supply-chain risk;
3. R-001 — secret exposure;
4. R-002 — unauthorized record modification;
5. R-006 — historical state rewrite;
6. R-010 — service availability;
7. R-014 — privileged-account compromise;
8. R-017 — incorrect compliance/certification claims;
9. R-018 — inaccurate or stale passport data;
10. R-019 — sensitive DPP access-control failure.

## Next maturity step

Convert this register into an auditable management record with:

- named risk owner;
- treatment owner;
- control mapping;
- treatment deadline;
- residual likelihood;
- residual impact;
- risk acceptance authority;
- evidence links;
- review date;
- status.
