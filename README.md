# EVO Passport

**Identity, history and traceability for every asset.**

EVO Passport is an independent product created by Lionel Ricca. It gives physical and digital assets a wallet-signed identity, a public QR verification record, lifecycle history and controlled ownership transfer, supported by the EVO ecosystem on Polygon.

## Current stage: V1.5 Commercial Pilot

The current commercial pilot is non-custodial and conservative. A payment moves USDC only after explicit confirmation in MetaMask; EVO never stores private keys and does **not** claim that a physical object is authentic merely because a digital record exists.

The working stack has evolved beyond a static seal:

`SEAL → ISSUER TRUST → PASSPORT → TRANSFER → PULSE → CHALLENGE → AI GUARDIAN`

The next layer is the **EVO Reality Graph**: one continuously evolving trust state for every Seal, designed so that copying a QR or public URL is not enough to reproduce the complete evidence history.

## Core principles

- **Creating trust may consume EVO; public verification should remain free.**
- **Never store private keys.** Wallets remain under user control.
- **Evidence levels, not unsupported authenticity claims.**
- **A blockchain record proves registration/integrity, not physical authenticity by itself.**
- **QR is discovery, not high-assurance proof.** Secure NFC is the planned physical binding layer.
- **Security before mainnet.** New value-moving contracts require tests and independent review.
- **Privacy by default.** Public observation features should minimize personal data.
- **Standards before lock-in.** Future work should remain compatible where useful with GS1 Digital Link, C2PA and W3C Verifiable Credentials.

## Commercial model

- One free demonstration passport per wallet.
- Individual: **US$9.90** for one additional passport.
- Pack: **US$49** for ten passports.
- Company reference: **US$39/month** for up to 100 passports; commercial activation pending.
- Public verification remains free and does not require a wallet.
- MetaMask checkout settles only verified, Circle-issued USDC on Ethereum, Polygon, Base, Arbitrum, Optimism or Avalanche C-Chain.\n- Checkout accepts any customer EVM wallet connected through MetaMask; the payer is verified against the onchain transaction.
- Customers may use MetaMask Buy or Swap before checkout when they hold another supported asset.
- Every payment requires explicit wallet confirmation and is credited only after independent onchain verification.
- All payments settle to the merchant wallet `0xDC6740245e026A19ea9EE2B62968ea8aeFFEAb16`.
- The EVO token is not used for EVO Passport purchases at this stage.

## EVO token

- Network: Polygon
- Symbol: EVO
- Contract: `0x622b09038bc1ae90ee13a35ba5756b931d9dcc9f`
- Decimals: 18

## Current capabilities

### EVO Seal

- local SHA-256 hashing;
- wallet-signed identity;
- public registry and verification;
- QR verification links;
- duplicate hash + serial protection.

### Issuer Trust

- wallet-proven issuer profiles;
- optional domain evidence;
- optional organization evidence;
- explicit trust states rather than binary identity claims.

### EVO Passport

- signed lifecycle events;
- current-owner model;
- two-signature ownership transfers.

### EVO Pulse

- chained public observations;
- integrity checking;
- intentionally no IP/location/fingerprint collection in V0.

### EVO Challenge

- short-lived server challenge;
- one-time response;
- expiration and anti-replay audit;
- persistent live countdown in the UI.

### EVO AI Guardian

- explainable risk analysis;
- Seal + Issuer Trust + Passport + Pulse + Challenge evidence;
- anomaly and continuity signals;
- no unsupported physical-authenticity inference.

### Secure NFC architecture

- physical-proof design based on cryptographic NFC tags;
- NTAG 424 DNA / TagTamper targeted for the first pilot;
- server-side secret verification;
- future `NFC_VERIFIED` evidence and Pulse sources.

## EVO Reality Graph

A Seal is becoming more than an ID. Its Reality Graph combines identity, issuer evidence, ownership, lifecycle history, observations, freshness proofs and future secure physical proofs into an evolving trust state.

The target property is **temporal uniqueness**: a copied label may reproduce public data, but it should not be able to reproduce the complete sequence of legitimate signed and cryptographic state transitions.

See `docs/REALITY_GRAPH.md`.

## Repository map

- `index.html` — original browser EVO Seal prototype
- `v1/` — current V1 web application
- `docs/ARCHITECTURE.md` — architecture and roadmap
- `docs/REALITY_GRAPH.md` — evolving proof graph and EVO Reality Levels
- `docs/ISSUER_TRUST.md` — issuer evidence model
- `docs/NFC_ARCHITECTURE.md` — secure physical-proof architecture
- `docs/ORGANIZATION_EVIDENCE.md` — organization evidence model
- `docs/SECURITY.md` — security rules and release gates
- `security/THREAT_MODEL.md` — threat model
- `contracts/` — smart-contract experiments; no new production contract should be deployed without review
- `tests/` — automated security and integrity tests

## Roadmap

1. **V1 digital trust stack** — Seal, Issuer Trust, Passport, Transfer, Pulse, Challenge and Guardian.
2. **Reality State V0** — canonical trust-state schema + EVO Reality Levels.
3. **Reality Root** — deterministic hash of the current normalized trust state + test vectors.
4. **Secure NFC pilot** — NTAG 424 DNA enrollment, dynamic proof verification and replay/counter testing.
5. **Guardian physical-awareness** — analyze NFC-backed evidence without making unsupported binary authenticity claims.
6. **Testnet anchoring** — minimal registry/Reality Root anchoring only where it adds measurable value.
7. **Independent security review** before any production flow moves EVO or other assets.
8. **Limited mainnet utility** with explicit limits and emergency controls.

## Important

EVO Protocol is experimental software. A seal is only as trustworthy as its issuer, evidence, lifecycle continuity and physical binding mechanism.

**The QR is not the product. The evolving proof graph behind it is.**
