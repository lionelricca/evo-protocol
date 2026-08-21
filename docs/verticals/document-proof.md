# EVO Document Proof · V3.0

## Product promise
Convert any business document into a publicly verifiable proof without uploading the original file.

EVO calculates a SHA-256 hash locally, binds it to an issuer and time, creates an EVO ID + QR, and exposes a public verification page. The receiver should not need a wallet or an EVO account.

## Initial market
Start with B2B documents where integrity and origin matter:
- technical reports
- inspection certificates
- calibration certificates
- commissioning reports
- maintenance certificates
- warranty certificates
- installation certificates
- quality and conformity reports
- delivery and acceptance records
- corporate attestations and training certificates

The first release is not a legal e-signature replacement. EVO proves integrity, issuer control and status. Legal signature or seal services can be integrated later.

## Evidence EVO can prove
1. Integrity: a compared file has the same SHA-256 digest as the registered original.
2. Issuer control: the issuing wallet signed the proof.
3. Time: the proof has a recorded registration time.
4. Status: active, revoked, superseded or expired.
5. Version chain: a newer proof can supersede an older one while preserving history.

EVO must not claim that document contents are factually true merely because the file matches the registered digest.

## MVP workflow
### Issue
1. Select PDF/document.
2. Calculate SHA-256 locally.
3. Enter document type, issuer, reference, issue date and optional expiry.
4. Sign the proof.
5. Return EVO Document ID + QR + public verification URL.
6. Original file remains on the user's device.

### Verify
- scan QR;
- enter EVO Document ID;
- choose a local file and compare its SHA-256 locally.

Public result should distinguish file match, lifecycle status, issuer evidence level, issuance date and current version.

## Lifecycle events
- DOCUMENT_ISSUED
- DOCUMENT_REVOKED
- DOCUMENT_SUPERSEDED
- DOCUMENT_RENEWED
- DOCUMENT_NOTE

Status must be derived from signed history, not from a client-side label alone.

## Data
Reuse existing EVO fields: seal_id, asset_type, title, issuer_wallet, issuer_label, asset_hash, created_at and registered_at.

Document metadata should support document_type, document_reference, file_name, mime_type, sha256, issued_at, expires_at, version and supersedes_seal_id.

Do not store document content in the MVP.

## Differentiation
EVO is not another PDF signer. It is a portable proof layer that can sit on documents produced by any ERP, CMMS, laboratory system, office workflow or custom application.

Future API target: POST /proofs/documents → EVO ID + QR + verification URL + machine-verifiable credential.

## Commercial hypothesis
- one-off proofs
- prepaid business proof packs
- API volume tiers
- verified organization profiles
- legal trust-service integrations as premium options later

## V3.0 success criteria
- issue a proof in under 60 seconds;
- verify without an account;
- modified files fail comparison;
- revocation and supersession are obvious;
- EVO never overstates what the evidence proves.
