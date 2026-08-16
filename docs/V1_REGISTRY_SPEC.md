# EVO Seal V1 — Registry Specification

Branch: `v1-registry`

## Goal

Move from a browser-local proof of concept to a public verification system while preserving the V0 safety rule: **no EVO transfers until the registry, signing model and abuse controls are validated.**

## V1 capabilities

1. Public seal records accessible from any browser.
2. A permanent verification URL for every seal.
3. QR code pointing to that verification URL.
4. Wallet signature proving which wallet issued a seal.
5. SHA-256 file integrity verification performed locally in the browser.
6. Explicit trust levels so registration is never confused with physical authenticity.
7. Revocation/status support without deleting history.
8. No custody of user private keys.

## Trust levels

- `REGISTERED` — a record exists.
- `HASH_VERIFIED` — supplied digital asset matches the recorded SHA-256.
- `ISSUER_SIGNED` — the seal payload was signed by the issuer wallet.
- `ISSUER_VERIFIED` — issuer passed a future EVO verification process.
- `ORIGIN_VERIFIED` — an authorized issuer attests provenance.
- `EVO_SECURE` — future physical binding using stronger anti-copy hardware/secure tags.

V1 will initially support only the first three states.

## Canonical V1 seal payload

```json
{
  "version": "EVO-SEAL-V1",
  "sealId": "EVO-...",
  "assetHash": "sha256...",
  "metadataHash": "sha256...",
  "issuerAddress": "0x...",
  "createdAt": "ISO-8601",
  "nonce": "random-128-bit-or-more",
  "status": "ACTIVE"
}
```

The issuer signs the canonical payload. The server never requests or receives a private key.

## Public record vs private data

Public registry stores only information needed for verification and intentionally public metadata.

Never store by default:

- private documents,
- secret file contents,
- private keys or seed phrases,
- government IDs,
- unnecessary personal data.

Files remain on the user's device unless a later feature explicitly requests upload with a separate privacy policy.

## V1 API

Initial minimal endpoints:

- `POST /api/seals` — create a public record after schema validation and signature verification.
- `GET /api/seals/:sealId` — retrieve the public record.
- `POST /api/seals/:sealId/revoke` — signed issuer revocation.
- `GET /verify/:sealId` — public verification page.

## Security gates

Before production V1 can be merged:

- schema validation on every server input,
- signature verification server-side,
- duplicate Seal ID rejection,
- payload size limits,
- rate limiting,
- XSS-safe output encoding,
- CORS restricted to approved origins where appropriate,
- immutable creation timestamp,
- append-only audit trail for status changes,
- no server-side wallet secrets,
- automated positive and negative tests.

## Token integration gate

V1 public registry launches with **0 EVO charged**.

EVO payment is a separate later gate. A mainnet transaction must not become a prerequisite until:

1. V1 public registry works reliably,
2. wallet signatures have been tested across supported wallets,
3. abuse/rate limits are active,
4. a minimal token-payment design has been reviewed,
5. Polygon testnet tests pass,
6. mainnet limits and emergency procedures are documented.

## Next architecture decision

GitHub Pages remains suitable for the static frontend but cannot safely provide a shared writeable registry by itself. V1 therefore needs a small server/API + durable database. The backend should be isolated from the static site so it can be replaced without changing the EVO proof format.
