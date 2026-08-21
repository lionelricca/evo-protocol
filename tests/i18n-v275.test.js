'use strict';

const fs=require('fs');
const assert=require('assert');
const source=fs.readFileSync('v1/i18n-v275.js','utf8');
const index=fs.readFileSync('v1/index.html','utf8');

assert(source.includes("event.stopImmediatePropagation()"),'Language switch must override the old in-place listener');
assert(source.includes("url.searchParams.set('lang',lang)"),'Language choice must be encoded in the URL');
assert(source.includes("url.searchParams.set('v','20260821-v275')"),'Language switch must force a fresh versioned reload');
assert(source.includes('location.assign(url.toString())'),'Language switch must reload the same view deterministically');
assert(index.includes('class="notranslate" translate="no"'),'EVO must opt out of browser auto-translation conflicts');
assert(index.includes('meta name="google" content="notranslate"'),'EVO must advertise its own translation control');
assert(index.includes('i18n-v275.js?v=20260821-v275-global'),'Index must directly load the V2.7.5 language controller');

console.log('EVO V2.7.5 language switching checks passed');
