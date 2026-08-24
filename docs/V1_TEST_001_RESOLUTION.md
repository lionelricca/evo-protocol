# Historical duplicate `V1-TEST-001` · Resolution Plan

Status: **proposal only — no production mutation authorized or performed**.

## Read-only facts observed on 2026-08-23

Two ACTIVE test Seals currently share the same issuer wallet, asset hash and serial `V1-TEST-001`:

| Seal | Registered | Existing lineage/activity |
| --- | --- | --- |
| `EVO-460C9274-39725594-215E874B` | 2026-08-17 00:00:33 UTC | no Passport events, transfers, Service Proofs, Pulses, Challenges, Reality snapshots or Document events observed |
| `EVO-DD403D40-069F9CB8-4E8FDE52` | 2026-08-17 00:01:08 UTC | 2 Passport NOTE events, 29 Pulses and 5 Challenges observed |

Neither record currently has a Seal lifecycle event.

The second Seal contains the historical test lineage, including the note `Primer evento firmado de prueba de EVO Passport V1`.

## Recommended canonical test lineage

Keep `EVO-DD403D40-069F9CB8-4E8FDE52` as the ACTIVE test record because it is already the record referenced by historical Passport/Pulse/Challenge test activity.

Retire `EVO-460C9274-39725594-215E874B` through EVO's existing auditable lifecycle/revocation path rather than deleting or rewriting history.

Suggested reason:

> Historical duplicate test record. Retired during EVO V4.0 release consolidation; canonical V1-TEST-001 test lineage remains EVO-DD403D40-069F9CB8-4E8FDE52.

## Why not simply keep the first registration?

The earlier record is chronologically first, but it has no observed dependent activity. The later record is the one that accumulated the signed/public test history. Retiring the unused record therefore preserves more existing evidence and avoids moving or rewriting historical events.

This is a test-data lifecycle decision, not a statement that later registrations generally outrank earlier registrations.

## Required execution controls

Before any production action:

1. owner explicitly authorizes the lifecycle change;
2. re-query both records and their dependent events immediately before execution;
3. use the normal signed/authoritative EVO lifecycle path where possible;
4. do not `DELETE` either Seal;
5. verify that the retired Seal becomes non-ACTIVE and that the retained Seal stays ACTIVE;
6. confirm the active duplicate-identity group count falls to zero;
7. retain the lifecycle event/reason as audit evidence.

## Follow-up

After the duplicate is resolved, evaluate replacing the transitional trigger-based duplicate guard with a database unique partial index for ACTIVE `(lower(issuer_wallet), asset_hash, serial)` identities if the final product semantics still require that invariant.
