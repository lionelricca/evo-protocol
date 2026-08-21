'use strict';
const fs=require('fs');
const assert=require('assert');
const source=fs.readFileSync('v1/public-asset-v241.js','utf8');
const css=fs.readFileSync('v1/public-asset-v241.css','utf8');

assert(source.includes("'WALLET PROVEN':'CONTROL CONFIRMADO'"),'Public Passport should explain wallet proof as confirmed control');
assert(source.includes("t('WALLET PROPIETARIA','OWNER WALLET')"),'Wallet-only ownership must be labeled as a wallet, not a named owner');
assert(source.includes("count===1?'EVENTO':'EVENTOS'"),'Spanish event count must preserve singular/plural');
assert(!source.includes("'WALLET PROVEN':'WALLET VERIFICADA'"),'Legacy technical wallet wording should be removed');
assert(css.includes('grid-template-columns:minmax(0,1.55fr) minmax(245px,300px)'),'Public Passport hero should use the compact layout');
console.log('EVO V2.4.2 public Passport precision checks passed');
