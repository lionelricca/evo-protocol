# EVO Seal V0 — Validation Record

Date: 2026-08-16

## Test artifact

- Seal ID: `EVO-9C215387-339CFFCB-89F4AFAF`
- Asset file: `151 coti camaras.docx`
- SHA-256: `d3badc8ace1e0dbdc9afadd3521b18604f1eec9fcad3f7aedb89c491ad75243b`
- Mode: `OFFCHAIN-DEMO`
- Token charged: `0 EVO`

## Positive integrity test

The original file was selected during verification.

Expected: `FILE HASH MATCH`

Result: **PASS**

## Negative integrity test

A modified copy of the original file was selected using the same Seal ID.

Expected: `FILE MODIFIED / DIFFERENT`

Result: **PASS**

## V0 gate result

**V0 integrity gate: PASSED**

This validates the basic local workflow:

`CREATE → SHA-256 → SEAL ID → VERIFY ORIGINAL → DETECT MODIFICATION`

V0 remains local-only, non-custodial and does not move EVO.
