# EVO V3.3.18 · Origin & CORS Shield

## Purpose

EVO must distinguish browser origin policy from authentication and authorization. CORS can reduce cross-site browser abuse, but it cannot stop direct HTTP clients, scripts, bots or server-to-server callers. Wallet signatures, database authorization, rate limits and atomic RPC boundaries remain the real security controls.

## Current official browser origin

The current built-in production browser origin is:

- `https://lionelricca.github.io`

GitHub Pages repository paths do not change the browser Origin value, so `/evo-protocol/` is covered by that origin.

Additional HTTPS production origins can be supplied without changing source code through:

- `EVO_ALLOWED_ORIGINS=https://example.com,https://app.example.com`

Local HTTP development is disabled by default. It can be enabled explicitly with:

- `EVO_ALLOW_LOCAL_ORIGINS=true`

Only `localhost`, `127.0.0.1` and `[::1]` are considered local-development origins.

## Browser behavior

For guarded endpoints:

1. An allowed browser Origin receives `Access-Control-Allow-Origin` containing that exact Origin.
2. Wildcard `*` is not emitted.
3. `Origin: null` and untrusted browser origins fail closed with HTTP 403.
4. Preflight responses use a bounded `Access-Control-Max-Age`.
5. `Vary: Origin` is emitted for Origin-bearing requests.

## API compatibility

Requests without an `Origin` header remain accepted by the origin middleware. This preserves server-to-server/API integrations.

This is deliberate: CORS is a browser policy, not API authentication. A caller that does not send `Origin` still has to satisfy every existing EVO signature, state-machine, entitlement, rate-limit and database rule.

## V3.3.18 guarded endpoints

The first guarded set covers browser paths with the highest economic or issuer-identity impact:

- `evo-checkout`
- `register-evo-seal`
- `register-evo-wallet`
- `register-evo-issuer`
- `evo-domain-verification`
- `submit-evo-organization`

`evo-checkout` additionally requires a signed private-balance Origin to be in the same allowed-origin policy. A valid wallet signature from an arbitrary website is therefore not sufficient to read the private EVO Proof balance.

## Controls intentionally preserved

Origin hardening does not replace or weaken:

- atomic Seal + credit registration;
- checkout blockchain quorum and verification-rate limits;
- proof-gated wallet persistence;
- signed Issuer Trust profiles;
- signed domain ownership requests and bounded DNS checks;
- organization submission signature verification and one-PENDING concurrency guard.

## CI findings during implementation

The Security Gate caught two test-harness issues during this change and both were corrected before the final green run:

- the first syntax check treated a typed shared module as plain JavaScript;
- the generic Edge body-limit regression test treated `_shared/evo-cors.ts` as if it were an HTTP function entrypoint.

The final regression suite now distinguishes shared modules from `index.ts` HTTP entrypoints while continuing to require body limits on every actual Edge Function.

The implementation and the subsequent documentation-only commits passed the complete regression suite. Latest fully verified branch head before this documentation sync: `6ce3641fd13b54f46e5fedfee982a318858255d0`.

Passing checks:

- EVO Security Gate
- EVO Document Proof checks
- EVO Service Proof checks
- EVO navigation checks
- EVO navigation V2.7.3 checks

## Remaining rollout

The shared policy should next be applied, after compatibility review, to the remaining browser mutation/authority endpoints such as Passport Event, Passport Transfer, Service Proof, Reality Continuity, Battery Passport and Document Lifecycle.

Endpoints that are intentionally public observation/read interfaces must be classified separately rather than mechanically restricted. Public Pulse/Challenge/verification behavior must not be confused with authoritative mutation access.

## Deployment gate

V3.3.18 is branch-only until explicitly approved for production. Before deployment:

1. confirm the production frontend origin(s);
2. configure any custom domain through `EVO_ALLOWED_ORIGINS`;
3. decide whether local development needs temporary opt-in;
4. deploy the shared helper together with each dependent Edge Function;
5. smoke-test preflight, normal POST, wallet signing, checkout verification and Seal creation from the official frontend;
6. verify that an unrelated web Origin receives HTTP 403 and no permissive CORS header.

No production deployment, migration, record mutation or deletion is part of the branch-only V3.3.18 implementation.
