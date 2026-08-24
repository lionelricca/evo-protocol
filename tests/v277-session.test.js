'use strict';

const fs=require('fs');
const assert=require('assert');
const session=fs.readFileSync('v1/wallet-session-v277.js','utf8');
const nav=fs.readFileSync('v1/myevo-nav-v277.js','utf8');
const index=fs.readFileSync('v1/index.html','utf8');

assert(!session.includes("method:'eth_accounts'"),'Page load must never inspect authorized wallet accounts automatically');
assert(!session.includes('eth_requestAccounts'),'Page load must never open the wallet permission prompt');
assert(!session.includes('wallet_requestPermissions'),'Page load must never request wallet permissions');
assert(!session.includes("source:'SESSION_RESTORE'"),'Silent wallet restoration must remain disabled');
assert(session.includes("button.textContent='Conectar wallet'"),'Every fresh load must present Conectar wallet');
assert(session.includes('disconnectForStartup()'),'Startup must clear any in-memory wallet state');
assert(session.includes('window.evoRestoreWalletSession=async()=>'),'Compatibility restore API may exist but must fail closed');
assert(session.includes('return false;'),'Compatibility restore API must not activate a wallet');
assert(nav.includes("document.querySelector('nav .brand')"),'EVO logo must be bound as My EVO home control');
assert(nav.includes("url.hash='myEvo'"),'Logo and floating control must target My EVO');
assert(nav.includes("url.search=''"),'Returning from Passport must remove seal query state');
assert(nav.includes("document.getElementById('evoBackTop')?.remove()"),'Legacy Passport/Inicio button must be removed');
assert(index.includes('wallet-session-v277.js?v=20260824-v410-session'),'Index must load the explicit-connect session policy module with the current V4.1 cache key');
assert(index.includes('myevo-nav-v277.js?v=20260821-v277-nav'),'Index must load My EVO navigation with a fresh immutable URL');
assert(!index.includes('<script src="./back-to-top.js'),'Index must not directly load the legacy navigation script');

console.log('EVO V4.1 explicit wallet connection and My EVO navigation checks passed');
