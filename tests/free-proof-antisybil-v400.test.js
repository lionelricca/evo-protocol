'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const migration=fs.readFileSync(path.join(__dirname,'..','supabase','migrations','20260823233500_free_proof_antisybil_v400.sql'),'utf8');
const edge=fs.readFileSync(path.join(__dirname,'..','supabase','functions','evo-free-proof','index.ts'),'utf8');
const client=fs.readFileSync(path.join(__dirname,'..','v1','free-proof-antisybil-v400.js'),'utf8');
const session=fs.readFileSync(path.join(__dirname,'..','v1','wallet-session-v277.js'),'utf8');

assert.match(migration,/create table if not exists public\.evo_free_proof_grants/,'free proof grants must be server-authoritative');
assert.match(migration,/client_hash text not null unique/,'one persistent client signal cannot claim multiple free proofs');
assert.match(migration,/network_hash text not null/,'network abuse signal must be recorded only as a hash');
assert.match(migration,/reserved_at >= pg_catalog\.now\(\) - interval '30 days'/,'network rate window must be bounded');
assert.match(migration,/if v_network_count >= 3/,'one network cannot mint an unbounded number of free trials');
assert.match(migration,/and g\.consumed_seal_id is null\s+and g\.expires_at >= pg_catalog\.now\(\)/,'DEMO registration requires a live server reservation');
assert.match(migration,/v_source := 'PAID'/,'ineligible free users with paid credits must still be able to consume paid credit');
assert.match(migration,/set consumed_seal_id=v_seal_id, consumed_at=pg_catalog\.now\(\)/,'free reservation consumption must be atomic with Seal registration');
assert.match(migration,/revoke all on function public\.evo_reserve_free_proof/,'browser roles must not call reservation RPC directly');

assert.match(edge,/EVO_TRIAL_PEPPER/,'network/client hashes must be peppered server-side');
assert.match(edge,/x-forwarded-for/,'edge gate must derive a server-visible network signal');
assert.match(edge,/verifyMessage/,'free reservation must prove control of the wallet');
assert.match(edge,/action==="reserve"/,'edge gate must separate status from reservation');
assert.match(edge,/policy:"V400_ANTISYBIL"/,'edge response must identify the active policy');
assert.doesNotMatch(edge,/return .*requestIp\(/,'raw IP must never be returned to the client');

assert.match(client,/CLIENT_KEY='evo-free-proof-client-v400'/,'browser installation must keep a stable local trial signal');
assert.match(client,/demoAvailable:false,canCreate:false/,'client must fail closed when the anti-Sybil backend is unavailable');
assert.match(client,/Crear otra wallet no reinicia el beneficio/,'customer copy must not promise one free proof per wallet');
assert.match(client,/guardRequest\('reserve',wallet,seal\)/,'client must reserve the free entitlement only after Seal signature exists');
assert.match(session,/free-proof-antisybil-v400\.js/,'anti-Sybil client must load on the commercial surface');

console.log('EVO V4 Free Proof anti-Sybil checks passed');
