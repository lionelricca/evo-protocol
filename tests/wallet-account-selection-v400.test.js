'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const connector=fs.readFileSync(path.join(__dirname,'..','v1','wallet-autoconnect.js'),'utf8');
const session=fs.readFileSync(path.join(__dirname,'..','v1','wallet-session-v277.js'),'utf8');

assert.match(connector,/function chooseAccount\(entry,accounts\)/,'explicit connect must choose an account inside a multi-account provider');
assert.match(connector,/MetaMask autorizó más de una cuenta/,'multi-account ambiguity must be visible to the user');
assert.match(connector,/rememberPreference\(entry,normalized\)/,'explicit account choice must become the EVO preference');
assert.match(connector,/accounts=await requestAccounts\(selected\.provider\),chosen=await chooseAccount\(selected,accounts\)/,'provider connection must not silently consume accounts[0]');
assert.doesNotMatch(connector,/const selected=await chooseWallet\(wallets\),accounts=await requestAccounts\(selected\.provider\),a=accounts\?\.\[0\]/,'legacy first-account selection must stay removed');

assert.match(session,/const silentCandidate=\(accounts,pref\)=>/,'silent restore must resolve the preferred account explicitly');
assert.match(session,/if\(preferred&&valid\.includes\(preferred\)\)return preferred/,'silent restore must prefer the last explicitly selected EVO account');
assert.match(session,/return valid\.length===1\?valid\[0\]:null/,'silent restore must fail closed when multiple accounts are authorized without a preference');
assert.doesNotMatch(session,/accounts\.find\(value=>walletRe\.test/,'silent restore must not silently choose the first authorized account');

console.log('EVO V4 multi-account selection regression checks passed');
