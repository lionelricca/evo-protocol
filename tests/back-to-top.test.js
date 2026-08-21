'use strict';

const fs=require('fs');
const assert=require('assert');
const source=fs.readFileSync('v1/back-to-top.js','utf8');
const index=fs.readFileSync('v1/index.html','utf8');

assert(source.includes("url.hash='myEvo'"),'All return navigation must target My EVO');
assert(source.includes("url.searchParams.set('v','20260821-v275')"),'My EVO return must use a fresh route version');
assert(source.includes("new URLSearchParams(location.search).has('seal')"),'Passport URLs must be recognized before returning to My EVO');
assert(source.includes("staleButton.remove()"),'New navigation must remove stale cached controls before installing itself');
assert(source.includes("dataset.evoNavVersion='275'"),'New controls must expose navigation version 275');
assert(source.includes("textContent=t('Mi EVO','My EVO')"),'Floating control must identify My EVO');
assert(source.includes('location.assign(myEvoUrl())'),'Non-dashboard views must navigate to My EVO, not merely scroll');
assert(index.includes('back-to-top.js?v=20260821-v275-myevo'),'Index must directly request the V2.7.5 My EVO navigation script');

console.log('EVO V2.7.5 My EVO return checks passed');
