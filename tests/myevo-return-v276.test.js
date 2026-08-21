'use strict';

const fs=require('fs');
const assert=require('assert');
const nav=fs.readFileSync('v1/myevo-return-v276.js','utf8');
const i18n=fs.readFileSync('v1/i18n-v275.js','utf8');

assert(nav.includes("url.hash='myEvo'"),'Return control must always target My EVO');
assert(nav.includes("url.search=''"),'Return from public Passport must remove seal/query state');
assert(nav.includes("document.getElementById('evoBackTop')?.remove()"),'V2.7.6 must remove the legacy control');
assert(nav.includes('new MutationObserver'),'V2.7.6 must guard against cached loaders recreating the legacy control');
assert(nav.includes("button.id='evoMyEvoReturn'"),'V2.7.6 must use a distinct immutable control id');
assert(nav.includes("dataset.evoNavVersion='276'"),'V2.7.6 must expose its installed version');
assert(i18n.includes('myevo-return-v276.js?v=20260821-v276-fixed'),'The active language layer must load V2.7.6 navigation');
assert(i18n.includes("window.evoSetLanguage==='function'"),'Language selection must apply immediately through the core engine');
assert(i18n.includes("url.searchParams.set('lang',lang)"),'Chosen language must persist in URL');

console.log('EVO V2.7.6 My EVO return and language checks passed');
