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
- Rate limiting.
- Public verification URL integrity tests.

### Gate C — Testnet contract
- Unit and property tests.
- Authorization tests.
- Reentrancy analysis.
- Pause/emergency behavior where applicable.
- Gas and denial-of-service analysis.

### Gate D — Mainnet
- Independent security review.
- Verified source code.
- Operational key policy/multisig where administration exists.
- Low initial limits.
- Incident response procedure.
