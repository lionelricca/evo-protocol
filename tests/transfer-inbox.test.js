'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const test=require('node:test');

const ui=()=>fs.readFileSync('v1/transfer-inbox.js','utf8');
const edge=()=>fs.readFileSync('supabase/functions/evo-passport-transfer/index.ts','utf8');
const loader=()=>fs.readFileSync('v1/organization-simple.js','utf8');

test('Transfer Inbox requires an explicit wallet signature',()=>{
  const code=ui();
  assert.match(code,/EVO TRANSFER INBOX V1/);
  assert.match(code,/personal_sign/);
  assert.match(code,/evoInboxUnlock/);
  assert.match(code,/No mueve fondos/);
  assert.doesNotMatch(code,/from\(['"]evo_passport_transfers/);
});

test('Transfer Inbox backend verifies wallet, origin and short expiry',()=>{
  const code=edge();
  assert.match(code,/action===\"inbox\"/);
  assert.match(code,/origin_mismatch/);
  assert.match(code,/verifyMessage/);
  assert.match(code,/ttl>5\*60_000/);
  assert.match(code,/\.eq\(\"to_wallet\",wallet\)\.eq\(\"status\",\"PENDING\"\)/);
});

test('V2.6.1 loader pins compact inbox assets',()=>{
  const code=loader();
  assert.match(code,/transfer-inbox\.css\?v=20260821-v261-compact/);
  assert.match(code,/transfer-inbox\.js\?v=20260821-v261-compact/);
});
