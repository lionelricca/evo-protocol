'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const dashboard=fs.readFileSync(path.join(__dirname,'..','v1','dashboard.js'),'utf8');

assert.match(dashboard,/let loadGeneration=0;/,'dashboard must version concurrent wallet loads');
assert.match(dashboard,/const switchingWallet=Boolean\(currentWallet&&currentWallet!==normalized\);/,'wallet changes must bypass the ordinary in-flight load guard');
assert.match(dashboard,/const generation=\+\+loadGeneration;/,'each dashboard load must receive a generation token');
assert.match(dashboard,/generation!==loadGeneration\|\|currentWallet!==normalized/,'stale wallet responses must never render over the active wallet');
assert.match(dashboard,/if\(generation===loadGeneration\)loading=false;/,'an old request must not clear the loading state of a newer wallet request');
assert.match(dashboard,/evo:wallet-disconnected[^\n]+loadGeneration\+\+;currentWallet='';loading=false;/,'disconnect must invalidate every in-flight dashboard request');

console.log('My EVO wallet-switch race regression checks passed');
