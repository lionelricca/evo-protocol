'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

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

// Passport Transfer intentionally stays browser-public for public offer lookup and compatible integrations.
// Authority must therefore remain cryptographic/stateful rather than CORS-dependent.
const transfer=read('supabase/functions/evo-passport-transfer/index.ts');
assert(transfer.includes('"Access-Control-Allow-Origin":"*"'),'Passport Transfer public integration CORS decision changed unexpectedly');
assert(transfer.includes('const MAX_BODY_BYTES=16384'),'Passport Transfer must bound request bodies');
assert(transfer.includes('new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES'),'Passport Transfer must enforce the real UTF-8 byte limit');
assert(transfer.includes('requestOrigin&&requestOrigin!==origin'),'signed inbox request must be bound to the requesting Origin');
assert(transfer.includes('ttl<30_000||ttl>5*60_000'),'Transfer Inbox signed access must keep a short expiry');
assert(transfer.includes('EVO TRANSFER INBOX V1'),'inbox signature must bind its canonical request');
assert(transfer.includes('EVO PASSPORT TRANSFER OFFER V1'),'offer signature must keep explicit domain separation');
assert(transfer.includes('EVO PASSPORT TRANSFER ACCEPT V1'),'accept signature must keep explicit domain separation');
assert(transfer.includes('EVO PASSPORT TRANSFER CANCEL V1'),'cancel signature must keep explicit domain separation');
assert(transfer.includes('verifyMessage'),'Passport Transfer signed actions must verify wallet signatures');
assert(transfer.includes('only_recipient_can_accept'),'only the intended recipient may accept a transfer');
assert(transfer.includes('only_sender_can_cancel'),'only the sender may cancel a transfer');
assert(transfer.includes('evo_create_passport_transfer_offer_authoritative'),'transfer offers must use authoritative RPC');
assert(transfer.includes('evo_accept_passport_transfer_authoritative'),'transfer acceptance must use atomic authority RPC');
assert(transfer.includes('evo_cancel_passport_transfer_authoritative'),'transfer cancellation must use authoritative RPC');
assert(!transfer.includes('.from("evo_passport_transfers").insert('),'Edge Function must not directly insert transfer offers');

// Battery Passport intentionally stays browser-public for readiness/read/export interoperability.
// Public responses must never leak the restricted data blocks committed by the issuer.
const battery=read('supabase/functions/evo-battery-passport/index.ts');
assert(battery.includes('"Access-Control-Allow-Origin":"*"'),'Battery Passport public integration CORS decision changed unexpectedly');
assert(battery.includes('const MAX_BODY_BYTES=98_304'),'Battery Passport must bound request bodies');
assert(battery.includes('new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES'),'Battery Passport must enforce the real UTF-8 byte limit');
assert(battery.includes('commit_model')&&battery.includes('commit_passport'),'Battery signed mutation actions must remain explicit');
assert(battery.includes('freshTimestamp(signedAt)'),'Battery signed commits must reject stale signatures');
assert(battery.includes('model_integrity_mismatch'),'Battery model commit must recompute signed integrity');
assert(battery.includes('passport_integrity_mismatch'),'Battery Passport commit must recompute signed integrity');
assert(battery.includes('verifyMessage'),'Battery mutation paths must verify issuer signatures');
assert(battery.includes('evo_register_battery_model_authoritative'),'Battery model commit must use authoritative RPC');
assert(battery.includes('evo_register_battery_passport_atomic'),'Battery Passport commit must use atomic RPC');
assert.match(battery,/select\("model_id,unique_model_identifier,model_name,battery_category,nominal_energy_kwh,public_data,data_hash,status,created_at,updated_at"\)/,'public model read must select only the public data block');
assert.doesNotMatch(battery,/get_model[\s\S]{0,1200}select\([^\n]*legitimate_interest_data/,'public model read must not expose legitimate-interest data');
assert.doesNotMatch(battery,/get_model[\s\S]{0,1200}select\([^\n]*authority_data/,'public model read must not expose authority-only data');
assert.match(battery,/get_passport[\s\S]*restrictedDataExcluded:true/,'public Passport read/export must explicitly declare restricted-data exclusion');
assert.doesNotMatch(battery,/select\("passport_id,model_id,unique_battery_identifier,battery_serial,seal_id,issuer_wallet,battery_status,data_hash,status,created_at,updated_at"\)[\s\S]{0,400}individual_data/,'public Passport read must not select individual restricted data');
assert(battery.includes('legalPosition:"INTEROPERABILITY_EXPORT_NOT_CERTIFICATION"'),'DPP export must preserve the no-certification boundary');
assert(battery.includes('registryState:"NOT_REGISTERED_BY_EVO"'),'DPP export must not imply external registry enrollment');

const policy=read('docs/CORS_POLICY_V400.md');
assert(policy.includes('intentional interoperability decision'),'CORS policy must explain why the two wildcard endpoints remain public');
assert(policy.includes('CORS is a browser integration policy'),'CORS policy must not present CORS as authorization');
assert(policy.includes('inbox` requires a fresh wallet signature'),'policy must preserve the signed private-inbox boundary');
assert(policy.includes('restrictedDataExcluded')||policy.includes('public/readiness/export'),'policy must preserve the public-vs-restricted Battery distinction');

console.log('EVO V4.0 browser CORS classification and mixed-endpoint authority checks passed');
