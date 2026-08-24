# EVO ISMS Risk Treatment Plan — V0.1

Review date: 2026-08-24

Target alignment: ISO/IEC 27001:2022 readiness.

Status: management treatment plan for the risks already identified in `RISK_REGISTER.md`. It does not assert that treatments are fully effective, residual risk is accepted, or ISO certification has occurred.

## Governance rules

- Accountable risk owner for the current founder-led stage: **EVO Management** unless superseded by a formally assigned role.
- Treatment owner may be EVO Management, engineering/operations, or a future external assurance provider depending on the action.
- A missing control is a treatment gap, not a reason to mark a risk non-applicable.
- Residual likelihood/impact are left **PENDING FORMAL ASSESSMENT** until treatment effectiveness has enough evidence to score them responsibly.
- Risk acceptance requires management rationale, review date and evidence; it is not implied by leaving a risk open.

## Treatment status vocabulary

- `MITIGATING` — meaningful controls exist, but treatment/evidence is incomplete.
- `OPEN` — treatment work is primarily still pending.
- `EXTERNAL_DEPENDENCY` — EVO has preparation/controls, but a key completion condition depends on an external authority/provider.
- `ASSURANCE_PENDING` — implementation exists but independent assurance is required before the intended high-assurance claim.

## Treatment table

| Risk | Owner | Current status | Existing treatment / evidence | Remaining treatment gate | Residual score |
| --- | --- | --- | --- | --- | --- |
| R-001 Secret exposed in source/client | EVO Management | MITIGATING | server-side secret rules; browser-secret prohibition; access/secret procedure; CI/security reviews | verify privileged secret inventory, MFA and first rotation/access review | PENDING FORMAL ASSESSMENT |
| R-002 Unauthorized DPP/product modification | EVO Management | MITIGATING | server authorization, signed flows, RLS/RPC authority and Security Gate | clean-browser production E2E + independent pentest | PENDING FORMAL ASSESSMENT |
| R-003 Customer wallet key compromise attributed to EVO | EVO Management | MITIGATING | explicit non-custody; seed/private-key collection prohibited; wallet signer treated external | UX/support operating evidence + pentest review of wallet flows | PENDING FORMAL ASSESSMENT |
| R-004 Forged ownership/lifecycle event | EVO Management | MITIGATING | current-owner checks, signed events, transfer state machine, atomic authority tests | production E2E and independent security review | PENDING FORMAL ASSESSMENT |
| R-005 Replay of signed state | EVO Management | MITIGATING | nonces/expiry/state controls and NFC atomic counter authority | broader production abuse/replay E2E + pentest | PENDING FORMAL ASSESSMENT |
| R-006 Silent rewrite of historical trust state | EVO Management | MITIGATING | Evidence Root/continuity model, authority constraints, release evidence | backup/restore integrity exercise + independent review | PENDING FORMAL ASSESSMENT |
| R-007 AI Guardian misleading authenticity conclusion | EVO Management | MITIGATING | evidence/AI separation and explicit bounded claims | live UX review and future model-governance operating evidence | PENDING FORMAL ASSESSMENT |
| R-008 Copied public QR / counterfeit | EVO Management | OPEN | QR explicitly discovery-only; secure NFC V4.6 software authority ready | genuine NTAG 424 DNA/TagTamper physical pilot; approve only tested tags | PENDING FORMAL ASSESSMENT |
| R-009 NFC secret compromise | EVO Management | MITIGATING | server-side keys; no AES keys in public table/source; per-tag/diversified target; revocation procedure | physical provisioning/key-rotation evidence and future KMS/HSM decision for scale | PENDING FORMAL ASSESSMENT |
| R-010 Cloud/database outage | EVO Management | OPEN | continuity procedure and internal RPO/RTO targets | real restore exercise, measured RPO/RTO and provider backup-plan verification | PENDING FORMAL ASSESSMENT |
| R-011 Loss/corruption of DPP data | EVO Management | OPEN | deterministic authority/evidence, continuity procedure, export expectations | database restore/integrity reconciliation exercise | PENDING FORMAL ASSESSMENT |
| R-012 Supplier compromise | EVO Management | MITIGATING | supplier procedure + material supplier register + pinned Actions/DePay release | formal due diligence, MFA/account verification, exit/recovery evidence | PENDING FORMAL ASSESSMENT |
| R-013 Dependency/supply-chain vulnerability | EVO Management | MITIGATING | lockfile, SPDX SBOM, pinned Actions, vulnerability procedure | recurring advisory review + broader vendored/SaaS inventory assurance | PENDING FORMAL ASSESSMENT |
| R-014 Administrator account takeover | EVO Management | OPEN | least privilege/MFA policy + initial privileged-access register | verify GitHub/Supabase/DNS/payment admins + MFA; first quarterly access review | PENDING FORMAL ASSESSMENT |
| R-015 Excessive personal-data collection | EVO Management | MITIGATING | minimization/privacy design and classification standard | formal retention/privacy review before enterprise scale | PENDING FORMAL ASSESSMENT |
| R-016 DPP vendor lock-in | EVO Management | MITIGATING | open/export architecture, interoperable identifiers and fail-closed registry adapter | demonstrate export/exit workflow against final Battery Registry contract | PENDING FORMAL ASSESSMENT |
| R-017 Incorrect certification/compliance claim | EVO Management | MITIGATING | project-truth tests, disclosure boundaries, evidence index and SoA preparation method | management claim-review process + external legal/certification evidence before regulated claims | PENDING FORMAL ASSESSMENT |
| R-018 Battery Passport inaccurate/stale | EVO Management | EXTERNAL_DEPENDENCY | lifecycle/update model, timestamps, customer responsibility boundary | final Battery semantic catalogue/schema + real customer data governance workflow | PENDING FORMAL ASSESSMENT |
| R-019 Sensitive DPP access-control failure | EVO Management | MITIGATING | public/private separation, RLS/server authorization tests | final regulated access-right model + pentest | PENDING FORMAL ASSESSMENT |
| R-020 Continuity chain fork on concurrent writes | EVO Management | MITIGATING | active-child constraints, stale-state checks, atomic Reality Continuity authority tests | production concurrency/restore regression evidence + pentest | PENDING FORMAL ASSESSMENT |
| R-021 Evidence Root semantics change without versioning | EVO Management | MITIGATING | versioned canonical schemas, deterministic test vectors and release gates | formal change-control evidence across future semantic versions | PENDING FORMAL ASSESSMENT |
| R-022 Security incident mishandled | EVO Management | OPEN | incident-response procedure and disclosure policy | execute tabletop, record results/corrective actions and repeat periodically | PENDING FORMAL ASSESSMENT |
| R-023 Cannot demonstrate controls at ISO audit | EVO Management | MITIGATING | ISMS scope/policy/risk/assets/classification/procedures/registers/evidence index/SBOM/CI | formal SoA, recurring operating evidence, internal audit, management review | PENDING FORMAL ASSESSMENT |
| R-024 Future EU DPP-provider requirements differ | EVO Management | EXTERNAL_DEPENDENCY | regulatory watch, fail-closed adapter, modular architecture, current Commission documentation | monitor delegated/implementing acts and provider-certification requirements; map once final | PENDING FORMAL ASSESSMENT |

## Highest-priority treatment gates

### P0 — protect roots of trust

1. enable GitHub `main` branch/ruleset protection and require current gates;
2. verify privileged account inventory and MFA;
3. preserve recurring production security configuration evidence;
4. execute genuine physical NFC pilot before any physical-grade claim.

### P1 — prove recoverability and commercial operation

5. perform database/source restore exercise and measure RPO/RTO;
6. perform clean-browser production E2E;
7. perform controlled paid purchase → credit → consumption/idempotency E2E;
8. run incident tabletop and capture corrective actions.

### P2 — independent assurance / certification readiness

9. perform supplier due diligence and residual-risk approval;
10. complete formal SoA from an authorised copy of the standard;
11. perform internal audit and management review;
12. commission independent penetration/security assessment and close findings;
13. engage an appropriately accredited certification body only after operating evidence is mature.

## Treatment acceptance rule

A risk may be marked `ACCEPTED` only when the record includes:

```text
risk_id=
residual_likelihood=
residual_impact=
residual_score=
acceptance_rationale=
compensating_controls=
accepted_by=
accepted_at=
next_review=
evidence_refs=
```

No risk in this V0.1 plan is marked accepted merely because controls exist.

## Review cadence

Review this plan:

- at least quarterly during certification preparation;
- after a material incident;
- after significant architecture/provider/regulatory change;
- before internal audit and management review;
- before Stage 1 certification audit.
