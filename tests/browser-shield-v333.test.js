'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');

const html=read('v1/index.html');
const css=read('v1/browser-shield-v332.css');
const bootstrap=read('v1/security-bootstrap-v331.js');
const checkout=read('v1/checkout.js');

assert(!/<style(?:\s|>)/i.test(html),'main entrypoint must not contain inline style elements');
assert(!/\sstyle\s*=/i.test(html),'main entrypoint must not contain inline style attributes');
assert(html.includes("style-src 'self'"),'CSP default style source must be local only');
assert(html.includes("style-src-elem 'self'"),'CSP must forbid inline <style> elements');
assert(html.includes("style-src-attr 'unsafe-inline'"),'style attributes remain an explicit temporary compatibility exception for runtime libraries');
assert(!html.includes("style-src 'self' 'unsafe-inline'"),'unsafe-inline must not remain on the broad style-src directive');
assert(html.includes('id="evoProofWalletStyle" rel="stylesheet" href="./browser-shield-v332.css'),'trusted local stylesheet must provide Proof Wallet presentation');
assert(html.indexOf('id="evoProofWalletStyle"') < html.indexOf('src="./checkout.js'),'trusted Proof Wallet stylesheet must load before checkout executes');
assert(css.includes('.proofWalletCard'),'local shield stylesheet must contain proof-wallet styles');
assert(css.includes('.evoPriceValue') && css.includes('.evoPanelGap16') && css.includes('.evoDetailsForm'),'former inline HTML declarations must be represented by local classes');
assert(bootstrap.includes("'browser-shield-v332.css'"),'browser shield stylesheet must be a critical local resource');
assert(bootstrap.includes('EVO-BROWSER-SHIELD-V3.3.3'),'browser shield must publish the current hardening version');
assert(bootstrap.includes('inlineStyleElementsAllowed: false'),'browser shield must declare inline style elements disabled');

assert(!checkout.includes("document.createElement('style')"),'checkout must not recreate the retired runtime style injector');
assert(!checkout.includes('document.createElement("style")'),'checkout must not recreate the retired runtime style injector');

const firstPartyScripts=fs.readdirSync(path.join(root,'v1'))
  .filter(name=>name.endsWith('.js'));
const inlineStyleCreators=firstPartyScripts.filter(name=>{
  const source=read(path.join('v1',name));
  return /createElement\(\s*['"]style['"]\s*\)/i.test(source);
});
assert.deepStrictEqual(inlineStyleCreators,[],'first-party browser scripts must not create runtime <style> elements: '+inlineStyleCreators.join(', '));

console.log('EVO V3.3.7 browser style/CSP checks passed');
