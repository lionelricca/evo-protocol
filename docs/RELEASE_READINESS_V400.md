# EVO V4.0.0 RC1 — Release Readiness

Audit date: 2026-08-23

## Baseline

`codex/evo-v400-release-candidate` and `codex/evo-v330-security-hardening` pointed to the same audited commit when this RC was prepared:

`c1be49a627e877879645275f525152226388ddce`

The V4 label therefore represents a release-candidate checkpoint over the V3.3.18 hardening line, not a second independent implementation.

## Automated verification at baseline

The following GitHub Actions suites completed successfully on the baseline commit:

- EVO Security Gate.
- EVO Document Proof checks.
- EVO Service Proof checks.
- EVO navigation checks.
- EVO navigation V2.7.3 checks.

The Security Gate covers JavaScript/Edge syntax, browser/CSP regressions, local QR supply-chain checks, checkout verification and privacy, origin/CORS policy, domain/wallet/issuer/organization abuse bounds, Reality Continuity, atomic Seal registration, duplicate active asset identity protection, transfer state machine, Battery Passport atomicity, Document Lifecycle atomicity and PostgreSQL concurrency/invariant checks.

## Ready in code

- Silent authorized-wallet session restore without storing private keys.
- EVO Proof entitlement and signed private balance read.
- Multi-network USDC settlement verification with replay/idempotency controls.
- Atomic Seal + entitlement registration path.
- Active duplicate asset identity guard.
- Document Proof and authoritative document lifecycle path.
- Service Proof with distinct owner/provider trust semantics and provider inbox.
- Asset ownership authority lock and atomic transfer state machine.
- Battery Passport atomic registration.
- Public Pulse/Challenge signals prevented from elevating authoritative trust by themselves.
- Shared exact-origin browser boundary on checkout, Seal, wallet, issuer, domain, organization, Passport Event, Passport Transfer, Document Lifecycle, Service Proof and Reality Continuity.
- Local vendored QR implementation.

## Production deployment snapshot

The production inventory is tracked separately in `docs/PRODUCTION_DEPLOYMENT_V400.md` so code state and deployed state cannot be conflated.

At the 2026-08-23 snapshot:

- the atomic Document Lifecycle migration is applied in production;
- the critical browser-write CORS rollout is deployed for checkout, Seal, wallet, issuer, domain, organization, Passport Event, Passport Transfer, Document Lifecycle, Service Proof and Reality Continuity;
- Battery Passport remains the last endpoint in this critical CORS review batch;
- Pulse, Challenge and Guardian remain a separate public/observational review rather than receiving a blanket critical-write policy;
- Supabase Security Advisor reported no security lints after the production changes.

## Not equivalent to production readiness

A green branch does not prove that every corresponding migration/function is deployed. Before calling this release production-hardened, verify the deployment inventory independently.

The following items remain open release gates:

1. Protect GitHub `main`, require the security/status checks and block force-pushes.
2. Run one real browser-to-production E2E Seal creation through the atomic registration path, then retire the legacy privileged credit path only after evidence that the new path is in use.
3. Resolve historical `V1-TEST-001` through an auditable lifecycle action instead of deleting history silently.
4. Complete the dedicated Battery Passport CORS compatibility/regression pass. Review public Pulse, Challenge and Guardian surfaces independently rather than applying the critical-write policy blindly.
5. Inventory DePay/wallet/browser network requirements and narrow the broad remaining `/v1/` CSP allowances without breaking checkout or wallet compatibility.
6. Serve CSP/HSTS/`frame-ancestors` and other defensive headers from a header-capable hosting edge; meta CSP is not a complete substitute.
7. Keep critical third-party browser code pinned and evaluate self-hosting where licensing and update procedures permit it.
8. Document and test rollback, credential/key rotation and incident-response operations for the production environment.
9. Perform an independent penetration/security review before enterprise or high-assurance claims.

## Claims policy

Allowed language should describe EVO as security-hardened, defense-in-depth, cryptographically verifiable, or evidence-based only where the exact feature supports the statement.

Do not use claims such as `unhackable`, `hacker-proof`, `100% secure`, or state that a blockchain/QR record by itself proves physical authenticity, legal originality or truth of content.

## Next engineering sequence

1. Finish Battery Passport CORS review with regression coverage.
2. Re-run production deployment inventory and a real atomic Seal E2E test.
3. Browser network inventory and CSP reduction.
4. Header-capable production edge + branch protection.
5. Incident/rollback/key-rotation drill.
6. Independent security review.
7. Only then promote from RC to a production release.
