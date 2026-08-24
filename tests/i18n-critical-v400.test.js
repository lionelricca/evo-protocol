'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const i18n=fs.readFileSync(path.join(__dirname,'..','v1','i18n-critical-v400.js'),'utf8');
const session=fs.readFileSync(path.join(__dirname,'..','v1','wallet-session-v277.js'),'utf8');

assert.match(i18n,/1 por usuario elegible/,'Free Proof copy must use eligible-user language');
assert.match(i18n,/1 per eligible user/,'English Free Proof copy must use eligible-user language');
assert.match(i18n,/EXACT FILE MATCH/,'exact document match must have English critical copy');
assert.match(i18n,/WALLET CONTROL CONFIRMED/,'wallet-control authority wording must have English critical copy');
assert.match(i18n,/DOCUMENT HISTORY/,'document history wording must have English critical copy');
assert.match(i18n,/The file is not sent to the server/,'privacy copy must be available in English');
assert.match(session,/i18n-critical-v400\.js/,'critical bilingual audit must load on the default RC surface');
assert.doesNotMatch(i18n,/1 per wallet/,'V4 critical copy must not restore the obsolete one-free-proof-per-wallet claim');

console.log('EVO V4 critical ES/EN copy checks passed');
