# EVO V4.6 Production Security Review — 2026-08-24

Review type: **read-only operating evidence**

ISMS evidence level: this is a real operating-evidence sample for the controls actually rechecked below. It does **not** prove long-term control effectiveness, backup recovery, MFA, penetration-test coverage or ISO/IEC 27001 certification.

## Purpose

Record a repeatable, non-destructive production security review after the V4.6 NFC deployment and later ISMS closeout work. This review is intentionally separate from policy documents so an auditor can distinguish what EVO says it will do from what was actually observed in production.

Production project reviewed: Supabase project `njvyrvmyhtplprdumzri`.

No DDL, data mutation, key rotation, tag enrolment or payment action was performed during this review.

## Evidence sources

Read-only evidence was collected through the connected production provider APIs and SQL metadata queries:

- Supabase Security Advisor;
- PostgreSQL catalog metadata for `public.evo_nfc_tags`;
- PostgreSQL privilege/catalog metadata for `public.evo_accept_nfc_counter`;
- production Edge Function inventory.

The observed results below are facts from this review, not assumptions inferred from source code.

## Result summary

| Check | Observed result | Review result |
| --- | --- | --- |
| Supabase Security Advisor | `lints=[]` | PASS — 0 security lints returned |
| `public.evo_nfc_tags` row count | `0` | PASS — no NFC tag was accidentally enrolled |
| `public.evo_nfc_tags` RLS | `true` | PASS — RLS remains enabled |
| `evo_accept_nfc_counter` SECURITY DEFINER | `true` | PASS |
| `evo_accept_nfc_counter` `search_path` | `search_path=""` | PASS — hardened search path retained |
| RPC EXECUTE for `anon` | `false` | PASS |
| RPC EXECUTE for `authenticated` | `false` | PASS |
| RPC EXECUTE for `service_role` | `true` | PASS — privileged server authority retained |
| Production Edge Functions | 18 observed as `ACTIVE` | PASS — inventory returned active deployed services |
| `evo-nfc-verifier` | version 6, ACTIVE | PASS — expected V4.6 verifier remains deployed |
| `evo-nfc-verifier` bundle SHA-256 | `a278ed45596c3287bb1ee902fdd9af9debba5829583ac8267224954ab1dd4eb2` | PASS — matches recorded V4.6 production closeout |
| `evo-checkout` | version 13, ACTIVE | OBSERVED — paid E2E still separately pending |
| `evo-service-proof` | version 5, ACTIVE | OBSERVED |
| `evo-reality-continuity` | version 5, ACTIVE | OBSERVED |

## Production Edge Function inventory observed

The provider returned the following functions as ACTIVE at review time:

| Function | Version | Selected bundle SHA-256 |
| --- | ---: | --- |
| `register-evo-seal` | 7 | `8b7a8e05fa9b914151fb2d78c2128c7c764dbc0f977d4cb3f9842f36596bacfb` |
| `register-evo-passport-event` | 6 | `58e917c22462437db4d820eb7468074d1413d4e69e1c4063ccb21c3f40a0ffda` |
| `evo-passport-transfer` | 6 | `501f4af5684cd1e6680df1d96435c6dcbd6a500a6bec08c813ecbe4acf4113cd` |
| `evo-ai-guardian` | 4 | `340f251fcb8f1ffd247b84deb1511e4d81339f9e56340bd0c3e68ce6232e2063` |
| `evo-pulse` | 4 | `83832c224a13d527f218c8387cb28bdff51bf25041c44c9cff7ccc929429f577` |
| `evo-challenge` | 3 | `f490a01213954c23c825c16508eecb6a123e3a1d0d230150e19edc126f3843ce` |
| `register-evo-issuer` | 3 | `13acf41ec71a61c8c1c3adcbed337842cf54a121130adcf748fc9ad806cd7006` |
| `evo-ai-guardian-v04` | 3 | `cd9bc5021ba6c29849b23d796ad1b4b72add9714f19935cfe5b2b5059ec436d3` |
| `evo-domain-verification` | 4 | `2f4daf72fecfa05fad60954674997223883f6690bdcf9feb377589b44d99d0ff` |
| `submit-evo-organization` | 5 | `b136889eefc59a62706e06e07d0da541c4dd02eae0e0d422e6722b18949d64d3` |
| `evo-reality-continuity` | 5 | `dd6f56894a45b3ee6634737aa80d2f21f7eaf72cc624565684471092c505f0a3` |
| `evo-battery-passport` | 3 | `e70dfd900bce74f1b0f919dfec2fa3d39ef8d0ea4c95fa32b0a370b6cc7a6299` |
| `register-evo-wallet` | 5 | `86d62adc6e583efd77936a4e32ffc289eeaf9360205ac387ac970fd4a5e38b3d` |
| `evo-checkout` | 13 | `c27aa8939e8e4e0fcf5589fe0c5814c7d84139c4fad9fd5bd5ca12effa0f4d85` |
| `evo-document-lifecycle` | 3 | `d7f9b7a3356918c0082464c55164967b0222dc84b9095b7d63bd5a27d7b64966` |
| `evo-service-proof` | 5 | `af60bf87af809a6f06a51a544eb7e3c26f6a8de44128e962cdd36c8b73b8eecf` |
| `evo-free-proof` | 1 | `912d0d5bad3e081679fbd93f56af0fe533534a38f6b5afa6d575e84818bb36ad` |
| `evo-nfc-verifier` | 6 | `a278ed45596c3287bb1ee902fdd9af9debba5829583ac8267224954ab1dd4eb2` |

`verify_jwt:false` is present on the listed Edge Functions because the current EVO architecture uses endpoint-specific custom authorization/signature/state/RPC controls where required. This review does **not** infer that `verify_jwt:false` is safe by itself; the authoritative security posture depends on the application controls and database authority already covered by dedicated regression tests.

## NFC authority observations

### Tag registry

Observed:

```text
nfc_tags=0
nfc_rls_enabled=true
```

Interpretation:

- no physical tag has been silently promoted into production;
- the physical-pilot claim boundary remains intact;
- RLS remains enabled on the production registry.

This is consistent with the product requirement that `physicalPilotApproved` cannot be inferred from software readiness.

### Replay authority

Observed:

```text
proname=evo_accept_nfc_counter
security_definer=true
proconfig=[search_path=""]
anon_execute=false
authenticated_execute=false
service_role_execute=true
```

Interpretation:

- the atomic counter authority remains server-only;
- browser roles still cannot directly execute the privileged replay-decision RPC;
- the explicit empty `search_path` hardening remains present.

## Security Advisor observation

Observed:

```text
lints=[]
```

Interpretation: Supabase Security Advisor returned zero current security lints for the project at this review point.

This is useful provider-specific operating evidence, but it does not prove absence of application vulnerabilities or substitute for independent penetration testing.

## Comparison to earlier V4.6 evidence

The same critical NFC production facts were checked during the V4.6 deployment closeout and were rechecked again here:

- no enrolled NFC tags;
- RLS enabled on the NFC registry;
- service-role-only replay authority;
- hardened RPC `search_path`;
- zero Security Advisor security lints;
- expected NFC verifier version/bundle remains active.

This repeated observation provides stronger operating evidence than a single configuration snapshot. The observations are still from the same calendar day, so EVO must not describe this as proof of long-term control effectiveness. A recurring review cadence remains required for mature E3 evidence.

## Items deliberately NOT concluded by this review

This review does not prove:

- GitHub or Supabase administrator MFA;
- database backup retention or successful restore;
- incident-response effectiveness;
- paid checkout end-to-end settlement;
- clean-browser public E2E;
- genuine NTAG physical provenance or TagTamper behavior;
- EU Login / QES / QSeal onboarding completion;
- absence of vulnerabilities found only by an independent pentest;
- ISO/IEC 27001 certification.

## Corrective actions / open gaps

No corrective production mutation was required by the checks above.

Open actions remain:

1. protect GitHub `main` with required checks/ruleset;
2. establish recurring production security-review cadence;
3. verify privileged administrator/MFA inventory;
4. execute backup/restore exercise;
5. execute clean-browser and paid checkout E2E;
6. execute real physical NFC pilot;
7. commission independent penetration/security review.

## Review conclusion

**PASS for the specific read-only controls tested.**

The reviewed V4.6 NFC/database security configuration remains consistent with the promoted product boundary. This document is an operating-evidence record for those checks only and must not be generalized into an ISO certification or independent-security claim.
