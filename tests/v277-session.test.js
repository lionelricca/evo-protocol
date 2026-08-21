'use strict';

const fs=require('fs');
const assert=require('assert');
const session=fs.readFileSync('v1/wallet-session-v277.js','utf8');
const nav=fs.readFileSync('v1/myevo-nav-v277.js','utf8');
const index=fs.readFileSync('v1/index.html','utf8');

assert(session.includes("method:'eth_accounts'"),'Session restore must use eth_accounts without requesting permissions');
assert(!session.includes('eth_requestAccounts'),'Silent restore must never open the wallet permission prompt');
assert(!session.includes('wallet_requestPermissions'),'Silent restore must never request permissions');
assert(session.includes("source:'SESSION_RESTORE'"),'Restored sessions must be identifiable');
assert(session.includes("window.dispatchEvent(new CustomEvent('evo:wallet-connected'"),'Restored session must wake My EVO');
assert(nav.includes("document.querySelector('nav .brand')"),'EVO logo must be bound as My EVO home control');
assert(nav.includes("url.hash='myEvo'"),'Logo and floating control must target My EVO');
assert(nav.includes("url.search=''"),'Returning from Passport must remove seal query state');
assert(nav.includes("document.getElementById('evoBackTop')?.remove()"),'Legacy Passport/Inicio button must be removed');
assert(index.includes('wallet-session-v277.js?v=20260821-v277-session'),'Index must load session restore with a fresh immutable URL');
assert(index.includes('myevo-nav-v277.js?v=20260821-v277-nav'),'Index must load My EVO navigation with a fresh immutable URL');
assert(!index.includes('<script src="./back-to-top.js'),'Index must not directly load the legacy navigation script');

console.log('EVO V2.7.7 session restore and My EVO navigation checks passed');
