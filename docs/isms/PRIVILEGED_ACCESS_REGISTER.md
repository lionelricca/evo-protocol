# EVO Privileged Access Register — Initial V0.1

Review date: 2026-08-24

Target alignment: ISO/IEC 27001:2022 readiness.

Status: initial non-secret register of privileged identities and machine authorities that can be evidenced from the current architecture. It is **not** proof that MFA/access reviews are complete. Raw credentials, tokens, passwords, seed phrases, private keys and NFC AES keys are prohibited from this file.

## Access classes used

- **HUMAN ADMIN** — named person/account with administrative authority.
- **MACHINE AUTHORITY** — non-human secret/token/role used by server-side code.
- **EXTERNAL USER AUTHORITY** — customer-controlled identity/signature path; EVO does not custody the underlying private key.
- **FUTURE REGULATED IDENTITY** — expected privileged identity not yet onboarded.

## Current register

| ID | Identity / authority | Class | System / scope | Current evidence | MFA / credential posture | Review state |
| --- | --- | --- | --- | --- | --- | --- |
| P-001 | GitHub account `lionelricca` | HUMAN ADMIN | `lionelricca/evo-protocol` administration | GitHub permission API observed `admin` on 2026-08-24 | MFA status **NOT VERIFIED** through available integration; password/token values not recorded | ACTIVE — quarterly review evidence pending |
| P-002 | EVO Management Supabase administrator account(s) | HUMAN ADMIN | Production Supabase project administration | Connected project can be inspected/deployed through authorised integration | Exact account list and MFA status **NOT VERIFIED** through current evidence | ACTIVE — formal account/MFA review pending |
| P-003 | Supabase `service_role` / modern server secret authority | MACHINE AUTHORITY | Privileged database/RPC access from Edge Functions | Production NFC RPC explicitly grants EXECUTE to `service_role` and denies browser roles | RESTRICTED server-side credential; raw value intentionally absent | ACTIVE — inventory owner/rotation evidence pending |
| P-004 | Edge Function runtime secret environment | MACHINE AUTHORITY | Server-only configuration/secrets for EVO functions | Functions read provider environment variables rather than embedding privileged credentials in browser code | RESTRICTED; exact secret names/values should be reviewed in provider console without exporting values | ACTIVE — formal secret inventory review pending |
| P-005 | `EVO_NFC_ADMIN_SECRET` | MACHINE AUTHORITY | Administrative NFC binding enrolment path | V4.6 verifier requires this secret for `enroll_binding` | RESTRICTED; configuration/value not proven by repository; never record raw value | CONFIGURATION STATUS NOT VERIFIED — no physical tags enrolled |
| P-006 | `EVO_NFC_PILOT_KEYS` secret store | MACHINE AUTHORITY | NTAG 424 DNA / TagTamper verification profiles | V4.6 verifier loads pilot profiles server-side; public NFC table contains no AES keys | RESTRICTED; raw AES material excluded from repository/register | PILOT CONFIGURATION NOT CLAIMED COMPLETE; physical pilot pending |
| P-007 | GitHub Actions `GITHUB_TOKEN` | MACHINE AUTHORITY | Workflow-scoped GitHub API access | Current security/release workflows expose read-only `contents` permission where designed | Ephemeral workflow token; jobs intentionally avoid persistent checkout credentials | ACTIVE / AUTOMATED — review workflow permissions on change |
| P-008 | Customer wallet signer | EXTERNAL USER AUTHORITY | Ownership/issuer/payment-related user signatures | EVO validates wallet signatures for authoritative paths | Private key/seed phrase remains customer-controlled and is prohibited to collect | ACTIVE BY DESIGN — not an EVO privileged credential |
| P-009 | EU Login economic-operator identity | FUTURE REGULATED IDENTITY | Commission DPP Registry organisation access | Commission onboarding requirement documented | Separate TEST identity required; no EVO organisation enrolment completion is claimed | PENDING EXTERNAL ONBOARDING |
| P-010 | QES/QSeal signing authority / QTSP credential | FUTURE REGULATED IDENTITY | Commission organisation verification and any later regulated-signing use | Commission process requires qualified signature/seal for organisation verification | Provider/custody model not selected; private qualified-signature material must not enter public repo | PENDING SELECTION / ONBOARDING |
| P-011 | DNS/domain administrator | HUMAN ADMIN | Production domain / DNS / registrar account | ISMS scope recognizes domain/DNS as privileged supplier boundary | Exact provider/account/MFA status not yet recorded | GAP — must be inventoried before enterprise audit readiness |
| P-012 | Payment-provider / DePay configuration authority | HUMAN OR MACHINE ADMIN, depending on provider setup | Browser payment integration / commercial configuration | DePay widget release is pinned in source; settlement receiver/config is code-reviewed | Provider dashboard/API admin model not evidenced in current register | GAP — identify account owner/MFA/recovery before commercial scale |

## Verified facts versus open evidence

### Verified now

- GitHub repository owner account `lionelricca` has `admin` permission.
- GitHub Actions security-sensitive workflows use bounded permissions and non-persistent checkout credentials where implemented.
- Browser roles cannot execute the production NFC replay-authority RPC directly.
- Privileged NFC/server credentials are designed to stay server-side.
- Customer wallet private keys/seed phrases are outside EVO custody by design.

### Not verified and must remain marked as such

- GitHub MFA status;
- full GitHub collaborator/admin list beyond the observed owner permission;
- Supabase administrator account list and MFA status;
- DNS/registrar administrator account and recovery controls;
- DePay/provider dashboard administrator access;
- whether every intended pilot secret is currently configured in production;
- EU Login/QES/QSeal onboarding completion.

Absence of evidence is not evidence of secure configuration.

## Quarterly access review procedure

For each HUMAN ADMIN and material MACHINE AUTHORITY:

1. confirm the identity/secret is still required;
2. confirm its current scope is minimal;
3. verify MFA where the provider supports it;
4. identify stale users/tokens/service accounts;
5. revoke unnecessary access before closing the review;
6. verify emergency/recovery ownership;
7. record changes and evidence references without storing credentials.

Review record:

```text
review_date=
identity_id=
system=
required=yes|no
scope_correct=yes|no
mfa_verified=yes|no|not_available|not_verified
rotation_or_revoke_required=yes|no
action_taken=
reviewer=
evidence_ref=
```

## Joiner / mover / leaver rule

When any person or contractor gains, changes or loses privileged responsibilities:

- update this register;
- grant only required roles;
- remove obsolete roles promptly;
- rotate shared/machine secrets if former access could expose them;
- preserve audit evidence of the change.

Shared human administrator accounts should be eliminated where the provider supports named individual identities.

## Machine credential rule

Machine credentials must have:

- a defined purpose;
- a system owner;
- minimum permissions;
- an authoritative storage location;
- rotation/revocation procedure;
- identified consumers;
- no raw secret value in this register.

## Claim boundary

This initial register improves traceability but is only E1/E2 readiness evidence. It must not be described as proof that all privileged access is MFA-protected or periodically reviewed until actual review evidence exists.

## Next operating evidence

Before ISO Stage 1 or high-assurance enterprise launch:

- verify GitHub MFA and complete admin/collaborator inventory;
- verify Supabase admin identities/MFA;
- inventory DNS/domain and payment-provider administrators;
- perform and record one quarterly access review;
- review machine-secret ownership and rotation dates;
- record any resulting removals/rotations.
