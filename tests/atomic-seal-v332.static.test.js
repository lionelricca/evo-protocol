'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260822105136_atomic_seal_registration_credit_v332.sql'),'utf8');
const identityGuard=fs.readFileSync(path.join(root,'supabase/migrations/20260822105154_active_asset_serial_guard_v332.sql'),'utf8');
const edge=fs.readFileSync(path.join(root,'supabase/functions/register-evo-seal/index.ts'),'utf8');

assert(migration.includes('evo_register_seal_with_credit'),'atomic registration RPC must remain versioned');
assert(migration.includes("pg_advisory_xact_lock(pg_catalog.hashtextextended('evo-credit|' || v_wallet, 0))"),'wallet-wide advisory lock must protect entitlement decisions');
assert(migration.includes("set search_path to ''"),'privileged RPCs must use an empty search_path');
assert(migration.includes("revoke all on function public.evo_register_seal_with_credit(jsonb) from anon"),'anon must not execute atomic registration');
assert(migration.includes("revoke all on function public.evo_register_seal_with_credit(jsonb) from authenticated"),'authenticated must not execute atomic registration');
assert(migration.includes("grant execute on function public.evo_register_seal_with_credit(jsonb) to service_role"),'service role must execute atomic registration');
assert(migration.includes("raise exception 'seal_id_conflict'"),'same Seal ID with conflicting content must fail closed');
assert(migration.includes('v_reuse_consumption := true'),'legacy orphan credit consumption must be reusable without charging twice');
assert(migration.includes('if not v_reuse_consumption then'),'reused legacy consumption must not be inserted twice');
assert(migration.includes("'ACTIVE',\n    coalesce(p_row -> 'metadata'"),'database boundary must force initial Seal status ACTIVE');
assert(migration.indexOf('insert into public.evo_seals as s') < migration.lastIndexOf('insert into public.evo_credit_consumptions'),'new consumption must be recorded after Seal insertion inside the same transaction');

assert(identityGuard.includes("raise exception 'duplicate_asset_serial'"),'active duplicate asset identity must fail closed');
assert(identityGuard.includes('before insert or update of issuer_wallet, asset_hash, serial, status'),'identity rule must protect all relevant table writes');
assert(identityGuard.includes('s.seal_id <> new.seal_id'),'same Seal updates must not self-conflict');

assert(edge.includes('.rpc("evo_register_seal_with_credit"'),'Edge registration must use the atomic RPC');
assert(!edge.includes('.rpc("evo_claim_passport_credit"'),'Edge registration must not return to the historical two-step credit claim');
assert(edge.includes('String(dup.seal_id).toUpperCase() !== String(seal.sealId).toUpperCase()'),'friendly duplicate preflight must allow exact idempotent retries through to the RPC');
assert(edge.includes('message.includes("seal_id_conflict")'),'Edge must expose a deterministic conflict for altered same-ID retries');
assert(edge.includes('atomic: true'),'successful registration must declare its atomic economic boundary');

console.log('EVO V3.3.2 atomic registration static checks passed');
