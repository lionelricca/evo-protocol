# EVO Organization Evidence

Status: V0.1 global design / no token movement / independent review required

## Principle

EVO Organization Evidence must work globally. A client must not need a domain and must not be forced into one country's registry format.

## Minimum submission

- Legal/public organization name
- Country code (ISO 3166-1 alpha-2)
- Registry/evidence type
- Official identifier, normalized locally
- Wallet signature

Optional:
- Public official reference URL
- Evidence document hash (document remains local)

## Format-tolerant identifiers

Visual formatting is not identity. EVO normalizes common separators before hashing.

Examples that should normalize equivalently when they represent the same identifier:

- `77.819.785-5`
- `77819785-5`
- `778197855`

The same principle applies to alphanumeric identifiers in other jurisdictions. Letters and digits are retained; formatting separators are removed.

## Country-aware suggestions

The UI may suggest common registry labels based on country, for example RUT, CUIT, CNPJ, RFC, NIT, RUC, UEN, Companies House, ABN/ACN, etc.

Suggestions are UX aids only. They are editable and do not define legal validity.

## Privacy

Raw official identifiers are not intended for public display. The browser derives a salted SHA-256 reference hash before submission. Optional evidence documents are hashed locally and are not uploaded in V0.

## Trust state

Submitting evidence creates `PENDING_REVIEW` only.

`ORGANIZATION_VERIFIED` requires an independent review under a published EVO policy. Wallet signatures, domain ownership, or self-submitted documents alone must never auto-grant organization verification.

## Global trust model

Evidence axes are independent:

```text
WALLET PROVEN
   ├── DOMAIN VERIFIED        optional
   ├── ORGANIZATION VERIFIED  optional
   ├── REGISTRY EVIDENCE      jurisdiction-specific
   ├── NFC CRYPTO VERIFIED    physical products
   └── other future evidence
```

Guardian should report which evidence exists and should not penalize an issuer for an evidence type that is not applicable to that issuer or jurisdiction.
