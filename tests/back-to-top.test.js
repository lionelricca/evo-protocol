'use strict';

const fs=require('fs');
const assert=require('assert');
const source=fs.readFileSync('v1/myevo-nav-v277.js','utf8');
const index=fs.readFileSync('v1/index.html','utf8');

assert(source.includes("url.hash='myEvo'"),'All return navigation must target My EVO');
assert(source.includes("url.searchParams.set('v','20260821-v277')"),'My EVO return must use the V2.7.7 route version');
assert(source.includes("document.querySelector('nav .brand')"),'EVO logo must act as My EVO home navigation');
assert(source.includes("document.getElementById('evoBackTop')?.remove()"),'New navigation must remove stale legacy controls');
assert(source.includes("button.id='evoMyEvoHome'"),'V2.7.7 must expose one dedicated My EVO control');
assert(source.includes("button.querySelector('b').textContent=t('Mi EVO','My EVO')"),'Floating control must identify My EVO');
assert(source.includes('location.assign(destination())'),'Non-dashboard views must navigate to My EVO, not merely scroll');
assert(index.includes('myevo-nav-v277.js?v=20260821-v277-nav'),'Index must directly request the V2.7.7 My EVO navigation script');
assert(!index.includes('<script src="./back-to-top.js'),'Legacy navigation must no longer be directly loaded from index');

console.log('EVO V2.7.7 My EVO home navigation checks passed');
