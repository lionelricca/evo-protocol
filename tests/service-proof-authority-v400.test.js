'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const edge=fs.readFileSync(path.join(root,'supabase/functions/evo-service-proof/index.ts'),'utf8');
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260823180000_service_proof_authority_v400.sql'),'utf8');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/evo-security-gate.yml'),'utf8');

assert(edge.includes('evo_register_service_proof_authoritative'),'Service Proof creation must use the authoritative RPC');
assert(edge.includes('evo_countersign_service_proof_authoritative'),'Service Proof countersign must use the authoritative RPC');
assert(!edge.includes('.from("evo_service_proofs").insert(row)'),'Edge must not directly insert a Service Proof');
assert(!edge.includes('.update({provider_digest'),'Edge must not directly mutate countersign authority');
assert(edge.includes('restrictedPreflight')&&edge.includes('rejectUntrustedBrowserOrigin')&&edge.includes('withRestrictedCors'),'Service Proof browser path must use shared exact-origin CORS');
assert(!edge.includes('"Access-Control-Allow-Origin":"*"'),'Service Proof must not retain wildcard browser CORS');
assert(edge.includes('const declaredLength=Number(req.headers.get("content-length")||"0")'),'Service Proof must enforce declared request size');
assert(edge.includes('new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES'),'Service Proof must enforce actual request size');
assert(edge.includes('atomicAuthority:true'),'Service Proof API must expose atomic authority behavior');

assert(migration.includes("pg_advisory_xact_lock(pg_catalog.hashtextextended('evo-asset-authority|' || v_seal_id, 0))"),'Service Proof creation must share the per-Seal Asset Authority lock');
assert(migration.includes('actor_is_not_current_owner'),'DB boundary must reject stale owners');
assert(migration.includes("set search_path to ''"),'Service Proof RPCs must harden search_path');
assert(migration.includes('revoke all on function public.evo_register_service_proof_authoritative(jsonb) from anon'),'browser role must not execute registration RPC');
assert(migration.includes('revoke all on function public.evo_countersign_service_proof_authoritative(jsonb) from authenticated'),'browser role must not execute countersign RPC');
assert(migration.includes("if v_proof.evidence_level = 'PROVIDER_COUNTERSIGNED'"),'countersign RPC must handle already-signed state');
assert(migration.includes("raise exception 'already_countersigned'"),'conflicting second countersign must fail');

assert(workflow.includes('tests/service-proof-authority-v400.test.js'),'Security Gate must run Service Proof authority static checks');
assert(workflow.includes('20260823180000_service_proof_authority_v400.sql'),'Security Gate must apply the Service Proof authority migration');
assert(workflow.includes('tests/sql/service-proof-authority-v400.sql'),'Security Gate must run Service Proof authority SQL tests');

console.log('EVO V4.0 Service Proof Authority checks passed');
