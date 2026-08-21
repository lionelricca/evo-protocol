'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

test('public asset UI exposes the expected customer-facing sections', () => {
  const source = fs.readFileSync('v1/public-asset.js', 'utf8');
  for (const expected of ['Identidad del activo','Confianza del emisor','Historial verificable','Compartir Passport','Ver registro técnico']) {
    assert.match(source, new RegExp(expected));
  }
});

test('public asset UI calculates owner from accepted passport history', () => {
  const source = fs.readFileSync('v1/public-asset.js', 'utf8');
  assert.match(source, /currentOwnerFrom\(seal,events\)/);
});
