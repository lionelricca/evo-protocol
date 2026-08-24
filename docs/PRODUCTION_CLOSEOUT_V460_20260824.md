# EVO V4.6 · Production Closeout — 2026-08-24

This record captures the production state after promotion of EVO V4.6 and deployment of the TagTamper-capable NFC verifier.

## Repository promotion

- Release version: `4.6.0`.
- Promoted PR: `#59 — EVO V4.6 · NTAG 424 DNA TagTamper verification`.
- Validated PR head: `2d2a36f33edff8be3c500d18a8ff32e622521653`.
- `main` merge commit: `ef9e8b77203615ac98bbcbb59490a2cf1e14a594`.
- Ten focused GitHub Actions gates passed on the exact promoted head:
  - EVO Security Gate;
  - EVO Release Readiness checks;
  - EVO Document Proof checks;
  - EVO Service Proof checks;
  - EVO navigation checks;
  - EVO navigation V2.7.3 checks;
  - EVO DPP Registry checks;
  - EVO NFC Crypto checks;
  - EVO NFC Authority checks;
  - EVO Release Bundle.

The Security Gate completed its database authority, atomicity, concurrency and regression sequence successfully before promotion.

## Production Edge Function deployment

`evo-nfc-verifier` was upgraded in the production Supabase project after the V4.6 merge.

- Function slug: `evo-nfc-verifier`.
- Production function version: `6`.
- Status: `ACTIVE`.
- Function ID: `064c562b-f1da-4208-814f-6ff71aebbae6`.
- Bundle SHA-256: `a278ed45596c3287bb1ee902fdd9af9debba5829583ac8267224954ab1dd4eb2`.
- Existing public-verification JWT behavior was preserved; no authentication mode was relaxed relative to the previous deployed function.
- No tag AES keys were added, changed or exposed during deployment.
- No physical tag was enrolled or approved during deployment.

The deployed source contains the V4.6 server-side TagTamper path:

1. NTAG 424 DNA SDM/SUN verification;
2. NXP ENC session-key derivation;
3. authenticated `SDMENCFileData` decryption;
4. server-side `TTPermStatus || TTCurrStatus` parsing;
5. NXP `C` / `O` / `I` state handling;
6. server-derived dynamic MAC input for the reviewed `<enc>&cmac=` pilot layout;
7. tag + UID + Seal binding;
8. atomic monotonic replay authority;
9. per-tag `physicalPilotApproved` gate before the strongest NFC claim.

## Database authority revalidation

Post-deployment checks confirmed:

- `public.evo_nfc_tags` contains **0 rows**; there are still no production physical tags enrolled.
- `public.evo_accept_nfc_counter` remains `SECURITY DEFINER`.
- Its function configuration keeps `search_path=''`.
- `anon` EXECUTE privilege: **false**.
- `authenticated` EXECUTE privilege: **false**.
- `service_role` EXECUTE privilege: **true**.
- Browser access to the protected NFC registry therefore remains separate from server replay authority.

## Security review after deployment

Supabase Security Advisor returned **0 security lints** after the V4.6 deployment.

No schema migration was required for V4.6 because TagTamper verification extends the existing server verifier while retaining the V4.5 protected tag/UID/Seal/counter authority model.

## Runtime verification boundary

Repository CI verifies the NXP reference vectors and verifier behavior, and the production function bundle/source was retrieved after deployment to confirm the V4.6 code was active.

A direct production `self_test` POST was not recorded from the available connected tooling in this closeout. The environment used for this closeout did not expose an Edge Function invocation action, and an unrelated container DNS limitation prevented using that container as an alternate HTTP client. This is recorded explicitly rather than treating deployment status as a fabricated runtime request result.

A real physical-tag request is intentionally impossible at this stage because no tag is enrolled and no pilot keys were introduced.

## Repository protection finding

At closeout time, GitHub reports:

- branch: `main`;
- `protected: false`;
- required status-check enforcement: off.

This remains an external repository-administration gate. The available GitHub integration used for this closeout can inspect the state but does not expose the branch/ruleset-protection mutation required to enable it.

## Remaining external / operational gates

These are no longer missing software implementation in the reviewed V4.6 NFC path:

1. Enable GitHub branch/ruleset protection for `main` and require the critical CI checks.
2. Obtain genuine NTAG 424 DNA / TagTamper samples from a traceable source.
3. Provision unique non-default laboratory keys and the reviewed SDM/NDEF layout.
4. Execute the physical V4.6 sequence: closed `INTACT` → increasing counter → replay rejection → altered-data rejection → physical opening → persistent `OPEN`.
5. Keep `physicalPilotApproved=false` until each real tag has passed the complete physical test.
6. Execute a clean-browser production smoke test.
7. Execute one controlled paid checkout end-to-end before treating the commercial payment path as independently revalidated for this release.
8. Complete the official EU Battery DPP Registry submission path only when the Commission exposes the usable semantic/authentication contract.
9. Obtain an independent penetration/security assessment before enterprise high-assurance security claims.
10. Build an ISMS and pursue ISO/IEC 27001 only if an organizational certification claim is commercially required.

## Claims boundary

V4.6 may be described as a security-hardened software implementation with cryptographic NFC and TagTamper verification architecture backed by regression tests and deployed server authority.

It must **not** be described solely from this evidence as:

- an authentic-product guarantee;
- ISO certified;
- EU certified;
- a qualified trust service or QTSP;
- a qualified electronic-signature service;
- proof of legal originality;
- unhackable or 100% secure.

The public NFC evidence contract continues to keep `physicalAuthenticity=false` until separate product/issuer assurance evidence supports any stronger assertion.
