'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const critical=fs.readFileSync(path.join(__dirname,'..','v1','i18n-critical-v410.js'),'utf8');
const session=fs.readFileSync(path.join(__dirname,'..','v1','wallet-session-v277.js'),'utf8');
const index=fs.readFileSync(path.join(__dirname,'..','v1','index.html'),'utf8');

assert.match(critical,/1 por usuario elegible/,'Free Proof copy must use eligible-user language');
assert.match(critical,/1 per eligible user/,'English Free Proof copy must use eligible-user language');
assert.match(critical,/EXACT FILE MATCH/,'exact document match must have English critical copy');
assert.match(critical,/WALLET CONTROL CONFIRMED/,'wallet-control authority wording must have English critical copy');
assert.match(critical,/DOCUMENT HISTORY/,'document history wording must have English critical copy');
assert.match(critical,/The file is not sent to the server/,'privacy copy must be available in English');
assert.match(index,/data-evo-i18n-critical-v410="1"/,'critical bilingual copy must load directly on the default V4.1 surface');
assert.match(session,/i18n-critical-v410\.js/,'wallet session must retain the V4.1 critical-copy fallback');
assert.match(critical,/\['1 per wallet',\{es:'1 por usuario elegible',en:'1 per eligible user'\}\]/,'obsolete English per-wallet copy may survive only as an input normalized to the eligible-user rule');

console.log('EVO V4.1 critical ES/EN copy checks passed');
