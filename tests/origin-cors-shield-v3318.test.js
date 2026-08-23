'use strict';
const assert=require('assert');
const fs=require('fs');

const helper=fs.readFileSync('supabase/functions/_shared/evo-cors.ts','utf8');
const guardedFiles={
  checkout:fs.readFileSync('supabase/functions/evo-checkout/index.ts','utf8'),
  'register-evo-seal':fs.readFileSync('supabase/functions/register-evo-seal/index.ts','utf8'),
  'register-evo-wallet':fs.readFileSync('supabase/functions/register-evo-wallet/index.ts','utf8'),
  'register-evo-issuer':fs.readFileSync('supabase/functions/register-evo-issuer/index.ts','utf8'),
  'evo-domain-verification':fs.readFileSync('supabase/functions/evo-domain-verification/index.ts','utf8'),
  'submit-evo-organization':fs.readFileSync('supabase/functions/submit-evo-organization/index.ts','utf8'),
  'evo-document-lifecycle':fs.readFileSync('supabase/functions/evo-document-lifecycle/index.ts','utf8'),
};

assert(helper.includes('https://lionelricca.github.io'),'current GitHub Pages origin must be explicitly allowlisted');
assert(helper.includes('EVO_ALLOWED_ORIGINS'),'additional production origins must be environment-configurable');
assert(helper.includes('EVO_ALLOW_LOCAL_ORIGINS'),'local development must require an explicit opt-in');
assert(helper.includes('origin === "null"'),'opaque/null browser origins must be rejected');
assert(helper.includes('browser_origin_not_allowed'),'untrusted browser origins must fail closed');
assert(helper.includes('Access-Control-Max-Age'),'preflight responses must be bounded/cacheable');
assert(!helper.includes('"Access-Control-Allow-Origin": "*"'),'restricted CORS helper must never emit wildcard origin');
assert(helper.includes('if (!requestOrigin || isAllowedBrowserOrigin(requestOrigin)) return null'),'server-to-server requests without Origin remain API-compatible');

for(const [name,src] of Object.entries(guardedFiles)){
  assert(src.includes('../_shared/evo-cors.ts'),`${name} must use the shared origin policy`);
  assert(src.includes('restrictedPreflight(req)'),`${name} must gate browser preflight`);
  assert(src.includes('rejectUntrustedBrowserOrigin(req)'),`${name} must reject hostile browser origins`);
  assert(/withRestrictedCors\(req,\s*await handle\(req\)\)/.test(src),`${name} must attach exact-origin CORS to actual responses`);
  assert(!src.includes('"Access-Control-Allow-Origin": "*"'),`${name} must not retain wildcard CORS`);
}

const checkout=guardedFiles.checkout;
const seal=guardedFiles['register-evo-seal'];
assert(checkout.includes('canonicalAllowedBrowserOrigin'),'signed private balance origin must itself be an allowed EVO origin');
assert(checkout.includes('requestOrigin && requestOrigin !== origin'),'signed private balance must still bind the request Origin to the signed Origin');
assert(seal.includes('evo_register_seal_with_credit'),'CORS hardening must not replace the atomic Seal economic boundary');
assert(guardedFiles['evo-domain-verification'].includes('evo_domain_take_check_slot'),'origin shielding must preserve the DNS-check abuse-control boundary');
assert(guardedFiles['submit-evo-organization'].includes('submission_conflict_or_pending_exists'),'origin shielding must preserve organization concurrency handling');
assert(guardedFiles['register-evo-wallet'].includes('EPHEMERAL_UNTIL_SIGNED'),'origin shielding must preserve proof-gated wallet persistence semantics');
assert(guardedFiles['evo-document-lifecycle'].includes('evo_register_document_lifecycle_authoritative'),'origin shielding must preserve atomic Document Lifecycle authority');

console.log('EVO V3.3.18 Origin & CORS Shield checks passed');
