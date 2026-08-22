'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const edge=fs.readFileSync(path.join(root,'supabase/functions/submit-evo-organization/index.ts'),'utf8');
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260822111047_organization_single_pending_guard_v3310.sql'),'utf8');

assert(edge.includes('jsr:@supabase/supabase-js@2.105.4'),'organization endpoint must pin supabase-js');
assert(edge.includes('const MAX_BODY_BYTES=8192'),'organization endpoint must bound request size');
assert(edge.includes('new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES'),'organization endpoint must enforce actual request bytes');
assert(edge.includes('"Cache-Control":"no-store"'),'organization responses must not be cached');
assert(edge.includes('"X-Content-Type-Options":"nosniff"'),'organization endpoint must disable MIME sniffing');
assert(edge.indexOf('verifyMessage') < edge.indexOf('await proveWallet(db,issuerWallet)'),'wallet proof persistence must occur only after signature verification');
assert(edge.indexOf('verifyMessage') < edge.indexOf('.from("evo_organization_submissions").insert(row)'),'organization evidence must be signed before database insertion');
assert(edge.includes('if(last&&Date.now()-new Date(last.created_at).getTime()<30_000)'),'application layer must retain a per-wallet cooldown');
assert(edge.includes('submission_conflict_or_pending_exists'),'concurrent pending conflicts must fail closed');

assert(migration.includes('create unique index if not exists evo_organization_one_pending_per_wallet_idx'),'database must enforce one PENDING organization submission per wallet');
assert(migration.includes('on public.evo_organization_submissions(issuer_wallet)'),'pending uniqueness must be wallet-scoped');
assert(migration.includes("where status = 'PENDING'"),'uniqueness must apply only to PENDING submissions');

console.log('EVO V3.3.10 organization submission hardening checks passed');
