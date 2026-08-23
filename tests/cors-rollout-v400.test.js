'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const guarded=[
  'supabase/functions/register-evo-passport-event/index.ts',
  'supabase/functions/evo-service-proof/index.ts',
  'supabase/functions/evo-reality-continuity/index.ts',
  'supabase/functions/evo-document-lifecycle/index.ts'
];

for(const rel of guarded){
  const source=fs.readFileSync(path.join(root,rel),'utf8');
  assert(source.includes('../_shared/evo-cors.ts'),`${rel} must import the shared CORS policy`);
  assert(source.includes('restrictedPreflight'),`${rel} must use restricted preflight`);
  assert(source.includes('rejectUntrustedBrowserOrigin'),`${rel} must reject untrusted browser origins`);
  assert(source.includes('withRestrictedCors'),`${rel} must attach exact-origin response headers`);
  assert(!source.includes('"Access-Control-Allow-Origin":"*"'),`${rel} must not keep compact wildcard CORS`);
  assert(!source.includes('"Access-Control-Allow-Origin": "*"'),`${rel} must not keep wildcard CORS`);
  assert(source.includes('"X-Content-Type-Options":"nosniff"')||source.includes('"X-Content-Type-Options": "nosniff"'),`${rel} must retain nosniff`);
  assert(source.includes('"Cache-Control":"no-store"')||source.includes('"Cache-Control": "no-store"'),`${rel} must retain no-store`);
}

const transfer=fs.readFileSync(path.join(root,'supabase/functions/evo-passport-transfer/index.ts'),'utf8');
const battery=fs.readFileSync(path.join(root,'supabase/functions/evo-battery-passport/index.ts'),'utf8');
assert(transfer.includes('Access-Control-Allow-Origin'), 'Passport Transfer CORS must remain explicitly tracked until its mixed lookup/inbox/mutation compatibility review is completed');
assert(battery.includes('Access-Control-Allow-Origin'), 'Battery Passport CORS must remain explicitly tracked until its mixed public/export/mutation compatibility review is completed');

const checklist=fs.readFileSync(path.join(root,'docs/RELEASE_CHECKLIST_V400.md'),'utf8');
assert(checklist.includes('Passport Transfer')&&checklist.includes('Battery Passport'),'Release checklist must name the two remaining mixed-action CORS endpoints');

console.log('EVO V4.0 expanded CORS rollout checks passed');
