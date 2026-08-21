'use strict';

const fs=require('fs');
const assert=require('assert');

const source=fs.readFileSync('v1/dashboard-v27.js','utf8');
const loader=fs.readFileSync('v1/dashboard-v253.js','utf8');

assert(source.includes("className='btn myEvoManageAsset'"),'V2.7 must add a Manage action to owned assets');
assert(source.includes("document.getElementById('passportSealId')"),'Manage must preload the existing Passport ID field');
assert(source.includes("document.getElementById('passportLoadBtn')"),'Manage must reuse the existing Passport loader');
assert(source.includes("document.getElementById('passportType')"),'V2.7 must expose the existing event workflow');
assert(source.includes("document.getElementById('transferToWallet')"),'V2.7 must expose the existing transfer workflow');
assert(source.includes("classList.contains('is-transferred')"),'Transferred-away assets must not receive owner management actions');
assert(!source.includes('personal_sign'),'Dashboard quick actions must not sign automatically');
assert(!source.includes('eth_sendTransaction'),'Dashboard quick actions must not send transactions');
assert(loader.includes('dashboard-v27.js?v=20260821-v27-actions'),'V2.5.3 must load the V2.7 enhancer with a versioned asset');
assert(loader.includes('dashboard-v27.css?v=20260821-v27-actions'),'V2.5.3 must load the V2.7 styles with a versioned asset');

console.log('EVO V2.7 dashboard quick action checks passed');
