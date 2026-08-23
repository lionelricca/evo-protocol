# EVO Protocol V4.0 · Release Checklist

A checked item means evidence exists for the exact release candidate being shipped. Do not infer completion from an older branch.

## A. Product truth

- [x] EVO Protocol is the umbrella brand.
- [x] EVO Origin is the primary document-provenance commercial wedge.
- [x] Exact-file match is separated from content truth and legal originality.
- [x] Issuer wallet, domain and organization evidence are distinct.
- [x] Public Pulse / SOFTWARE Challenge cannot elevate authoritative trust.
- [x] Implemented pricing is limited to Free / US$9.90 / US$49 pack.
- [x] Current purchase architecture does not depend on the historical EVO token.
- [x] W3C VC interoperability export is explicitly unsecured until a securing mechanism is implemented.

## B. Code consolidation

- [x] V3.3 security-hardening foundation carried into V4.0 RC.
- [x] EVO Origin provenance profile, exact-file verifier and issuer-authority UI carried forward.
- [x] Production-addressable JSON-LD/schema identifiers replace placeholder EVO domains.
- [x] V4 homepage/product positioning audited and bilingual mappings added for the Origin-first copy.
- [x] Service Proof creation shares the per-Seal Asset Authority lock; provider countersigning is serialized and retry-safe.
- [x] Reality Continuity checkpoint commit now shares the per-Seal Asset Authority lock and revalidates live evidence/current owner/chain parent inside the database transaction.
- [x] Exact-origin browser CORS covers Passport Event, Service Proof, Reality Continuity and Document Lifecycle in addition to checkout/Seal/wallet/issuer/domain/organization.
- [ ] Complete compatibility decision for the two remaining mixed-action endpoints: **Passport Transfer** and **Battery Passport**.
- [ ] Dead/legacy product copy and unreachable code audited after final UI smoke test.

## C. Automated verification

Fully green V4.0 RC baseline confirmed on commit `b8c4312934a8c2c490084fefc3b22e7f4ea80f67`:

- [x] EVO Security Gate.
- [x] EVO Release Readiness checks.
- [x] EVO Release Bundle.
- [x] EVO Document Proof checks.
- [x] EVO Service Proof checks.
- [x] EVO navigation checks.
- [x] EVO navigation V2.7.3 checks.
- [x] EVO Origin provenance / exact-file / issuer-authority tests.
- [x] V4 project-truth and W3C VC unsecured-export tests.
- [x] V4 Service Proof Authority static + PostgreSQL runtime tests.
- [x] V4 Reality Continuity Authority static + PostgreSQL runtime tests.
- [x] Expanded CORS regression test.
- [x] PostgreSQL 17 atomic/concurrency suites.

Any commit after this baseline must pass the same full gate again before release.

## D. Real browser smoke test

- [ ] Open EVO from a clean browser session.
- [ ] Connect MetaMask/wallet successfully.
- [ ] Confirm silent session restoration does not create unauthorized persistent identity state.
- [ ] Confirm Free Proof availability for an eligible first-use wallet.
- [ ] Create one real EVO Proof through the atomic registration path.
- [ ] Verify the generated public QR/link.
- [ ] For a document, verify exact-file match and modified-file mismatch.
- [ ] Confirm revoked/superseded version messaging where test data exists.
- [ ] Confirm declared issuer naming vs active organization verification.
- [ ] Confirm ES/EN critical wording.
- [ ] Test paid checkout/recovery only with a controlled transaction and explicit production authorization.

## E. Backend production gate — explicit approval required

Read-only inventory is documented in `docs/PRODUCTION_INVENTORY_V400.md`.

- [x] Production migration/function inventory reviewed read-only.
- [x] Production drift identified: Service Proof authoritative RPCs are not deployed; production Service Proof still uses a direct write path.
- [x] Production drift identified: Reality Continuity production v4 still directly inserts checkpoints after Edge-side checks.
- [ ] Deploy V4 Service Proof Authority migration before matching `evo-service-proof` Edge Function.
- [ ] Deploy V4 Reality Continuity Authority migration before matching `evo-reality-continuity` Edge Function.
- [ ] Confirm/deploy any remaining branch-only Checkout Privacy / CORS / lifecycle function changes in dependency order.
- [ ] Run post-deployment read-only RLS/RPC/security audit.
- [ ] Confirm zero orphan credit consumption and paid-credit counter consistency.
- [ ] After a successful real atomic Seal creation, retire the legacy service-role credit RPC if compatibility permits.

## F. Repository/release integrity

- [ ] Protect `main`.
- [ ] Require Security Gate and critical functional checks before merge.
- [x] GitHub Actions remain pinned to immutable commit SHAs under the Security Gate.
- [ ] Decide repository licensing/copyright policy explicitly; do not infer an open-source license.
- [x] Stale stacked PRs #33, #43, #44, #45 and #46 were closed unmerged after consolidation into PR #49.
- [ ] Create final release/tag only after merge and production smoke verification.

## G. Historical production data

- [ ] Resolve historical duplicate test identity `V1-TEST-001` using an auditable lifecycle action.
- [x] No historical production record was silently deleted or mutated during RC consolidation.

## H. High-assurance / enterprise claims

These are not blockers for the first commercial pilot, but are blockers for stronger assurance claims:

- [ ] Header-capable production edge provides response CSP, HSTS, `frame-ancestors`, `X-Content-Type-Options` and reviewed Permissions-Policy.
- [ ] Narrow remaining CSP `connect-src`, `frame-src` and style-attribute allowances after compatibility inventory.
- [ ] Independent penetration/security review completed and findings remediated.
- [ ] Formal ISO/IEC 27001 scope/gap assessment started if commercially justified.
- [ ] Accredited/qualified trust-service integrations validated before corresponding claims appear in UI.

## Release decision

V4.0 can be called **commercial pilot ready** when applicable sections A–G are complete and the owner explicitly authorizes production deployment/merge.

It must not be called “unhackable”, “100% secure”, “legally original”, “W3C certified”, “ISO certified” or “qualified” without independent evidence supporting that exact statement.
