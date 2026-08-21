# EVO Public Asset Page V2.4

The public asset page is the customer-facing view opened from an EVO verification link or QR.

It is intentionally read-only. It reuses the existing EVO Seal, Issuer Trust and Passport history layers and does not request a wallet connection, signature, token approval or payment.

## Public evidence shown

- EVO Seal ID and asset identity
- registration and signing state
- current owner derived from accepted Passport transfers
- issuer public trust state and optional verified domain
- asset metadata and optional file fingerprint
- signed Passport lifecycle history
- shareable verification URL and QR

## QR mode

When the URL contains `?seal=<EVO_ID>`, the application enters a public presentation mode that hides pricing, creation, wallet controls and owner-management sections. The technical verification record remains available on demand.

## Claim boundary

The page demonstrates available digital evidence: registration, signature, data integrity and lifecycle history. It does not by itself certify physical authenticity, mechanical condition, or the truth of an owner-provided statement.
