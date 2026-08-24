# EVO V4.0 RC1 · Production Closeout — 2026-08-24

This record captures the production authority deployment completed for EVO V4.0 RC1 on 2026-08-24.

## Production changes completed

- V4 Service Proof Authority migration deployed to production.
- `evo_register_service_proof_authoritative(jsonb)` verified as `SECURITY DEFINER` with `search_path=''`.
- `evo_countersign_service_proof_authoritative(jsonb)` verified as `SECURITY DEFINER` with `search_path=''`.
- Browser roles (`anon`, `authenticated`) have no EXECUTE privilege on either Service Proof authoritative RPC.
- `service_role` retains EXECUTE authority.
- `evo-service-proof` upgraded from production v4 to v5 and now uses the authoritative RPC path.
- V4 Reality Continuity Authority migration deployed to production.
- `evo_register_reality_checkpoint_authoritative(jsonb)` verified as `SECURITY DEFINER` with `search_path=''`.
- Browser roles (`anon`, `authenticated`) have no EXECUTE privilege on the Reality Continuity authoritative RPC.
- `service_role` retains EXECUTE authority.
- `evo-reality-continuity` upgraded from production v4 to v5 and now uses the authoritative RPC path.

## Post-deployment verification

- Supabase Security Advisor: **0 security lints**.
- Orphan credit-consumption rows: **0**.
- Paid-credit counter mismatches: **0**.
- Service Proof production function v5 bundle SHA-256: `af60bf87af809a6f06a51a544eb7e3c26f6a8de44128e962cdd36c8b73b8eecf`.
- Reality Continuity production function v5 bundle SHA-256: `dd6f56894a45b3ee6634737aa80d2f21f7eaf72cc624565684471092c505f0a3`.

## Scope boundaries

This closeout did **not**:

- execute a paid checkout transaction;
- mutate the historical `V1-TEST-001` record;
- claim independent penetration-test, ISO, qualified-signature or legal-originality assurance;
- authorize statements that EVO is unhackable or 100% secure.

## Remaining release-only gates

The backend authority drift identified in the earlier production inventory is closed. Remaining release work is repository/browser promotion work: final clean-browser verification where tooling is available, repository protection, final exact-head source bundle, merge and tag/release.
