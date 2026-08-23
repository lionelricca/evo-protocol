'use strict';

const fs=require('fs');
const assert=require('assert');
const client=fs.readFileSync('v1/service-proof-v31.js','utf8');
const css=fs.readFileSync('v1/service-proof-v31.css','utf8');
const index=fs.readFileSync('v1/index.html','utf8');
const migration=fs.readFileSync('supabase/migrations/20260821204500_add_service_proofs.sql','utf8');
const authorityMigration=fs.readFileSync('supabase/migrations/20260823180000_service_proof_authority_v400.sql','utf8');
const edge=fs.readFileSync('supabase/functions/evo-service-proof/index.ts','utf8');
const schema=fs.readFileSync('schemas/service-proof-v1.schema.json','utf8');

assert(client.includes("method:'personal_sign'"),'Service Proof owner/provider actions must use explicit wallet signatures');
assert(client.includes('hashFile=async file'),'Evidence files must be hashed locally');
assert(client.includes('Files are not uploaded'),'UI must state that evidence files are not uploaded');
assert(client.includes('PROVIDER_COUNTERSIGNED'),'Public UI must distinguish provider countersignature');
assert(client.includes('OWNER DECLARED'),'Public UI must distinguish owner-only evidence');
assert(client.includes('Service Proof applies to assets, not Document Proof'),'Document Proof must stay separate from Service Proof');
assert(client.includes("url.searchParams.set('serviceProof',proofId)"),'Designated provider must receive a portable countersign link');
assert(client.includes('evoPublicServiceProofs'),'Public Passport must render Service Proof history');
assert(css.includes('.evoServiceProofPanel'),'Service Proof workflow must have isolated styling');
assert(index.includes('service-proof-v31.css?v=20260821-v31-service-proof'),'Index must load V3.1 Service Proof CSS with a fresh cache key');
assert(index.includes('service-proof-v31.js?v=20260821-v31-service-proof'),'Index must load V3.1 Service Proof JS with a fresh cache key');

assert(migration.includes('alter table public.evo_service_proofs enable row level security'),'Service Proof table must use RLS');
assert(migration.includes('revoke all on table public.evo_service_proofs from anon, authenticated'),'Public roles must not write directly');
assert(migration.includes('grant select on table public.evo_service_proofs to anon, authenticated'),'Active Service Proofs must be publicly readable');
assert(migration.includes("evidence_level in ('OWNER_DECLARED','PROVIDER_COUNTERSIGNED')"),'Database must preserve evidence-level semantics');

assert(edge.includes('verifyMessage'),'Backend must cryptographically verify signatures');
assert(edge.includes('MAX_BODY_BYTES'),'Backend must cap payload size');
assert(edge.includes('actor_is_not_current_owner'),'Only the current owner may create a Service Proof');
assert(edge.includes('only_designated_provider_can_countersign'),'Only the designated provider may countersign');
assert(edge.includes('evo_register_service_proof_authoritative'),'Service Proof creation must use the authoritative atomic RPC');
assert(edge.includes('evo_countersign_service_proof_authoritative'),'Service Proof countersign must use the authoritative atomic RPC');
assert(edge.includes('already_countersigned'),'Conflicting countersign attempts must fail closed');
assert(edge.includes('canonical(value:unknown)'),'Service digest must use canonical structured data');
assert(schema.includes('PROVIDER_COUNTERSIGNED'),'Schema must expose the countersigned evidence level');

assert(authorityMigration.includes("pg_advisory_xact_lock(pg_catalog.hashtextextended('evo-asset-authority|' || v_seal_id, 0))"),'Service Proof creation must serialize against ownership changes for the same Seal');
assert(authorityMigration.includes('for update;'),'Countersign races must serialize on the Service Proof row');
assert(authorityMigration.includes("raise exception 'already_countersigned'"),'A second different countersignature must fail closed');
assert(authorityMigration.includes('revoke all on function public.evo_register_service_proof_authoritative(jsonb) from anon'),'Atomic creation RPC must not be callable directly by anonymous browsers');
assert(authorityMigration.includes('revoke all on function public.evo_countersign_service_proof_authoritative(jsonb) from authenticated'),'Atomic countersign RPC must not be callable directly by authenticated browsers');

console.log('EVO V4.0 Service Proof authority checks passed');
