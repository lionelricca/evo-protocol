# EVO Seal V1 — Security Review

Status: pre-production review

## Validated controls

- V0 positive test: original file produced `FILE HASH MATCH`.
- V0 negative test: modified copy produced `FILE MODIFIED / DIFFERENT`.
- Public registry uses PostgreSQL Row Level Security.
- Anonymous/authenticated browser roles have `SELECT` only.
- Public write privileges (`INSERT`, `UPDATE`, `DELETE`, `TRIGGER`, `TRUNCATE`, `REFERENCES`) are revoked.
- Public reads expose only records whose status is `ACTIVE`.
- New records are accepted only through `register-evo-seal` Edge Function.
- Edge Function verifies wallet signature before insert.
- Edge Function recalculates metadata hash, digest and Seal ID server-side.
- Timestamps older/newer than the allowed signing window are rejected.
- Duplicate Seal IDs/digests are rejected by database constraints.
- Browser never uploads the source file; only its SHA-256 digest and non-sensitive metadata are submitted.
- V1 does not transfer EVO and does not request token approvals.
- Supabase security advisor returned no lints after the schema/grant hardening pass.

## Still required before production

- End-to-end registration test from a real wallet.
- Invalid-signature rejection test.
- Altered-payload rejection test.
- Public read test from a second browser/device.
- QR/public URL UX test.
- Rate limiting / abuse controls before opening unrestricted public registration.
- Privacy review for metadata fields.
- Independent review before any token-charging or smart-contract escrow is introduced.

## Mainnet rule

No EVO charging, token approvals or production smart-contract writes are allowed until V1 public registry tests pass and a separate testnet contract phase is completed.
