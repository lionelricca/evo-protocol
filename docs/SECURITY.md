# Security Rules

Security is a release gate, not a later feature.

## Non-negotiable rules

1. Never request or store seed phrases or private keys.
2. Do not custody user funds in the web application.
3. Never imply that a blockchain record alone proves a physical item is genuine.
4. Keep the official Uniswap pool outside any selective fee marking on the current EVO token.
5. Do not deploy a new contract to mainnet before testnet tests and independent review.
6. Store minimal public data. Sensitive personal/product data should not be permanently written on-chain.
7. Verification must clearly distinguish `REGISTERED`, `HASH VERIFIED`, `ISSUER VERIFIED`, `ORIGIN VERIFIED` and higher assurance levels.
8. Public telemetry such as QR scans, EVO Pulse and `SOFTWARE_V0` Challenge must never elevate authoritative trust by itself.
9. Privileged writes must fail closed and verify the expected signer, expected message, nonce/timestamp and current authorization state on the server.
10. Browser code must never contain `service_role`, private keys, signing secrets or privileged database credentials.
11. Every exposed database table must use RLS; browser roles receive only the minimum grants required for public verification.
12. Security checks must run automatically on every pull request and on `main`.

## Release gates

### Gate A — V0
- No token transfers.
- No signatures required.
- Local hashing only.
- Deterministic SHA-256 tests.

### Gate B — V1
- Explicit wallet signatures.
- Replay-resistant signed payload format.
- Server-side input validation.
- Request-size limits and rate controls.
- Public verification URL integrity tests.
- RLS enabled on every exposed table.
- Privileged `SECURITY DEFINER` routines inaccessible to browser roles.
- No public telemetry used as authoritative evidence.

### Gate C — Security-hardened web release
- `EVO Security Gate` green.
- GitHub default branch protected; required checks enabled; force pushes blocked.
- CSP and defensive HTTP headers deployed at the hosting edge.
- Critical third-party browser dependencies pinned or self-hosted.
- CORS restricted on privileged endpoints once production origins are fixed.
- Repeatable Supabase security audit returns no unexplained violations.
- Abuse / denial-of-service controls reviewed for every public Edge Function.
- Rollback, key-rotation and incident-response procedure documented.

### Gate D — Testnet contract
- Unit and property tests.
- Authorization tests.
- Reentrancy analysis.
- Pause/emergency behavior where applicable.
- Gas and denial-of-service analysis.

### Gate E — Mainnet / high assurance
- Independent security review / penetration test.
- Verified source code.
- Operational key policy/multisig where administration exists.
- Low initial limits.
- Incident response procedure tested.
- No "unhackable", "hacker-proof" or equivalent unsupported security claim.

See `SECURITY_HARDENING_V330.md` for the current hardening baseline and remaining blockers.
