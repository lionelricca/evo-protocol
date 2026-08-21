'use strict';

const fs=require('fs');
const assert=require('assert');
const source=fs.readFileSync('v1/back-to-top.js','utf8');
const loader=fs.readFileSync('v1/organization-simple.js','utf8');

assert(source.includes("window.scrollTo({top:0"),'Back-to-top must scroll to the page start');
assert(source.includes('window.scrollY>560'),'Floating control must stay hidden near the top');
assert(source.includes("className='evoFooterTop'"),'Footer must expose a back-to-top action');
assert(source.includes("prefers-reduced-motion: reduce"),'Navigation must respect reduced motion');
assert(!source.includes('location.href='),'Back-to-top must not replace Passport or query URLs');
assert(loader.includes('back-to-top.js?v=20260821-v271'),'Loader must use the versioned navigation script');
assert(loader.includes('back-to-top.css?v=20260821-v271'),'Loader must use the versioned navigation styles');

console.log('EVO V2.7.1 back-to-top checks passed');
