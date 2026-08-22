'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const read=(rel)=>fs.readFileSync(path.join(root,rel),'utf8');

const html=read('v1/index.html');
const css=read('v1/browser-shield-v332.css');
const guardianCss=read('v1/guardian.css');
const bootstrap=read('v1/security-bootstrap-v331.js');
const checkout=read('v1/checkout.js');
const guardian=read('v1/guardian.js');
const issuer=read('v1/issuer.js');
const wallet=read('v1/wallet-autoconnect.js');

assert(!/<style(?:\s|>)/i.test(html),'main entrypoint must not contain inline style elements');
assert(!/\sstyle\s*=/i.test(html),'main entrypoint must not contain inline style attributes');
assert(html.includes("style-src 'self'"),'CSP default style source must be local only');
assert(html.includes("style-src-elem 'self'"),'CSP must forbid inline <style> elements');
assert(html.includes("style-src-attr 'unsafe-inline'"),'style attributes remain an explicit temporary compatibility exception pending third-party widget verification');
assert(!html.includes("style-src 'self' 'unsafe-inline'"),'unsafe-inline must not remain on the broad style-src directive');
assert(html.includes('id="evoProofWalletStyle" rel="stylesheet" href="./browser-shield-v332.css'),'trusted local stylesheet must provide first-party dynamic UI presentation');
assert(html.indexOf('id="evoProofWalletStyle"') < html.indexOf('src="./checkout.js'),'trusted Browser Shield stylesheet must load before checkout executes');
assert(css.includes('.proofWalletCard'),'local shield stylesheet must contain proof-wallet styles');
assert(css.includes('#evoWalletPicker'),'local shield stylesheet must contain wallet-picker styles');
assert(css.includes('.issuerTrustGrid') && css.includes('.domainProofGrid'),'local shield stylesheet must contain Issuer/Domain styles');
assert(css.includes('.evoPriceValue') && css.includes('.evoPanelGap16') && css.includes('.evoDetailsForm'),'former inline HTML declarations must be represented by local classes');
assert(guardianCss.includes('.challengeClockBox'),'Guardian stylesheet must contain Challenge clock presentation');
assert(guardianCss.includes('.guardianProgress'),'Guardian stylesheet must contain meter presentation');
assert(bootstrap.includes("'browser-shield-v332.css'"),'browser shield stylesheet must be a critical local resource');
assert(bootstrap.includes('EVO-BROWSER-SHIELD-V3.3.3'),'browser shield must publish the current hardening version');
assert(bootstrap.includes('inlineStyleElementsAllowed: false'),'browser shield must declare inline style elements disabled');

for (const [name,source] of Object.entries({checkout,guardian,issuer,wallet})) {
  assert(!/createElement\(\s*['"]style['"]\s*\)/i.test(source),name+' must not create runtime <style> elements');
}
assert(!/\sstyle=/.test(guardian),'Guardian markup must not emit inline style attributes');
assert(guardian.includes('<progress class="guardianProgress riskProgress"'),'Guardian risk meter must use CSP-safe progress markup');
assert(guardian.includes('<progress class="guardianProgress confidenceProgress"'),'Guardian confidence meter must use CSP-safe progress markup');

const firstPartyScripts=fs.readdirSync(path.join(root,'v1'))
  .filter(name=>name.endsWith('.js'));
const inlineStyleCreators=firstPartyScripts.filter(name=>{
  const source=read(path.join('v1',name));
  return /createElement\(\s*['"]style['"]\s*\)/i.test(source);
}).sort();
assert.deepStrictEqual(inlineStyleCreators,[],'first-party scripts must not create runtime <style> elements: '+inlineStyleCreators.join(', '));

console.log('EVO V3.3.7 browser style/CSP checks passed; first-party runtime style creators: 0');
