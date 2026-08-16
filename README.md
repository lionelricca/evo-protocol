# EVO Protocol

**The Digital Seal — Seal what matters. Prove what’s real.**

EVO Protocol is an experimental open project for creating verifiable digital seals, public verification records and future product passports powered by the EVO token on Polygon.

## Current stage: V0 Safety Prototype

V0 is intentionally non-custodial and off-chain. It does **not** transfer EVO, does **not** deploy a new smart contract and does **not** claim that a physical object is authentic merely because a record exists.

The first objective is to prove the core workflow safely:

`CREATE → HASH → SEAL → VERIFY → HISTORY`

## Core principles

- **Creating trust may consume EVO; verification should remain free.**
- **Never store private keys.** Wallets remain under user control.
- **A blockchain record proves registration/integrity, not physical authenticity by itself.**
- **Security before mainnet.** New contracts must be tested on testnet and reviewed before handling real value.
- **Standards before lock-in.** Future work should be compatible where useful with GS1 Digital Link, C2PA and W3C Verifiable Credentials.

## EVO token

- Network: Polygon
- Symbol: EVO
- Contract: `0x622b09038bc1ae90ee13a35ba5756b931d9dcc9f`
- Decimals: 18

## Repository map

- `index.html` — browser-only EVO Seal V0 demo
- `docs/ARCHITECTURE.md` — architecture and roadmap
- `docs/SECURITY.md` — security rules and release gates
- `security/THREAT_MODEL.md` — threats we must design against
- `contracts/` — reserved for reviewed smart contracts; no production contract is deployed from this repo yet
- `packages/seal-sdk/` — future public SDK
- `tests/` — test strategy and vectors

## Planned path

1. V0 — local hashing + local seal verification.
2. V1 — public registry + wallet signatures + public verification links + QR.
3. Testnet — minimal `EVOSealRegistry` on Polygon testnet.
4. Review/audit — automated tests, manual review and security assessment.
5. Limited mainnet — capped operation with emergency controls only after review.
6. Passport — ownership, warranty, repair and certification events.

## Important

EVO Protocol is experimental software. A seal is only as trustworthy as its issuer, evidence and physical binding mechanism. QR-only seals can be copied; higher-assurance physical products will require stronger binding such as secure NFC/cryptographic tags and verified issuers.
