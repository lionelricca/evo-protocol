'use strict';

const fs=require('fs');
const assert=require('assert');
const source=fs.readFileSync('v1/back-to-top.js','utf8');
const index=fs.readFileSync('v1/index.html','utf8');

assert(source.includes("hash==='#myevo'"),'Back-to-top must detect My EVO context');
assert(source.includes("document.getElementById('myEvo')"),'My EVO must be the dashboard return target');
assert(source.includes("document.getElementById('publicAssetPage')"),'Public Passport must have its own contextual return target');
assert(source.includes('window.scrollY-origin>threshold'),'Visibility must be measured from the contextual section start');
assert(source.includes("short:t('Mi EVO','My EVO')"),'Dashboard control must identify My EVO instead of generic page top');
assert(source.includes("prefers-reduced-motion: reduce"),'Navigation must respect reduced motion');
assert(!source.includes('location.href='),'Contextual navigation must not replace Passport or query URLs');
assert(index.includes('back-to-top.js?v=20260821-v272-context'),'Index must directly request the contextual navigation version');

console.log('EVO V2.7.2 contextual back-to-top checks passed');
