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
- [x] EVO Origin provenance profile carried forward.
- [x] Local exact-file verifier carried forward.
- [x] Origin issuer-authority UI carried forward.
- [x] Production-addressable JSON schema IDs replace placeholder EVO domains.
- [x] V4 homepage/product positioning audited and bilingual mappings added for the new Origin-first copy.
- [ ] Remaining authority/mutation endpoints classified for CORS compatibility.
- [ ] Dead/legacy product copy and unreachable code audited after final UI smoke test.

## C. Automated verification

Verified green on V4.0 RC head `630ffb4c2bc816abe5d87c711de97e2f4d75005e`:

- [x] EVO Security Gate.
- [x] EVO Document Proof checks.
- [x] EVO Service Proof checks.
- [x] EVO navigation checks.
- [x] EVO navigation V2.7.3 checks.
- [x] EVO Origin provenance test.
- [x] EVO Origin exact-file verifier test.
- [x] EVO Origin issuer-authority test.
- [x] V4.0 project-truth/release-contract test.
- [x] W3C VC Data Model unsecured-export boundary test.
- [x] PostgreSQL 17 atomic/concurrency suite.

## D. Real browser smoke test

Run from the actual official frontend, not only CI:

- [ ] Open EVO from a clean browser session.
- [ ] Connect MetaMask/wallet successfully.
- [ ] Confirm silent session restoration does not create unauthorized persistent identity state.
- [ ] Confirm Free Proof availability for an eligible first-use wallet.
- [ ] Create one real EVO Proof through the atomic registration path.
- [ ] Verify the generated public QR/link.
- [ ] For a document, drop the exact local file and receive exact-match status.
- [ ] Modify one byte / use a different file and receive mismatch status.
- [ ] Confirm revoked/superseded version messaging where test data exists.
- [ ] Confirm issuer name is labelled declared unless organization evidence is active.
- [ ] Confirm English/Spanish switch preserves all critical product/security wording.
- [ ] Test paid checkout/recovery with a deliberately small controlled transaction only when production deployment is authorized.

## E. Backend production gate — explicit approval required

Before deployment, compare Git migration history with the observed production migration history.

- [ ] Review which V3.3.x migrations/functions are already deployed versus branch-only.
- [ ] Deploy any required database migration before the Edge Function that depends on it.
- [ ] Deploy V3.3.15 Document Lifecycle only after explicit approval.
- [ ] Deploy V3.3.17 Checkout Privacy only after explicit approval.
- [ ] Deploy V3.3.18 Origin/CORS-dependent functions together with the shared helper only after official origins are confirmed.
- [ ] Run post-deployment read-only RLS/RPC/security audit.
- [ ] Confirm no orphan credit consumption and no paid-credit counter mismatch.
- [ ] After a successful real atomic Seal creation, retire the legacy service-role credit RPC if compatibility permits.

## F. Repository/release integrity

- [ ] Protect `main`.
- [ ] Require Security Gate and critical functional checks before merge.
- [x] GitHub Actions remain pinned to immutable commit SHAs under the Security Gate.
- [ ] Decide repository licensing/copyright policy explicitly; do not infer an open-source license.
- [x] Stale stacked PRs #33, #43, #44, #45 and #46 were closed unmerged after their useful/corrected content was consolidated into PR #49.
- [ ] Create final release/tag only after merge and production smoke verification.

## G. Historical production data

- [ ] Resolve historical duplicate test identity `V1-TEST-001` using an auditable lifecycle action.
- [x] No historical production record was silently deleted or mutated during RC consolidation.

## H. High-assurance/enterprise claims

These are **not blockers for the first commercial pilot**, but they are blockers for stronger security/certification claims:

- [ ] Header-capable production edge provides response CSP, HSTS, `frame-ancestors`, `X-Content-Type-Options` and reviewed Permissions-Policy.
- [ ] Remaining CSP `connect-src`, `frame-src` and style-attribute allowances are narrowed after wallet/payment compatibility inventory.
- [ ] Independent penetration test completed and findings remediated.
- [ ] Formal ISO/IEC 27001 scope/gap assessment started if commercially justified.
- [ ] Any accredited/qualified trust-service integration is validated before corresponding claims appear in UI.

## Release decision

V4.0 can be called **commercial pilot ready** when sections A–G that apply to the pilot are complete and the owner explicitly authorizes the production deployment/merge.

It must not be called “unhackable”, “100% secure”, “legally original”, “W3C certified”, “ISO certified” or “qualified” without independent evidence supporting that exact statement.
