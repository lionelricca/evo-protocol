# EVO V4.0.0 RC1 — Release Readiness

Audit date: 2026-08-23

## Current release line

The canonical release-candidate line is `codex/evo-v400-release-candidate` / PR #49. It consolidates the V3.3.18 security foundation, EVO Origin document provenance and the V4 product/standards corrections. The older `codex/evo-v401-release-readiness` line is a source of release tooling and documentation only; useful pieces are being carried into PR #49 rather than replacing newer RC code.

## Automated verification

At the current RC head after the 2026-08-23 regression repairs, the following GitHub Actions suites completed successfully together:

- EVO Security Gate.
- EVO Document Proof checks.
- EVO Service Proof checks.
- EVO navigation checks.
- EVO navigation V2.7.3 checks.

The Security Gate covers JavaScript/Edge syntax, product-truth and interoperability assertions, browser/CSP regressions, local QR supply-chain checks, checkout verification/privacy, origin/CORS policy, domain/wallet/issuer/organization abuse bounds, Reality Continuity, Service Proof authority, atomic Seal registration, duplicate active asset identity protection, transfer state machine, Battery Passport atomicity and PostgreSQL concurrency/invariant checks.

## Ready in code

- Silent authorized-wallet session restore without storing private keys.
- EVO Proof entitlement and signed private balance read.
- Multi-network USDC settlement verification with replay/idempotency controls.
- Atomic Seal + entitlement registration path.
- Active duplicate asset identity guard.
- EVO Origin exact-file SHA-256 verification and document provenance/version semantics.
- Document Proof and authoritative document lifecycle path.
- Service Proof with distinct owner/provider trust semantics, authoritative atomic RPCs and provider inbox.
- Asset ownership authority lock and atomic transfer state machine.
- Battery Passport atomic registration.
- Public Pulse/Challenge signals prevented from elevating authoritative trust by themselves.
- Restricted-origin browser policy on Passport Event, Service Proof, Reality Continuity and Document Lifecycle, in addition to the earlier guarded checkout/Seal/wallet/issuer/domain/organization endpoints.
- Local vendored QR implementation.
- Explicit `UNSECURED_EXPORT` boundary for the current W3C VC Data Model mapping.

## Not equivalent to production readiness

A green branch does not prove that every corresponding migration/function is deployed. Before calling this release production-hardened, verify the deployment inventory independently.

The following items remain open release gates:

1. Protect GitHub `main`, require critical security/status checks and block force-pushes.
2. Run one real browser-to-production E2E Seal creation through the atomic registration path and one EVO Origin exact-file verification smoke test.
3. Resolve historical `V1-TEST-001` through an auditable lifecycle action instead of deleting history silently.
4. Complete compatibility review and migration to shared restricted CORS for the two remaining mixed-action endpoints: Passport Transfer and Battery Passport.
5. Inventory DePay/wallet/browser network requirements and narrow the broad remaining `/v1/` CSP allowances without breaking checkout or wallet compatibility.
6. Serve CSP/HSTS/`frame-ancestors` and other defensive headers from a header-capable hosting edge; meta CSP is not a complete substitute.
7. Verify production deployment inventory separately: frontend commit, deployed Edge Function versions, migrations, allowed origins/environment and rollback target.
8. Document and test rollback, credential/key rotation and incident-response operations for the production environment.
9. Perform an independent penetration/security review before enterprise or high-assurance claims.
10. Require explicit owner authorization before merge to `main` or production deployment.

## Claims policy

Allowed language should describe EVO as security-hardened, defense-in-depth, cryptographically verifiable, or evidence-based only where the exact feature supports the statement.

Do not use claims such as `unhackable`, `hacker-proof`, `100% secure`, or state that a blockchain/QR/hash record by itself proves physical authenticity, legal originality or truth of content.

## Next engineering sequence

1. Finish release-tooling consolidation into PR #49 and keep full CI green.
2. Complete Passport Transfer and Battery Passport CORS compatibility review.
3. Run production inventory plus real wallet/atomic Seal/EVO Origin E2E smoke tests.
4. Resolve `V1-TEST-001` through the lifecycle path.
5. Reduce browser CSP after network inventory and move defensive headers to a header-capable edge.
6. Protect `main` and require critical checks.
7. Run incident/rollback/key-rotation drill.
8. Obtain independent security review.
9. Only then request explicit authorization to promote the RC to a production release.
