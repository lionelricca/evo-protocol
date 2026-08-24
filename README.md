# EVO Protocol

**Portable trust and provenance for documents, assets and technical evidence.**

EVO Protocol is the umbrella trust layer. It lets an issuer register cryptographic evidence, preserve signed history and publish a free verification surface without uploading the original document by default.

## Current stage: V4.6 TagTamper Verification Line

V4.0 RC1 was promoted to `main` on 2026-08-24 after the focused security/release gates passed and the Service Proof + Reality Continuity production authority closeout was completed. V4.1 consolidated the Origin-first customer surface and release integration. V4.2 added EU DPP Registry integration readiness. V4.3 added a fail-closed server adapter for the EU DPP Registry without inventing an unavailable Battery registration contract. V4.4 implemented NTAG 424 DNA SDM/SUN cryptographic verification against reviewed NXP vectors. V4.5 completed protected tag/UID/Seal binding and atomic replay authority. V4.6 adds encrypted NTAG 424 DNA TagTamper status verification while preserving the per-tag physical-pilot gate.

The product family is:

- **EVO Origin** — exact-file verification, document provenance, revisions and issuer authority.
- **EVO Passport** — identity, ownership and lifecycle history for assets.
- **EVO Service Proof** — owner-declared and provider-countersigned technical service evidence.
- **EVO Issuer Trust** — wallet, domain and organization evidence kept as distinct trust levels.
- **EVO DPP** — standards/regulatory integration layer, including EU DPP Registry readiness and a fail-closed server adapter.
- **EVO Secure NFC** — NTAG 424 DNA cryptographic verification, atomic replay authority and encrypted TagTamper opening-state verification for high-value products; the real physical pilot remains mandatory before the strongest physical-evidence claim.
- **EVO Guardian / Reality Continuity** — explainable anomaly and continuity analysis; public telemetry never elevates authoritative trust.

## Commercial focus

The first target market is **B2B technical and quality documentation**, especially documents that are frequently exchanged as PDFs but are difficult to validate after forwarding or revision:

- inspection reports;
- maintenance and service certificates;
- commissioning reports;
- calibration certificates;
- test reports;
- equipment-condition reports;
- warranty/service records;
- engineering deliverables;
- compliance evidence packages;
- OEM and supplier technical certificates;
- material and quality records such as MTC/MTR, EN 10204 and CoA workflows.

EVO is intended to integrate with existing ERPs, quality systems, portals and customer workflows through verification links, QR and future APIs rather than replacing those systems.

## What EVO proves

At the base cryptographic layer EVO can prove:

- that the exact bytes of a file match a registered SHA-256 digest;
- that an EVO issuer declared and signed a registration;
- the recorded lifecycle/version relationships;
- the wallet responsible for signed EVO actions;
- domain control or organization verification only when that evidence actually exists;
- independently validated external evidence only when an adapter has actually validated it.

EVO does **not** claim, merely from a hash, wallet signature, QR or NFC record, that:

- the statements inside a document are factually true;
- a file is a legally privileged “original”;
- a wallet signature is a qualified electronic signature;
- a physical asset is authentic;
- EVO is accredited, government-certified, ISO-certified or a qualified trust-service provider.

See `docs/PROJECT_TRUTH_V400.md` and `docs/DOCUMENT_PROVENANCE_V321.md`.

## Trust model

EVO keeps evidence classes separate instead of collapsing everything into one generic “verified” badge.

A simplified authority ladder is:

1. wallet-signed identity;
2. signed continuity/history;
3. verified digital issuer / independent countersignature;
4. externally validated or regulated/physical high-assurance evidence.

**EVO Pulse and software Challenge are observational signals only.** They may help detect anomalies, but many public observations can never compensate for missing high-assurance evidence.

## EVO Origin

For a registered document version EVO Origin records or derives:

- SHA-256 of the exact file bytes;
- EVO Seal ID;
- issuer wallet;
- optional verified-domain / organization evidence;
- registration time;
- public verification URL;
- lifecycle/replacement links;
- explicit evidence classification.

The public verifier can hash a received file locally and distinguish:

- exact match;
- exact match but revoked;
- exact match to a superseded version;
- another known EVO version in the same issuer lineage;
- mismatch / unknown file.

The selected file remains in the browser for the local SHA-256 comparison.

## Free Proof policy

Public verification is always free.

The V4 authority model intentionally does **not** grant one Free Proof for every wallet. The Free Proof is **one benefit per eligible user**, protected by the server-side anti-abuse policy. Creating another wallet does not reset eligibility.

Current pilot pricing:

- **Free Proof:** one Proof for an eligible user.
- **Individual:** US$9.90 for one additional Proof.
- **Pack 10:** US$49 for ten additional Proofs.

There is **no active US$39/month company subscription**. Business/API/enterprise packaging remains a commercial next step and must not be advertised as an activated automated plan until implemented.

## Payments

The current checkout model is non-custodial from the wallet-connection perspective:

- the customer explicitly approves the payment in the connected wallet;
- the checkout may offer compatible source assets/routes;
- EVO validates the resulting onchain payment before crediting;
- settlement for the implemented commercial plans is verified in official Circle-issued USDC on supported EVM networks;
- payment verification includes network, token contract, payer, recipient, amount, receipt/confirmation and replay/idempotency controls;
- EVO never requests or stores a seed phrase or private key.

The historical EVO token experiment is **not required** for current EVO Protocol purchases and is not part of the current commercial trust architecture.

## Security baseline carried into V4.6

The promoted V4 baseline includes defense-in-depth controls such as:

- server-side wallet-signature verification for sensitive signed actions;
- atomic Seal + credit registration;
- duplicate active asset-identity protection;
- Free Proof server-side anti-abuse authority;
- ownership-sensitive database locking/state machines;
- authoritative Service Proof and Reality Continuity RPC paths;
- checkout replay and blockchain-verification controls;
- durable verification-rate limits;
- private exact-balance reads requiring a wallet signature;
- RLS and restricted `SECURITY DEFINER` execution paths;
- local vendoring of the QR runtime;
- browser CSP hardening;
- exact-origin CORS policy for the highest-impact browser endpoints;
- bounded request bodies / abuse controls;
- PostgreSQL atomicity/concurrency tests;
- immutable GitHub Action pins and fail-closed SQL execution in CI;
- NTAG 424 DNA SDM/SUN verification against reviewed NXP vectors;
- server-only NFC keys for the pilot path;
- protected tag/UID/Seal enrollment and atomic monotonic counter acceptance;
- explicit replay, revoked-tag and pre-physical-pilot rejection paths;
- NTAG 424 DNA TagTamper encrypted SDM file-data decryption;
- fail-closed interpretation of NXP `C` / `O` / `I` permanent/current tamper states;
- server-derived dynamic MAC input that binds the encrypted tamper mirror to the authenticated message.

These controls support the description **security-hardened / defense in depth**. They do not justify claims such as “unhackable”, “100% secure” or “certified secure”.

## EU DPP Registry readiness

V4.2 introduced the integration-readiness architecture for the EU Digital Product Passport Registry and V4.3 added a server-only, fail-closed adapter with bounded batch preparation and deterministic fingerprints for future idempotency/audit evidence.

The adapter deliberately does not fabricate a successful Battery Registry submission while the official Battery semantic catalogue/contract required for that registration path remains unavailable or incomplete. EVO therefore does not claim to be an EU-certified DPP provider or to make a customer dataset automatically compliant.

See:

- `docs/DPP_COMPLIANCE_MATRIX.md`
- `docs/DPP_REGISTRY_INTEGRATION_V420.md`

## Secure NFC direction

NFC is an optional premium physical-evidence layer, not a dependency of EVO Origin or the regulatory DPP carrier itself.

V4.6 implements the reviewed NTAG 424 DNA / TagTamper software trust chain:

1. server-side AES/CMAC verification;
2. decrypted UID matching the enrolled tag;
3. tag ID + UID + EVO Seal binding;
4. ACTIVE tag state;
5. strictly increasing 24-bit read counter accepted atomically;
6. replay/revocation rejection;
7. for TagTamper, authenticated `SDMENCFileData` decryption;
8. interpretation of `TTPermStatus || TTCurrStatus` as `INTACT`, `OPEN` or fail-closed `UNKNOWN`;
9. a per-tag `physicalPilotApproved` gate before the strongest NFC claim can be emitted.

The first TagTamper pilot is pinned to a reviewed dynamic-input layout where the MAC covers:

```text
<enc>&cmac=
```

and the encrypted plaintext begins with the two NXP tamper status bytes. The server derives this MAC input internally rather than trusting arbitrary caller-provided MAC input.

A cryptographically correct read that passes replay authority but has not completed its real physical pilot remains:

```text
CRYPTO_AND_REPLAY_VALIDATED_PENDING_PHYSICAL_PILOT
```

A TagTamper profile whose status is invalid/not enabled returns:

```text
TAGTAMPER_STATUS_INVALID
```

An authenticated `OPEN` state does not invalidate the secure tag proof; it surfaces opening evidence/risk to the public proof layer.

The public NFC proof contract continues to keep:

```text
physicalAuthenticity=false
```

because cryptographic tag evidence alone does not prove the factual authenticity of the product to which the tag was attached.

See:

- `docs/NFC_ARCHITECTURE.md`
- `docs/NFC_PILOT_V421.md`
- `standards/evo-nfc-proof-v421.mjs`
- `schemas/evo-nfc-proof-v1.schema.json`
- `supabase/functions/evo-nfc-verifier/index.ts`
- `tests/nfc-crypto-v440.test.mjs`
- `tests/nfc-verifier-v440.test.js`
- `tests/nfc-replay-authority-v450.sql`

## Standards and certification direction

EVO is designed to interoperate rather than invent a closed trust vocabulary.

Current / planned targets include:

- **W3C Verifiable Credentials Data Model 2.0** — the current export is explicitly **unsecured**; no cryptographic VC proof is fabricated.
- **RFC 3161** timestamp evidence — integration target.
- **PAdES / regulated electronic-signature evidence** — integration target where legally relevant.
- **C2PA** — provenance interoperability for suitable media/content cases.
- **eIDAS / qualified trust services** — integrate qualified providers where customers require regulated trust; EVO is not a QTSP.
- **Chile Law 19.799 ecosystem** — integrate accredited providers when advanced electronic-signature requirements apply.
- **ISO/IEC 27001** — organizational certification-readiness track; no ISO certification is currently claimed.

See `docs/VC_INTEROPERABILITY_V400.md` and `docs/GO_TO_MARKET_CERTIFICATION.md`.

## Repository map

- `v1/` — current browser application.
- `standards/document-provenance-v321.mjs` — EVO Origin provenance semantics.
- `schemas/document-provenance-v1.schema.json` — public provenance schema.
- `standards/evo-vc-dm-export-v400.mjs` — W3C VC Data Model 2.0 export boundary.
- `standards/evo-nfc-proof-v421.mjs` — NFC public-evidence boundary.
- `docs/DOCUMENT_PROVENANCE_V321.md` — EVO Origin product and evidence model.
- `docs/PROJECT_TRUTH_V400.md` — authoritative V4 claims boundary.
- `docs/DPP_REGISTRY_INTEGRATION_V420.md` — EU DPP Registry integration readiness.
- `docs/NFC_ARCHITECTURE.md` — secure physical binding architecture and V4.6 TagTamper verifier boundary.
- `docs/NFC_PILOT_V421.md` — current physical-pilot execution procedure (historical path retained).
- `docs/PRODUCTION_CLOSEOUT_20260824.md` — production authority closeout evidence.
- `docs/RELEASE_CHECKLIST_V400.md` — historical V4 promotion checklist and remaining high-assurance gates.
- `docs/SECURITY.md` — security rules.
- `security/THREAT_MODEL.md` — threat model.
- `supabase/` — database migrations and Edge Functions.
- `tests/` — security, provenance, navigation, NFC and database regression tests.

## Development and release status

`main` is the promoted code baseline. New work must be developed on branches and must not silently mutate production data, production keys or historical records.

V4.6 closes the repository-side software path for the reviewed NTAG 424 DNA TagTamper pilot. Remaining gates are external or operational: obtain/provision genuine physical tags, run the closed/open/replay/alteration pilot before enabling any per-tag physical approval, protect `main`, complete clean-browser and paid-checkout evidence, finish the official EU Battery Registry integration when the Commission exposes the required path, and obtain independent security/organizational assurance before enterprise high-assurance or certification claims.

## Product rule

**The QR is discovery. The evidence graph is the product.**

For documents, the clearest promise is:

> EVO can prove that the file being checked is the exact registered version and show who declared it, its version history and the trust evidence attached to that record — without pretending that a hash alone proves legal originality or factual truth.
