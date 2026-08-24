# EVO Protocol V4.0 RC1 · Release Checklist

A checked item means evidence exists for the exact release candidate state noted below. Do not infer completion from an older branch or workflow run.

## A. Product truth

- [x] EVO Protocol is the umbrella brand.
- [x] EVO Origin is the primary document-provenance commercial wedge.
- [x] Exact-file match is separated from content truth and legal originality.
- [x] Issuer wallet, domain and organization evidence are distinct.
- [x] Public Pulse / SOFTWARE Challenge cannot elevate authoritative trust.
- [x] Implemented pricing is limited to Free / US$9.90 / US$49 pack.
- [x] Current purchase architecture does not depend on the historical EVO token.
- [x] W3C VC interoperability export is explicitly unsecured until a securing mechanism is implemented.
- [x] Free Proof is framed as one benefit per eligible user, not one benefit per wallet.

## B. Code consolidation

- [x] V3.3 security-hardening foundation carried into V4.0 RC1.
- [x] EVO Origin provenance profile, exact-file verifier and issuer-authority UI carried forward.
- [x] Production-addressable JSON-LD/schema identifiers replace placeholder EVO domains.
- [x] V4 homepage/product positioning audited and bilingual mappings added for the Origin-first copy.
- [x] Service Proof creation shares the per-Seal Asset Authority lock; provider countersigning is serialized and retry-safe.
- [x] Reality Continuity checkpoint commit shares the per-Seal Asset Authority lock and revalidates live evidence/current owner/chain parent inside the database transaction.
- [x] Exact-origin browser CORS covers checkout, Seal, wallet, issuer, domain, organization, Passport Event, Service Proof, Reality Continuity and Document Lifecycle.
- [x] Passport Transfer and Battery Passport CORS classification completed: wildcard browser CORS is intentional for their mixed public/integration surfaces; signed/authoritative mutation controls remain the security boundary. See `docs/CORS_POLICY_V400.md`.
- [x] Default commercial entrypoint reduced to Origin / Proof / Passport / Verify; dormant Guardian, Pulse and Battery DPP runtime loaders removed from the default page.
- [x] Unreachable `organization-sync.js` removed after repository-wide load/reference audit.
- [x] Final live-copy pass removed the obsolete per-wallet Free Proof wording and reinforced critical ES/EN Origin/verification copy.
- [ ] Final unreachable-code pass after all remaining real-browser blocks are complete.

## C. Automated verification

Historical immutable RC1 source-artifact baseline: `9d0512fe4b6ee50fd84f3b329fcf02afeb2a58bd`.

Source artifact from that exact baseline:

- artifact: `evo-protocol-v4-rc1-source`;
- GitHub artifact SHA-256: `53aca3251b3b15ee7820890ac6b31c7bfaabf6230d3c06ca7ad20bf3b180ece9`;
- full source-bundle Node suite at that baseline: 55/55 passing.

Current post-smoke UI/security head verified green: `e9c5c268cf0b2212436286a381bb000c853a8a44`.

All seven focused workflows completed successfully on that exact current head:

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
- [x] Final browser CORS classification regression test.
- [x] PostgreSQL 17 atomic/concurrency suites.
- [x] Explicit-connect wallet startup regression checks.
- [x] Multi-account wallet selection/re-selection regression checks.
- [x] Free Proof anti-Sybil regression checks.
- [x] Pre-signing Seal review regression checks.
- [x] Critical bilingual V4 copy regression checks.

A new final source artifact/digest must be generated from the exact promotion head before tag/release.

## D. Real browser smoke test

- [ ] Repeat the final candidate once from a genuinely clean/private browser profile before promotion.
- [x] Connect MetaMask/wallet successfully.
- [x] Confirm page load/F5 starts disconnected and shows `Conectar wallet`; no wallet is activated without an explicit user action.
- [x] Confirm changing MetaMask account updates EVO and does not retain the previous wallet dashboard data.
- [x] Confirm Free Proof availability for an eligible first-use wallet.
- [x] Create one real EVO Proof through the atomic registration path.
- [x] Confirm the real Free Proof is reserved/consumed exactly once.
- [x] Verify the generated public QR/link.
- [x] For a document, verify exact-file match.
- [x] For the same document, verify modified-file mismatch.
- [x] Confirm the exact-file verifier performs SHA-256 locally and does not require a connected wallet.
- [x] Add mandatory pre-sign review/normalization after the smoke test exposed accidental public-field content risk.
- [ ] Confirm revoked/superseded version messaging where controlled test data exists.
- [ ] Confirm declared issuer naming vs active organization verification with an organization-backed test case.
- [ ] Confirm ES/EN critical wording visually in the real browser after the final bilingual reinforcement.
- [ ] Test paid checkout/recovery only with a controlled transaction and explicit production authorization.

Real Proof used for the smoke test:

- Seal: `EVO-B8A24B42-54260524-48BBD34D`;
- expected original SHA-256: `a9566768fa58fb3e574109c30ebe1307b660f2555c3b782c9622ddb617e414c4`.

## E. Backend production gate — explicit approval required

Read-only inventory is documented in `docs/PRODUCTION_INVENTORY_V400.md`.

- [x] Production migration/function inventory reviewed read-only.
- [x] Production Security Advisor preflight: 0 security lints at audit time.
- [x] Credit/economic consistency preflight: 0 orphan credit-consumption rows.
- [x] Credit/economic consistency preflight: 0 paid-credit counter mismatches.
- [x] Free Proof anti-Sybil authority migration deployed with explicit owner authorization.
- [x] `evo-free-proof` production Edge Function deployed and observed responding successfully during the real-browser smoke test.
- [x] Free Proof browser roles denied direct table/RPC authority; RLS/ACL audit completed.
- [x] Post anti-Sybil Security Advisor audit returned 0 security lints.
- [x] Real Free Proof reservation/consumption observed exactly once for the smoke-test wallet.
- [x] Production drift identified: Service Proof authoritative RPCs are not deployed; production Service Proof still uses a direct write path.
- [x] Production drift identified: Reality Continuity production v4 still directly inserts checkpoints after Edge-side checks.
- [ ] Deploy V4 Service Proof Authority migration before matching `evo-service-proof` Edge Function.
- [ ] Deploy V4 Reality Continuity Authority migration before matching `evo-reality-continuity` Edge Function.
- [ ] Confirm/deploy any remaining branch-only Checkout Privacy / CORS / lifecycle function changes in dependency order.
- [ ] Run full post-deployment read-only RLS/RPC/Security Advisor audit after the remaining authority deployments.
- [ ] Reconfirm zero orphan credit consumption and zero paid-credit counter mismatch after the remaining authority deployments.
- [ ] Verify exact deployed function versions/hashes and record rollback targets.
- [ ] Retire the legacy service-role credit RPC only if a compatibility audit confirms it is no longer required.

## F. Repository/release integrity

- [ ] Protect `main`.
- [ ] Require Security Gate and critical functional checks before merge.
- [x] GitHub Actions remain pinned to immutable commit SHAs under the Security Gate.
- [ ] Decide repository licensing/copyright policy explicitly; do not infer an open-source license.
- [x] Stale stacked PRs #33, #43, #44, #45 and #46 were closed unmerged after consolidation into PR #49.
- [ ] Generate a final source ZIP + SHA-256 from the exact promotion head.
- [ ] Create final release/tag only after merge and production smoke verification.

## G. Historical production data

- [x] `V1-TEST-001` duplicate investigated read-only and an auditable resolution plan documented in `docs/V1_TEST_001_RESOLUTION.md`.
- [ ] Execute the `V1-TEST-001` lifecycle resolution only after explicit owner authorization.
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
