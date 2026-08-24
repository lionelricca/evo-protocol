# EVO Access and Secret Management Procedure — V0.1

Target alignment: ISO/IEC 27001:2022 operational readiness.

Status: internal control procedure. This is not an ISO certification claim.

## Objectives

- enforce least privilege;
- keep privileged actions individually attributable;
- prevent secrets from entering browser code, source control, tickets or public logs;
- make granting, reviewing, rotating and revoking access repeatable;
- separate customer wallet ownership from EVO administration.

## Systems in scope

At minimum:

- GitHub repository and Actions;
- Supabase projects, database, Edge Functions and secrets;
- hosting/DNS/domain administration used by EVO;
- payment-provider administration;
- future DPP registry credentials;
- NFC administration secrets and per-tag AES keys;
- organization email/accounts used to recover privileged services.

## Access classes

### PUBLIC

No authentication required. Must not permit privileged mutation.

### STANDARD USER

Customer/user scope only. Must not receive server secrets or cross-tenant authority.

### OPERATOR

Limited operational access required for support or deployment. Permissions must be bounded to the task.

### PRIVILEGED ADMIN

Can change production security, secrets, access policy, authoritative data or infrastructure. Use only named individual accounts.

### BREAK-GLASS

Emergency recovery access. Must be minimized, protected strongly, used only when ordinary administration is unavailable and reviewed after every use.

## Granting access

Every privileged access grant must have:

- named person/account;
- system;
- role/permission level;
- business/technical reason;
- approver;
- grant date;
- expected review or expiry condition.

For the current founder-led stage, management may be both requester and approver where no independent approver exists. That limitation must be explicit in audit evidence rather than hidden.

## Authentication requirements

For privileged systems where the provider supports it:

- MFA must be enabled;
- phishing-resistant methods are preferred when available;
- recovery methods must be protected separately from the primary factor;
- shared accounts are prohibited when individual accounts are available;
- browser password managers or equivalent protected credential stores may be used, but credentials must not be stored in plaintext documents.

## Reviews and revocation

Privileged access must be reviewed at least quarterly during the current operating stage and additionally after:

- role or contractor changes;
- material incidents;
- major provider changes;
- certification/pentest findings.

Access no longer required must be removed promptly. Emergency revocation takes priority over normal change windows.

Review evidence should record:

```text
review_date=
system=
account=
role=
needed=yes|no
change_required=
reviewer=
evidence_ref=
```

## Secret classification

The following are RESTRICTED:

- Supabase service/secret keys;
- payment-provider private/API secrets;
- administrative API tokens;
- signing keys;
- NFC AES keys;
- `EVO_NFC_ADMIN_SECRET`;
- DPP registry client secrets/private credentials;
- account recovery secrets.

Public API keys that are explicitly designed for browser use are not automatically RESTRICTED, but their permissions must still be bounded by RLS/server controls.

## Storage rules

RESTRICTED secrets must:

- remain in provider secret stores or another approved protected secret-management mechanism;
- never be committed to GitHub;
- never be embedded in frontend JavaScript/HTML;
- never be pasted into issues, PRs, screenshots or support messages;
- never be written to public database columns;
- be omitted or redacted from logs.

No seed phrase or customer wallet private key may be requested or stored by EVO.

## Rotation triggers

Rotate/revoke a secret when:

- compromise is confirmed or reasonably suspected;
- a person with access no longer requires it;
- the provider reports a relevant compromise;
- the secret was accidentally exposed in source, logs, screenshots or chat;
- a security review requires rotation;
- cryptographic/key-lifecycle policy requires replacement.

Calendar-based rotation may be adopted for selected high-risk secrets where it improves risk without creating unsafe manual handling. The rotation interval must be documented per secret class rather than assumed globally.

## Rotation procedure

1. identify every consumer of the secret;
2. create replacement through the authoritative provider/system;
3. update server-side secret store only;
4. deploy/reload dependent services as required;
5. validate normal and fail-closed behavior;
6. revoke old secret;
7. confirm old secret no longer authenticates where this can be tested safely;
8. record date, owner and evidence reference without recording the secret itself.

## NFC key controls

For NTAG 424 DNA / TagTamper:

- production/pilot key material remains server-side;
- GitHub and `public.evo_nfc_tags` contain no AES keys;
- use per-tag or properly diversified keys for real production deployment rather than one fleet-wide key;
- tag ID + expected UID + EVO Seal binding is separate from key storage;
- compromised tag/profile keys require revocation before replacement;
- do not set `physicalPilotApproved=true` for replacement hardware until its physical pilot passes;
- key rotation evidence must never disclose raw keys.

## Service-account rules

Service accounts/tokens must:

- be used only when a human identity cannot perform the automated function safely;
- have the minimum scopes required;
- not be reused across unrelated environments when separation is available;
- be inventoried with an owner and purpose;
- be revoked when the integration is retired.

## Environment separation

As EVO matures toward enterprise certification:

- development/test credentials must be distinct from production credentials;
- test data must not require unrestricted production secrets;
- production mutations from local development tools should be avoided;
- privileged production changes require traceable evidence.

Where current architecture has not yet achieved complete environment separation, record that as an open ISMS risk/control gap.

## Evidence required for audit readiness

Maintain evidence of:

- privileged account inventory;
- MFA status where verifiable;
- quarterly access reviews;
- secret inventory by identifier/class, never raw value;
- secret rotation/revocation events;
- production deployment identity/version;
- NFC key-handling and physical-pilot records;
- corrective actions from incidents/pentests.

## Review

Review this procedure at least annually, after a material access/secret incident, and before an external ISO/IEC 27001 audit.
