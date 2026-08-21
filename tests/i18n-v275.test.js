'use strict';

const fs=require('fs');
const assert=require('assert');
const source=fs.readFileSync('v1/i18n-v275.js','utf8');
const index=fs.readFileSync('v1/index.html','utf8');

assert(source.includes("event.stopImmediatePropagation()"),'Language switch must override the old in-place listener');
assert(source.includes("url.searchParams.set('lang',lang)"),'Language choice must be encoded in the URL');
assert(source.includes("url.searchParams.set('v','20260821-v276')"),'Language switch must force a fresh versioned reload');
assert(source.includes('location.assign(url.toString())'),'Language switch must reload the same view deterministically');
assert(index.includes('class="notranslate" translate="no"'),'EVO must opt out of browser auto-translation conflicts');
assert(index.includes('meta name="google" content="notranslate"'),'EVO must advertise its own translation control');
assert(index.includes('i18n-v275.js?v=20260821-v277-global'),'Index must directly load the language controller with the V2.7.7 cache key');
assert(index.includes('myevo-nav-v277.js?v=20260821-v277-nav'),'V2.7.7 must load My EVO navigation independently from i18n');

console.log('EVO V2.7.7 language and My EVO loader checks passed');
