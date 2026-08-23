'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const edge=read('supabase/functions/evo-reality-continuity/index.ts');
const migration=read('supabase/migrations/20260823181500_reality_continuity_authority_v400.sql');
const transfer=read('supabase/migrations/20260822113209_transfer_state_machine_v3313.sql');
const fixture=read('tests/sql/reality-authority-fixture-v400.sql');
const workflow=read('.github/workflows/evo-security-gate.yml');

assert.match(edge,/\.rpc\(["']evo_register_reality_checkpoint_authoritative["']/,'Reality commit must use the authoritative RPC');
assert.doesNotMatch(edge,/\.from\(["']evo_reality_snapshots["']\)\.insert\(/,'Edge Function must not directly insert authoritative checkpoints');
assert.match(edge,/atomicAuthority:\s*true/,'successful commits must expose atomic authority semantics');

assert.match(migration,/security definer/i,'authority RPC must be SECURITY DEFINER');
assert.match(migration,/set search_path to ''/i,'authority RPC must pin an empty search_path');
assert.match(migration,/pg_advisory_xact_lock[\s\S]*evo-asset-authority\|/,'Reality Continuity must take the shared per-Seal authority lock');
assert.match(transfer,/pg_advisory_xact_lock[\s\S]*evo-asset-authority\|/,'Transfer state machine must keep the same per-Seal authority lock namespace');
assert.match(migration,/from public\.evo_seals/,'authority RPC must re-read authoritative Seal state');
assert.match(migration,/from public\.evo_passport_events/,'authority RPC must re-read ownership and Passport history');
assert.match(migration,/extensions\.digest\(v_state_canonical,'sha256'\)/,'authority RPC must recompute evidence hash server-side');
assert.match(migration,/extensions\.digest\(v_continuity_canonical,'sha256'\)/,'authority RPC must recompute continuity hash server-side');
assert.match(migration,/signer_is_not_current_owner/,'authority RPC must reject a stale owner');
assert.match(migration,/stale_previous_root/,'authority RPC must reject stale chain heads');
assert.match(migration,/stale_evidence_root/,'authority RPC must reject stale evidence roots');
assert.match(migration,/stale_evidence_state/,'authority RPC must reject stale evidence state');
assert.match(migration,/snapshot_id_conflict/,'authority RPC must preserve idempotent identity semantics');

for(const role of ['public','anon','authenticated']){
  assert.match(migration,new RegExp(`revoke all on function public\\.evo_register_reality_checkpoint_authoritative\\(jsonb\\) from ${role}`,'i'),`${role} must not execute the authority RPC directly`);
}
assert.match(migration,/grant execute on function public\.evo_register_reality_checkpoint_authoritative\(jsonb\) to service_role/i,'service_role must be the backend execution boundary');

assert.match(fixture,/create extension if not exists pgcrypto with schema extensions/i,'fixture must provide pgcrypto in the extensions schema');
assert.match(fixture,/unique\(seal_id,evidence_root\)/i,'fixture must preserve duplicate-evidence protection');
assert.match(fixture,/unique\(seal_id,continuity_root\)/i,'fixture must preserve duplicate-continuity protection');
assert.match(fixture,/evo_reality_one_child_per_parent/i,'fixture must preserve one-child-per-parent chain protection');

assert.match(workflow,/tests\/reality-authority-v400\.test\.js/,'Security Gate must run Reality authority static checks');
assert.match(workflow,/20260823181500_reality_continuity_authority_v400\.sql/,'Security Gate must apply the Reality authority migration');
assert.match(workflow,/tests\/sql\/reality-authority-v400\.sql/,'Security Gate must run PostgreSQL Reality authority checks');

console.log('EVO V4.0 Reality Continuity Authority checks passed');
