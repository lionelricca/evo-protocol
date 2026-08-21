'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const test=require('node:test');

const source=()=>fs.readFileSync('v1/dashboard.js','utf8');
const loader=()=>fs.readFileSync('v1/organization-simple.js','utf8');

test('My EVO derives data from existing public EVO records',()=>{
  const code=source();
  assert.match(code,/evo_seals/);
  assert.match(code,/evo_passport_events/);
  assert.match(code,/event_type:'eq\.TRANSFERRED'/);
  assert.match(code,/ownerFor/);
});

test('My EVO stays read-only and does not expose pending transfer storage',()=>{
  const code=source();
  assert.doesNotMatch(code,/personal_sign/);
  assert.doesNotMatch(code,/eth_sendTransaction/);
  assert.doesNotMatch(code,/wallet_sendCalls/);
  assert.doesNotMatch(code,/evo_passport_transfers/);
  assert.doesNotMatch(code,/EVO_MERCHANT_WALLET/);
});

test('My EVO follows wallet connection lifecycle',()=>{
  const code=source();
  assert.match(code,/evo:wallet-connected/);
  assert.match(code,/evo:wallet-disconnected/);
  assert.match(code,/evo:entitlement-updated/);
});

test('V2.5 loader pins dashboard assets',()=>{
  const code=loader();
  assert.match(code,/dashboard\.css\?v=20260821-v25-my-evo/);
  assert.match(code,/dashboard\.js\?v=20260821-v25-my-evo/);
});
