'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

test('public asset page is read-only and reuses public EVO evidence', () => {
  const source = fs.readFileSync('v1/public-asset.js', 'utf8');
  assert.match(source, /fetchSeal/);
  assert.match(source, /fetchPassportEvents/);
  assert.match(source, /currentOwnerFrom/);
  assert.match(source, /fetchIssuerProfile/);
  assert.match(source, /fetchDomainVerification/);
  assert.doesNotMatch(source, /personal_sign/);
  assert.doesNotMatch(source, /eth_sendTransaction/);
  assert.doesNotMatch(source, /evo-checkout/);
});

test('public QR mode hides commercial and owner controls', () => {
  const css = fs.readFileSync('v1/public-asset.css', 'utf8');
  assert.match(css, /evoPublicAssetMode/);
  assert.match(css, /#pricing/);
  assert.match(css, /#seal/);
  assert.match(css, /#passport/);
  assert.match(css, /#walletBtn/);
});

test('public asset page keeps physical-authenticity limitation explicit', () => {
  const source = fs.readFileSync('v1/public-asset.js', 'utf8');
  assert.match(source, /No certifica por sí solo la autenticidad física/);
});