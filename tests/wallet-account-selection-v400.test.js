'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const connector=fs.readFileSync(path.join(__dirname,'..','v1','wallet-autoconnect.js'),'utf8');
const session=fs.readFileSync(path.join(__dirname,'..','v1','wallet-session-v277.js'),'utf8');

assert.match(connector,/function chooseAccount\(entry,accounts\)/,'explicit connect must choose an account inside a multi-account provider');
assert.match(connector,/MetaMask autorizó más de una cuenta/,'multi-account ambiguity must be visible to the user');
assert.match(connector,/explicitPreferenceKey='evo-wallet-explicit-v400'/,'connector must keep explicit account choice separate from generic preference state');
assert.match(connector,/rememberExplicitPreference\(entry,normalized\)/,'explicit account choice may be remembered for the next chooser');
assert.match(connector,/wallet_revokePermissions/,'re-selecting an already connected account must be able to revoke stale account permission');
assert.match(connector,/requestAccounts\(selected\.provider,\{forceReselect\}\)/,'explicit re-selection must request a fresh provider account decision');
assert.match(connector,/eth_requestAccounts/,'wallet access must happen only after explicit user connect/re-select action');
assert.match(connector,/evoConnectWallet\(\{forceReselect:connected\}\)/,'the connected-wallet button must enter account re-selection instead of silently reusing the old account');
assert.doesNotMatch(connector,/accounts\?\.\[0\]/,'connector must never select the first account implicitly');

assert.match(session,/Explicit wallet connection policy/,'startup policy must explicitly require user wallet action');
assert.match(session,/button\.textContent='Conectar wallet'/,'every fresh page load must show Conectar wallet');
assert.match(session,/disconnectForStartup\(\)/,'startup must clear any in-memory wallet state');
assert.match(session,/evoRestoreWalletSession=async\(\)=>\{\s*disconnectForStartup\(\);\s*return false;/s,'legacy restore API must fail closed instead of reconnecting');
assert.doesNotMatch(session,/eth_accounts/,'startup/session module must never read injected wallet accounts automatically');
assert.doesNotMatch(session,/eth_requestAccounts/,'startup/session module must never request wallet accounts automatically');
assert.doesNotMatch(session,/SESSION_RESTORE/,'silent session restoration must remain disabled');
assert.doesNotMatch(session,/\brestore\(\);/,'startup must never call a restore routine automatically');

console.log('EVO V4 explicit wallet connection on every load regression checks passed');
