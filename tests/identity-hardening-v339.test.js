'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const wallet=fs.readFileSync(path.join(root,'supabase/functions/register-evo-wallet/index.ts'),'utf8');
const issuer=fs.readFileSync(path.join(root,'supabase/functions/register-evo-issuer/index.ts'),'utf8');
const connector=fs.readFileSync(path.join(root,'v1/wallet-autoconnect.js'),'utf8');

assert(wallet.includes('jsr:@supabase/supabase-js@2.105.4'),'wallet endpoint must pin supabase-js');
assert(wallet.includes('const MAX_BODY_BYTES = 2048'),'wallet endpoint must bound request size');
assert(wallet.includes('"X-Content-Type-Options": "nosniff"'),'wallet endpoint must disable MIME sniffing');
assert(wallet.includes('registrationMode: "EPHEMERAL_UNTIL_SIGNED"'),'unsigned wallet connections must remain ephemeral');
assert(wallet.includes('persisted: false'),'new unsigned wallet connections must be explicitly non-persistent');
assert(!wallet.includes('.insert(row)'),'unsigned wallet registration must not insert a wallet-account row');
assert(!wallet.includes('.upsert(row)'),'unsigned wallet registration must not upsert a wallet-account row');
assert(wallet.includes('account,'),'wallet endpoint must preserve the account response shape expected by the connector');
assert(connector.includes('if(!r.ok||!data?.account)'),'browser connector compatibility requires an account response');

assert(issuer.includes('jsr:@supabase/supabase-js@2.105.4'),'issuer endpoint must pin supabase-js');
assert(issuer.includes('const MAX_BODY_BYTES=4096'),'issuer endpoint must bound request size');
assert(issuer.includes('new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES'),'issuer endpoint must enforce actual request bytes');
assert(issuer.includes('"X-Content-Type-Options":"nosniff"'),'issuer endpoint must disable MIME sniffing');
assert(issuer.includes('if(existing?.status==="SUSPENDED")return json({error:"issuer_suspended"},403)'),'suspended issuer profiles must fail closed');
assert(issuer.includes('await proveWallet(db,issuerWallet)'),'a valid signed issuer profile must promote the wallet through proof');
assert(issuer.includes('status:"WALLET_PROVEN"'),'signed wallet proof must persist WALLET_PROVEN state');
assert(issuer.indexOf('verifyMessage') < issuer.indexOf('await proveWallet(db,issuerWallet)'),'wallet persistence must happen only after signature verification');

console.log('EVO V3.3.9 identity hardening checks passed');
