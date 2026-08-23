'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const test=require('node:test');

const source=()=>fs.readFileSync('v1/dashboard-v253.js','utf8');
const loader=()=>fs.readFileSync('v1/organization-simple.js','utf8');

test('V2.5.3 adds searchable asset library without wallet writes',()=>{
  const code=source();
  assert.match(code,/myEvoSearchInput/);
  assert.match(code,/Buscar activo, serie o EVO ID/);
  assert.match(code,/myEvoAssetIcon/);
  assert.match(code,/is-received/);
  assert.match(code,/is-transferred/);
  assert.doesNotMatch(code,/personal_sign/);
  assert.doesNotMatch(code,/eth_sendTransaction/);
  assert.doesNotMatch(code,/evo_passport_transfers/);
});

test('V2.7 loader keeps premium dashboard assets on the current chain',()=>{
  const code=loader();
  assert.match(code,/dashboard-v253\.css\?v=20260821-v253-premium/);
  assert.match(code,/dashboard-v253\.js\?v=20260821-v27-actions-loader/);
});
