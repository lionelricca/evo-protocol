'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const connector=fs.readFileSync(path.join(__dirname,'..','v1','wallet-autoconnect.js'),'utf8');
const session=fs.readFileSync(path.join(__dirname,'..','v1','wallet-session-v277.js'),'utf8');

assert.match(connector,/function chooseAccount\(entry,accounts\)/,'explicit connect must choose an account inside a multi-account provider');
assert.match(connector,/MetaMask autorizó más de una cuenta/,'multi-account ambiguity must be visible to the user');
assert.match(connector,/explicitPreferenceKey='evo-wallet-explicit-v400'/,'connector must keep explicit account choice separate from generic restore state');
assert.match(connector,/rememberExplicitPreference\(entry,normalized\)/,'explicit account choice must become authoritative for startup');
assert.match(connector,/wallet_revokePermissions/,'re-selecting an already connected account must be able to revoke the stale account permission');
assert.match(connector,/requestAccounts\(selected\.provider,\{forceReselect\}\)/,'explicit re-selection must request a fresh provider account decision');
assert.match(connector,/eth_requestAccounts/,'fresh re-selection must reopen the wallet account chooser');
assert.match(connector,/evoConnectWallet\(\{forceReselect:connected\}\)/,'the connected-wallet button must enter account re-selection instead of silently reusing the old account');
assert.doesNotMatch(connector,/accounts\?\.\[0\]/,'connector must never select the first account implicitly');

assert.match(session,/explicitPreferenceKey='evo-wallet-explicit-v400'/,'silent restore must know the explicit account key');
assert.match(session,/const startupPreference=\(\)=>readExplicitPreference\(\)\|\|readPreference\(\)/,'explicit account choice must outrank generic restore state');
assert.match(session,/const silentCandidate=\(accounts,pref\)=>/,'silent restore must resolve the preferred account explicitly');
assert.match(session,/if\(preferred&&valid\.includes\(preferred\)\)return preferred/,'silent restore must prefer the last explicitly selected EVO account');
assert.match(session,/if\(preferred\)return null/,'silent restore must fail closed instead of falling back to another account');
assert.doesNotMatch(session,/accounts\.find\(value=>walletRe\.test/,'silent restore must not silently choose the first authorized account');

console.log('EVO V4 explicit wallet startup preference regression checks passed');
