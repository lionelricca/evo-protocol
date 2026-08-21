'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const edge=fs.readFileSync(path.join(root,'supabase/functions/evo-checkout/index.ts'),'utf8');
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260821235500_checkout_verification_rate_limit.sql'),'utf8');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/evo-security-gate.yml'),'utf8');

assert(edge.includes('const MAX_BODY_BYTES = 4096'),'checkout must define a strict request-size ceiling');
assert(edge.includes('new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES'),'checkout must enforce actual request bytes, not only Content-Length');
assert(edge.includes('"X-Content-Type-Options": "nosniff"'),'checkout responses must disable MIME sniffing');
assert(edge.includes('.from("evo_checkout_payments")'),'checkout must look for an already-committed payment before chain RPC work');
assert(edge.includes('cached: true'),'already-committed payments must use the cheap idempotent path');
assert(edge.includes('.rpc("evo_checkout_take_verification_slot"'),'checkout must take a durable verification slot before outbound chain RPC');
assert(edge.includes('verification_rate_limited'),'checkout must expose a deterministic rate-limit response');
assert(edge.includes('"Retry-After"'),'checkout 429 must tell the client when to retry');
assert(edge.indexOf('.rpc("evo_checkout_take_verification_slot"') < edge.indexOf('views.push(await readChain'),'rate limit must execute before blockchain RPC fan-out');
assert(edge.indexOf('.from("evo_checkout_payments")') < edge.indexOf('.rpc("evo_checkout_take_verification_slot"'),'committed payment cache must be checked before consuming a verification slot');

assert(migration.includes('create table if not exists public.evo_checkout_verification_limits'),'durable verification state must be migration-controlled');
assert(migration.includes('alter table public.evo_checkout_verification_limits enable row level security'),'rate state must have RLS enabled');
assert(migration.includes('security definer') && migration.includes("set search_path to ''"),'rate-limit RPC must use hardened SECURITY DEFINER semantics');
assert(migration.includes('v_global <= 240') && migration.includes('v_payer <= 60') && migration.includes('v_tx_count <= 20'),'global, payer and transaction cost ceilings must remain explicit');
assert(migration.includes('revoke all on function public.evo_checkout_take_verification_slot(text,text) from anon'),'anon must not execute the rate limiter directly');
assert(migration.includes('grant execute on function public.evo_checkout_take_verification_slot(text,text) to service_role'),'service role must be the application path');

const psqlRuns=[...workflow.matchAll(/^\s*run:\s*psql\s+(.+)$/gm)].map(match=>match[1]);
assert(psqlRuns.length >= 7,'security gate must exercise all PostgreSQL migrations/tests');
for(const args of psqlRuns){
  assert(args.includes('-v ON_ERROR_STOP=1'),`PostgreSQL CI command must fail on the first SQL error: ${args}`);
}

console.log('EVO V3.3.4 checkout hardening checks passed');
