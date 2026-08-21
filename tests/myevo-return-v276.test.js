'use strict';

const fs=require('fs');
const assert=require('assert');
const nav=fs.readFileSync('v1/myevo-return-v276.js','utf8');
const i18n=fs.readFileSync('v1/i18n-v275.js','utf8');
const loader=fs.readFileSync('v1/organization-simple.js','utf8');

assert(nav.includes("url.hash='myEvo'"),'Return control must always target My EVO');
assert(nav.includes("url.search=''"),'Return from public Passport must remove seal/query state');
assert(nav.includes("document.getElementById('evoBackTop')?.remove()"),'Fixed navigation must remove the legacy control');
assert(nav.includes('new MutationObserver'),'Fixed navigation must guard against cached loaders recreating the legacy control');
assert(nav.includes("button.id='evoMyEvoReturn'"),'Fixed navigation must use a distinct immutable control id');
assert(nav.includes("document.querySelector('nav .brand')"),'EVO brand/logo must be bound to My EVO navigation');
assert(nav.includes('event.preventDefault()'),'Logo click must override the old #top anchor behavior');
assert(nav.includes('goMyEvo();'),'Logo and floating control must use the same My EVO destination');
assert(!loader.includes('loadBackToTop'),'Organization loader must not inject legacy back-to-top navigation');
assert(!loader.includes("back-to-top.js?v=20260821-v271"),'Legacy V2.7.1 navigation must be removed from the loader');
assert(i18n.includes('myevo-return-v276.js'),'The active language layer must load fixed My EVO navigation');
assert(i18n.includes("window.evoSetLanguage==='function'"),'Language selection must apply immediately through the core engine');
assert(i18n.includes("url.searchParams.set('lang',lang)"),'Chosen language must persist in URL');

console.log('EVO My EVO return, logo navigation and language checks passed');
