# EVO ISMS — Asset Inventory

Status: working controlled inventory. Review owner/date fields during each ISMS review.

| Asset | Type | Criticality | Owner | Primary security concern | Current evidence/control |
|---|---|---:|---|---|---|
| `lionelricca/evo-protocol` | source/code | Critical | EVO | unauthorized change, secret leakage, supply-chain compromise | public repo, PR workflow, pinned Actions, Security Gate, release bundles |
| GitHub account/repository administration | identity/control plane | Critical | EVO | account takeover, direct push, destructive changes | MFA/account controls external; branch protection still to be enabled |
| GitHub Actions | CI/CD | High | EVO | workflow compromise, untrusted dependency | immutable action SHAs, read-limited permissions, automated gates |
| Supabase production project | cloud platform | Critical | EVO | privileged compromise, data loss, service outage | RLS, explicit grants, advisors, authoritative RPCs, Edge Functions |
| PostgreSQL production database | data | Critical | EVO | unauthorized read/write, integrity loss | RLS, service-role authority, migrations, atomic/concurrency tests |
| Supabase service-role / secret keys | secret | Critical | EVO | full backend privilege compromise | server-side only; never browser/repo; rotation required after suspected compromise |
| EVO NFC per-tag AES material | cryptographic secret | Critical | EVO | physical-proof forgery | server secret/env only for pilot; no database/public storage; KMS/HSM target |
| EVO NFC tag registry | trust metadata | High | EVO | replay/binding manipulation | RLS deny-all, server-only RPC, tag+UID+Seal+counter authority |
| EVO public website | service | High | EVO | XSS, phishing, misleading verification | CSP/browser shield, local assets, release tests, restricted origin rules where applicable |
| Wallet integration | client trust boundary | High | EVO | wrong account/signature, stale session | explicit connect, account-change tests, prepare/commit signing flows |
| Checkout and credits | economic data | High | EVO | double spend/credit abuse, privacy | atomic registration, rate limits, Free Proof anti-Sybil controls, consistency checks |
| EVO Seal records | integrity data | Critical | EVO | duplicate/unauthorized lifecycle mutation | signed registration/lifecycle, identity guard, authority controls |
| EVO Passport events/transfers | integrity data | High | EVO | unauthorized ownership/history change | signed events, state machine, transfer authority tests |
| EVO Origin/document proofs | evidence data | High | EVO | false originality claim, wrong file match | local SHA-256 exact-file verification, issuer authority separation |
| Service Proof | evidence data | High | EVO | false service record/countersign | authoritative RPC, provider/wallet checks, atomic countersign |
| Reality Continuity | evidence data | High | EVO | false checkpoint/continuity | authoritative RPC, owner/evidence/parent revalidation |
| Battery Passport data | regulated product data | High | EVO | incomplete/incorrect DPP data, access leakage | public/restricted block separation, signed model/passport authority |
| EU DPP Registry adapter | regulatory integration | High | EVO | wrong operator/UPI, duplicate registration, credential exposure | server-only fail-closed adapter, fingerprints, environment separation |
| DPP Registry credentials (future) | secret/external identity | Critical | EVO | unauthorized regulatory registration | not yet stored/used; must remain server-side and environment-separated |
| NXP NTAG 424 DNA pilot tags | physical trust anchor | High | EVO | cloning, default keys, provisioning error | physical pilot pending; unique per-tag keys and destructive tests required |
| Release artifacts/hashes | audit evidence | Medium | EVO | loss of source-to-release traceability | version-aware bundles, source commit and SHA-256 manifest |
| ISMS records | management evidence | High | EVO | inability to demonstrate governance | version-controlled policies, risks, audit and management-review records |
| Critical supplier: Supabase | supplier | Critical | EVO | outage/security incident/vendor dependency | supplier review + backup/export/restore strategy required |
| Critical supplier: GitHub | supplier | Critical | EVO | source/CI outage or account compromise | supplier review + local/export recovery procedure required |
| Critical supplier: NXP / provisioning tools | supplier | High | EVO | hardware/tooling availability or trust issue | approved hardware/tooling list required before pilot |
| Critical supplier: EU DPP Registry | external authority | High | EVO | API/schema/outage/regulatory change | fail-closed integration, daily regulatory watch, local passport remains authoritative |

## Classification model

- **PUBLIC** — intentionally public and integrity controlled.
- **INTERNAL** — operational information not intended for public release.
- **CONFIDENTIAL** — customer, security or business information requiring controlled access.
- **SECRET** — credentials/cryptographic material whose disclosure can directly compromise authority.

## Handling rules

1. `SECRET` material is never committed to GitHub or embedded in browser bundles.
2. Production data exports and backups are treated at least `CONFIDENTIAL`.
3. Cryptographic keys and privileged tokens require explicit owner, rotation trigger and revocation procedure.
4. Asset retirement must include access/key revocation and evidence retention decisions.
5. New critical assets or suppliers require a risk review before production use.
