'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');
const html=read('index.html');
const css=read('root-launch.css');
const js=read('root-launch.js');

assert(!/<style(?:\s|>)/i.test(html),'root entrypoint must not contain inline style elements');
assert(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html),'root entrypoint must not contain inline scripts');
assert(!/\sstyle\s*=/i.test(html),'root entrypoint must not contain inline style attributes');
assert(!html.includes("'unsafe-inline'"),'root CSP must not permit unsafe-inline');
assert(html.includes("default-src 'self'"),'root CSP must fail closed to local resources');
assert(html.includes("base-uri 'none'"),'root CSP must block base tag rewriting');
assert(html.includes("object-src 'none'"),'root CSP must disable plugin/object content');
assert(html.includes("script-src 'self'"),'root scripts must be local only');
assert(html.includes("script-src-attr 'none'"),'root inline event handlers must be blocked');
assert(html.includes("style-src 'self'"),'root styles must be local only');
assert(html.includes("style-src-attr 'none'"),'root inline style attributes must be blocked');
assert(html.includes("connect-src 'none'"),'root page must not initiate network API connections');
assert(html.includes("frame-src 'none'"),'root page must not embed frames');
assert(html.includes('name="referrer" content="no-referrer"'),'root redirect page must not leak referrer data');
assert(html.includes('href="./root-launch.css?'),'root CSS must be a local file');
assert(html.includes('src="./root-launch.js?'),'root redirect script must be a local file');
assert(!/https?:\/\//i.test(html),'root entrypoint must not depend on remote runtime origins');
assert(!/@import\b/i.test(css),'root CSS must not import remote stylesheets');
assert(!/url\s*\(/i.test(css),'root CSS must not fetch secondary resources');
assert(!/https?:\/\//i.test(js),'root redirect script must not reference remote origins');
new vm.Script(js,{filename:'root-launch.js'});
assert(js.includes("location.replace('./v1/?v=20260821-v25')"),'root redirect must stay same-origin and target the current EVO app');

console.log('EVO V3.3.6 root entrypoint security checks passed');
