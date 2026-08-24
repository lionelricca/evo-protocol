'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('rc/index.html','utf8');

assert.match(html,/http-equiv="refresh" content="0; url=\.\.\/v1\/"/i,'legacy RC route must immediately redirect to canonical /v1/');
assert.match(html,/<link rel="canonical" href="\.\.\/v1\/">/i,'legacy RC route must declare canonical /v1/');
assert.match(html,/script-src 'none'/i,'legacy RC route must not execute JavaScript');
assert.match(html,/connect-src 'none'/i,'legacy RC route must not make network requests');
assert.match(html,/frame-src 'none'/i,'legacy RC route must not embed remote frames');
assert.match(html,/form-action 'none'/i,'legacy RC route must not submit forms');
assert.doesNotMatch(html,/<script\b/i,'legacy RC route must not load runtime scripts');
assert.doesNotMatch(html,/walletBtn|checkout|supabase|sdk\.depay|1 por wallet|1 per wallet/i,'legacy RC route must not expose stale wallet/payment/product behavior');

console.log('EVO V4.0 retired RC surface checks passed');
