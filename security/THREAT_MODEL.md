# EVO Protocol Threat Model

## Assets we protect

- Integrity of seal records.
- Issuer identity and signatures.
- User wallets and funds.
- Privacy of source files and personal metadata.
- Trust in EVO verification results.

## Primary threats

### Fake issuer
An attacker can create a record claiming to be a famous company. Mitigation: registration is not issuer verification. Verified issuer status must use separate evidence/credentials.

### Copied QR
A QR printed on one object can be copied to another. Mitigation: QR is Basic assurance only. High-value physical goods require serial binding, one-time activation and eventually cryptographic NFC/secure elements.

### Modified digital file
A modified file must never pass the original hash. Mitigation: SHA-256 and deterministic canonical metadata encoding.

### Database tampering
A future V1 backend could be compromised. Mitigation: signed records, append-only audit history and later blockchain anchoring.

### Replay / signature reuse
A valid signature could be reused for another operation. Mitigation: domain separation, chain ID, nonce, expiry and action-specific signed payloads.

### Malicious frontend
A compromised frontend could ask users to sign dangerous transactions. Mitigation: minimal wallet permissions, clear transaction previews, Content Security Policy, dependency review and published source.

### Privacy leakage
Hashes do not automatically make sensitive metadata safe. Mitigation: never put sensitive plaintext on-chain; minimize metadata and support salted commitments when required.

### Token/admin risk
The current EVO token has owner-controlled selective recipient behavior. Mitigation: keep protocol security independent from token admin features and never rely on fee marking for authentication.
