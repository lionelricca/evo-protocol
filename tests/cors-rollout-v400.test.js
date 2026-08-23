'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const guarded=[
  'supabase/functions/register-evo-passport-event/index.ts',
  'supabase/functions/evo-service-proof/index.ts',
  'supabase/functions/evo-reality-continuity/index.ts',
  'supabase/functions/evo-document-lifecycle/index.ts'
];

for(const rel of guarded){
  const source=read(rel);
  assert(source.includes('../_shared/evo-cors.ts'),`${rel} must import the shared CORS policy`);
  assert(source.includes('restrictedPreflight'),`${rel} must use restricted preflight`);
  assert(source.includes('rejectUntrustedBrowserOrigin'),`${rel} must reject untrusted browser origins`);
  assert(source.includes('withRestrictedCors'),`${rel} must attach exact-origin response headers`);
  assert(!source.includes('"Access-Control-Allow-Origin":"*"'),`${rel} must not keep compact wildcard CORS`);
  assert(!source.includes('"Access-Control-Allow-Origin": "*"'),`${rel} must not keep wildcard CORS`);
  assert(source.includes('"X-Content-Type-Options":"nosniff"')||source.includes('"X-Content-Type-Options": "nosniff"'),`${rel} must retain nosniff`);
  assert(source.includes('"Cache-Control":"no-store"')||source.includes('"Cache-Control": "no-store"'),`${rel} must retain no-store`);
}

// Passport Transfer intentionally stays browser-public because it mixes public lookup with signed transfer actions.
const transfer=read('supabase/functions/evo-passport-transfer/index.ts');
assert(transfer.includes('"Access-Control-Allow-Origin":"*"'),'Passport Transfer public integration CORS decision changed unexpectedly');
assert(transfer.includes('const MAX_BODY_BYTES=16384'),'Passport Transfer must bound request bodies');
assert(transfer.includes('origin_mismatch'),'signed inbox request must remain Origin-bound');
assert(transfer.includes('EVO TRANSFER INBOX V1'),'inbox signature must bind its canonical request');
assert(transfer.includes('verifyMessage'),'Passport Transfer mutations must verify wallet signatures');
assert(transfer.includes('evo_create_passport_transfer_offer_authoritative'),'transfer offers must use authoritative RPC');
assert(transfer.includes('evo_accept_passport_transfer_authoritative'),'transfer acceptance must use atomic authority RPC');

// Battery Passport intentionally stays browser-public because it mixes public readiness/read/export with signed commits.
const battery=read('supabase/functions/evo-battery-passport/index.ts');
assert(battery.includes('"Access-Control-Allow-Origin":"*"'),'Battery Passport public integration CORS decision changed unexpectedly');
assert(battery.includes('const MAX_BODY_BYTES=98_304'),'Battery Passport must bound request bodies');
assert(battery.includes('commit_model')&&battery.includes('commit_passport'),'Battery signed mutation actions must remain explicit');
assert(battery.includes('verifyMessage'),'Battery mutation paths must verify issuer signatures');
assert(battery.includes('evo_register_battery_model_authoritative'),'Battery model commit must use authoritative RPC');
assert(battery.includes('evo_register_battery_passport_atomic'),'Battery Passport commit must use atomic RPC');

const policy=read('docs/CORS_POLICY_V400.md');
assert(policy.includes('intentional interoperability decision'),'CORS policy must explain why the two wildcard endpoints remain public');
assert(policy.includes('CORS is a browser integration policy'),'CORS policy must not present CORS as authorization');

console.log('EVO V4.0 browser CORS classification checks passed');
