'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const edge=fs.readFileSync(path.join(root,'supabase/functions/evo-domain-verification/index.ts'),'utf8');
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260822110530_domain_check_slot_v338.sql'),'utf8');

assert(edge.includes('jsr:@supabase/supabase-js@2.105.4'),'domain verifier must pin supabase-js');
assert(edge.includes('const MAX_BODY_BYTES=4096'),'domain verifier must bound request size');
assert(edge.includes('new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES'),'domain verifier must enforce actual request bytes');
assert(edge.includes('"Cache-Control":"no-store"'),'domain verifier responses must not be cached');
assert(edge.includes('"X-Content-Type-Options":"nosniff"'),'domain verifier must disable MIME sniffing');
assert(edge.includes('setTimeout(()=>controller.abort(),5000)'),'outbound DNS must have a strict timeout');
assert(edge.includes('.rpc("evo_domain_take_check_slot"'),'DNS checks must claim an atomic database slot before lookup');
assert(edge.indexOf('.rpc("evo_domain_take_check_slot"') < edge.indexOf('records=await queryTxt'),'atomic slot must be taken before outbound DNS');
assert(edge.includes('reused:true'),'a live pending challenge must be reused instead of multiplying rows');
assert(edge.includes('"Retry-After"'),'rapid DNS rechecks must return Retry-After');

assert(migration.includes('for update'),'domain check slot must serialize concurrent checks');
assert(migration.includes('v_row.check_count >= 30'),'domain challenge must keep a hard lifetime check ceiling');
assert(migration.includes("interval '2 seconds'"),'domain checks must enforce a minimum interval');
assert(migration.includes('security definer'),'domain slot must use a privileged database boundary');
assert(migration.includes("set search_path to ''"),'domain slot must use an empty search_path');
assert(migration.includes('revoke all on function public.evo_domain_take_check_slot(text) from anon'),'anon must not execute domain slot directly');
assert(migration.includes('revoke all on function public.evo_domain_take_check_slot(text) from authenticated'),'authenticated must not execute domain slot directly');
assert(migration.includes('grant execute on function public.evo_domain_take_check_slot(text) to service_role'),'service_role must be the intended application path');

console.log('EVO V3.3.8 domain verification hardening checks passed');
