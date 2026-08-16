# EVO Protocol Architecture

## Product thesis

EVO is not positioned primarily as a speculative asset. EVO Protocol aims to make EVO useful as the economic unit behind verifiable digital seals, product passports and trusted lifecycle events.

Core loop:

`SEAL → VERIFY → PASSPORT → HISTORY → TRUST`

## V0

V0 runs entirely in the browser.

- SHA-256 is calculated locally with Web Crypto.
- The selected file is never uploaded by this prototype.
- Records are stored only in browser localStorage.
- Wallet connection is optional and used only to populate the declared issuer field.
- No signature is requested.
- No EVO is transferred.

## V1 target

V1 should introduce:

1. Public immutable-style registry records in a backend database.
2. Wallet signatures over canonical seal payloads.
3. Public `/verify/<seal-id>` URLs.
4. Standards-based QR codes pointing to the public verification URL.
5. Issuer profiles and clear trust levels.
6. Privacy rules: hashes and non-sensitive metadata only by default.

## Testnet target

A minimal `EVOSealRegistry` contract should anchor only what benefits from public blockchain verification, such as a seal digest, issuer, timestamp and status. Large/private metadata should remain off-chain.

## Future passport

Passport events may include manufacture, sale, warranty activation, repair, inspection, ownership transfer and end-of-life events. Event authority must be explicit: an owner, issuer, authorized verifier or other role should not be interchangeable.

## Standards strategy

EVO should integrate rather than compete with mature standards:

- GS1 Digital Link for product identification and resolvable identifiers.
- C2PA for media provenance.
- W3C Verifiable Credentials for issuer-backed credentials.

EVO's differentiator is the economic and public verification layer around those proofs.
