'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const edge=fs.readFileSync(path.join(root,'supabase/functions/evo-document-lifecycle/index.ts'),'utf8');
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260822120500_document_lifecycle_atomic_v3315.sql'),'utf8');

assert(edge.includes('jsr:@supabase/supabase-js@2.105.4'),'Document Lifecycle must pin supabase-js');
assert(edge.includes('npm:viem@2.21.54'),'Document Lifecycle must pin viem');
assert(edge.includes('const MAX_BODY_BYTES=16_384'),'Document Lifecycle must bound request size');
assert(edge.includes('new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES'),'Document Lifecycle must enforce actual request bytes');
assert(edge.includes('"Cache-Control":"no-store"'),'Document Lifecycle responses must not be cached');
assert(edge.includes('"X-Content-Type-Options":"nosniff"'),'Document Lifecycle responses must disable MIME sniffing');
assert(edge.includes('verifyMessage'),'issuer signature must be cryptographically verified before persistence');
assert(edge.includes('.rpc("evo_register_document_lifecycle_authoritative"'),'Edge Function must cross the authoritative lifecycle RPC boundary');
assert(!/from\("evo_document_events"\)\.insert\(/.test(edge),'Edge Function must not insert lifecycle events outside the authoritative RPC');
assert(edge.includes('atomicAuthority:true'),'successful lifecycle registration must declare atomic authority');

assert(migration.includes('create or replace function public.evo_register_document_lifecycle_authoritative'),'Document Lifecycle authority RPC must be migration-controlled');
assert(migration.includes('security definer') && migration.includes("set search_path to ''"),'Document Lifecycle authority RPC must use hardened SECURITY DEFINER semantics');
assert(migration.includes("'evo-document-lifecycle|'||v_lock_first"),'Document Lifecycle must use a deterministic per-document advisory lock');
assert(migration.includes("if v_related<>'' and v_related<v_seal_id"),'supersede must deterministically order its two document locks');
assert(migration.includes("document_lifecycle_already_terminal"),'terminal documents must reject later lifecycle mutations');
assert(migration.includes("replacement_is_not_current"),'supersede target must still be current');
assert(migration.includes("event_id_conflict"),'conflicting retry IDs must fail closed');
assert(migration.includes("'idempotent',true"),'exact retries must be idempotent');
assert(migration.includes('revoke all on function public.evo_register_document_lifecycle_authoritative(jsonb) from anon'),'anon must not execute the authority RPC');
assert(migration.includes('revoke all on function public.evo_register_document_lifecycle_authoritative(jsonb) from authenticated'),'authenticated must not execute the authority RPC');
assert(migration.includes('grant execute on function public.evo_register_document_lifecycle_authoritative(jsonb) to service_role'),'service role must be the application path');

console.log('EVO V3.3.15 Document Lifecycle hardening checks passed');
