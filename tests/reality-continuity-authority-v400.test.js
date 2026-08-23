'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const edge = fs.readFileSync('supabase/functions/evo-reality-continuity/index.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260823181500_reality_continuity_authority_v400.sql', 'utf8');
const transfer = fs.readFileSync('supabase/migrations/20260822113209_transfer_state_machine_v3313.sql', 'utf8');
const fixture = fs.readFileSync('tests/sql/reality-authority-fixture-v400.sql', 'utf8');

assert.match(edge, /\.rpc\(["']evo_register_reality_checkpoint_authoritative["']/, 'Reality Continuity commit must use the authoritative RPC');
assert.doesNotMatch(edge, /\.from\(["']evo_reality_snapshots["']\)\.insert\(/, 'Edge Function must not directly insert authoritative checkpoints');
assert.match(edge, /atomicAuthority:\s*true/, 'successful commits must expose atomic authority semantics');

assert.match(migration, /security definer/i, 'authority RPC must be SECURITY DEFINER');
assert.match(migration, /set search_path to ''/i, 'authority RPC must pin an empty search_path');
assert.match(migration, /pg_advisory_xact_lock[\s\S]*evo-asset-authority\|/, 'Reality Continuity must take the shared per-Seal authority lock');
assert.match(transfer, /pg_advisory_xact_lock[\s\S]*evo-asset-authority\|/, 'Transfer state machine must keep the same per-Seal authority lock namespace');
assert.match(migration, /from public\.evo_seals/, 'authority RPC must re-read authoritative Seal state');
assert.match(migration, /from public\.evo_passport_events/, 'authority RPC must re-read ownership and Passport history');
assert.match(migration, /extensions\.digest\(/, 'authority RPC must recompute evidence and continuity hashes server-side');
assert.match(migration, /stale_evidence_root/, 'authority RPC must reject stale evidence');
assert.match(migration, /stale_previous_root/, 'authority RPC must reject stale chain heads');
assert.match(migration, /signer_is_not_current_owner/, 'authority RPC must reject a stale owner');
assert.match(migration, /snapshot_id_conflict/, 'authority RPC must preserve idempotent identity semantics');

for (const role of ['public', 'anon', 'authenticated']) {
  assert.match(migration, new RegExp(`revoke all on function public\\.evo_register_reality_checkpoint_authoritative\\(jsonb\\) from ${role}`, 'i'), `${role} must not execute the authority RPC directly`);
}
assert.match(migration, /grant execute on function public\.evo_register_reality_checkpoint_authoritative\(jsonb\) to service_role/i, 'service_role must be the browser-backend execution boundary');

assert.match(fixture, /create extension if not exists pgcrypto with schema extensions/i, 'PostgreSQL fixture must provide the pinned pgcrypto schema used by the migration');
assert.match(fixture, /unique\(seal_id,evidence_root\)/i, 'fixture must preserve duplicate-evidence protection');
assert.match(fixture, /evo_reality_one_child_per_parent/i, 'fixture must preserve one-child-per-parent chain protection');

console.log('EVO V4.0 Reality Continuity authority checks passed');
