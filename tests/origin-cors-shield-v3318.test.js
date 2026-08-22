'use strict';
const assert=require('assert');
const fs=require('fs');

const helper=fs.readFileSync('supabase/functions/_shared/evo-cors.ts','utf8');
const checkout=fs.readFileSync('supabase/functions/evo-checkout/index.ts','utf8');
const seal=fs.readFileSync('supabase/functions/register-evo-seal/index.ts','utf8');

assert(helper.includes('https://lionelricca.github.io'),'current GitHub Pages origin must be explicitly allowlisted');
assert(helper.includes('EVO_ALLOWED_ORIGINS'),'additional production origins must be environment-configurable');
assert(helper.includes('EVO_ALLOW_LOCAL_ORIGINS'),'local development must require an explicit opt-in');
assert(helper.includes('origin === "null"'),'opaque/null browser origins must be rejected');
assert(helper.includes('browser_origin_not_allowed'),'untrusted browser origins must fail closed');
assert(helper.includes('Access-Control-Max-Age'),'preflight responses must be bounded/cacheable');
assert(!helper.includes('"Access-Control-Allow-Origin": "*"'),'restricted CORS helper must never emit wildcard origin');
assert(helper.includes('if (!requestOrigin || isAllowedBrowserOrigin(requestOrigin)) return null'),'server-to-server requests without Origin remain API-compatible');

for(const [name,src] of [['checkout',checkout],['register-evo-seal',seal]]){
  assert(src.includes('../_shared/evo-cors.ts'),`${name} must use the shared origin policy`);
  assert(src.includes('restrictedPreflight(req)'),`${name} must gate browser preflight`);
  assert(src.includes('rejectUntrustedBrowserOrigin(req)'),`${name} must reject hostile browser origins`);
  assert(src.includes('withRestrictedCors(req, await handle(req))'),`${name} must attach exact-origin CORS to actual responses`);
  assert(!src.includes('"Access-Control-Allow-Origin": "*"'),`${name} must not retain wildcard CORS`);
}

assert(checkout.includes('canonicalAllowedBrowserOrigin'),'signed private balance origin must itself be an allowed EVO origin');
assert(checkout.includes('requestOrigin && requestOrigin !== origin'),'signed private balance must still bind the request Origin to the signed Origin');
assert(seal.includes('evo_register_seal_with_credit'),'CORS hardening must not replace the atomic Seal economic boundary');

console.log('EVO V3.3.18 Origin & CORS Shield checks passed');
