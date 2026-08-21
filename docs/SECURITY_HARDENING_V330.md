# EVO V3.3 · Security Hardening

## Objective

EVO must be difficult to abuse, fail closed on privileged actions and never confuse public activity with authoritative evidence. No Internet product is "unhackable"; the release target is layered security, minimal privilege, explicit trust boundaries and repeatable verification.

## V3.3 changes

### Trust authority

Public activity is no longer allowed to elevate the public EVO Reality Level.

Non-authoritative signals:
- EVO Pulse created from a public page;
- SOFTWARE_V0 Challenge responses computed from public data;
- page views, QR scans or other anonymous observations.

Authoritative evidence candidates:
- issuer wallet signature;
- owner-signed Passport lifecycle event;
- independent Service Proof countersignature;
- verified domain / verified organization evidence;
- validated external evidence;
- regulated trust evidence;
- cryptographic NFC / secure hardware proof.

Rule: `PUBLIC_TELEMETRY_NEVER_ELEVATES_AUTHORITY`.

### Frontend injection boundary

V3.3 installs a canonical HTML escaper for legacy UI components that still combine trusted markup with untrusted text. New components should prefer `textContent`, DOM nodes and attributes over constructing HTML strings.

### Automated security gate

`.github/workflows/evo-security-gate.yml` checks:
- trust-authority regression cases;
- public telemetry cannot raise authority;
- HTML quote escaping remains present;
- no `SUPABASE_SERVICE_ROLE_KEY` reference in frontend files;
- no private-key material in frontend files;
- no seed-phrase request/reference in frontend files;
- critical Supabase/viem imports are version pinned;
- every repository Edge Function rejects oversized request bodies.

### Supabase audit

`security/supabase-security-audit.sql` provides repeatable read-only checks for:
- public tables without RLS;
- browser-executable `SECURITY DEFINER` routines;
- direct browser write grants on EVO tables;
- browser-readable table inventory;
- `SECURITY DEFINER` routines without deliberate `search_path`.

Production baseline checked on 2026-08-21:
- public tables without RLS: **0**;
- browser-executable `SECURITY DEFINER`: **0**;
- direct EVO browser write grants: **0**;
- `SECURITY DEFINER` without configured `search_path`: **0**.

## Remaining release blockers

These items remain mandatory before describing EVO as hardened for serious production use:

1. Protect GitHub `main` with required PR reviews / required checks and block force pushes.
2. Deploy restrictive HTTP security headers / CSP at the actual hosting edge. GitHub Pages alone does not provide repository-controlled custom response headers.
3. Replace or self-host remaining third-party browser scripts where practical.
4. Apply consistent request-size limits and rate controls to every deployed Edge Function, including functions that currently exist only in Supabase and are not yet mirrored in the repository.
5. Restrict CORS on privileged write functions to known EVO production origins once the final production domains are fixed.
6. Keep public lookup endpoints separate from privileged write endpoints.
7. Perform independent penetration testing before enterprise/high-assurance claims.
8. Establish incident response, key rotation and deployment rollback procedures.

## Release language

Allowed:
- "security-hardened architecture" when the corresponding release gates are met;
- "wallet-signed" when the signature is verified server-side;
- "hash verified" for exact digest comparison;
- specific issuer/evidence levels with their precise meaning.

Not allowed:
- "unhackable";
- "hacker-proof";
- "impenetrable";
- "legally certified" without the corresponding qualified/accredited evidence.
