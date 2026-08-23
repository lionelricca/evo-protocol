'use strict';

const fs=require('fs');
const assert=require('assert');
const source=fs.readFileSync('v1/i18n-v275.js','utf8');
const index=fs.readFileSync('v1/index.html','utf8');

assert(source.includes("event.stopImmediatePropagation()"),'Language switch must override the old in-place listener');
assert(source.includes("url.searchParams.set('lang',lang)"),'Language choice must be encoded in the URL');
assert(source.includes("url.searchParams.set('v','20260823-v400')"),'Language switch must force a fresh V4 release-candidate reload');
assert(source.includes('location.assign(url.toString())'),'Language switch must reload the same view deterministically');
assert(source.includes('ensureOriginDocumentModules'),'V4 language controller must activate the consolidated Origin document modules');
assert(index.includes('class="notranslate" translate="no"'),'EVO must opt out of browser auto-translation conflicts');
assert(index.includes('meta name="google" content="notranslate"'),'EVO must advertise its own translation control');
assert(index.includes('i18n-v275.js?v=20260823-v400-release-candidate'),'Index must directly load the V4-aware language controller cache key');
assert(index.includes('myevo-nav-v277.js?v=20260821-v277-nav'),'My EVO navigation remains independently loaded');

console.log('EVO V4.0 language, Origin loader and My EVO navigation checks passed');
