'use strict';
const assert=require('assert');
const crypto=require('crypto');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'v1/index.html'),'utf8');
const bootstrap=fs.readFileSync(path.join(root,'v1/security-bootstrap-v331.js'),'utf8');
const vendorPath=path.join(root,'v1/vendor/qrcode.min.js');
const licensePath=path.join(root,'v1/vendor/qrcode.LICENSE.txt');
const vendor=fs.readFileSync(vendorPath);
const license=fs.readFileSync(licensePath,'utf8');

assert(index.includes('./vendor/qrcode.min.js?v=06c7a5e134f116402699f03cda5819e10a0e5787'),'browser must load the reviewed local QR runtime');
assert(!index.includes('cdn.jsdelivr.net'),'main browser entrypoint must not depend on jsDelivr');
const csp=(index.match(/Content-Security-Policy\" content=\"([^\"]+)/)||[])[1]||'';
assert(csp.includes("script-src 'self' https://sdk.depay.com"),'CSP script source must keep only self plus the still-required DePay runtime');
assert(!csp.includes('cdn.jsdelivr.net'),'CSP must not allow the retired QR CDN');
assert(bootstrap.includes("'qrcode.min.js'"),'Browser Shield must treat local QRCode.js as critical');
assert(!bootstrap.includes("'cdn.jsdelivr.net'"),'Browser Shield must not trust the retired QR CDN host');

const gitBlob=crypto.createHash('sha1')
  .update(Buffer.from(`blob ${vendor.length}\0`))
  .update(vendor)
  .digest('hex');
assert.equal(gitBlob,'993e88f396640f881b69f98db7a4d17401ef83ca','vendored QRCode.js must remain byte-identical to reviewed upstream commit 06c7a5e134f116402699f03cda5819e10a0e5787');
assert(license.includes('The MIT License (MIT)'),'vendored QR dependency must retain its MIT license notice');
assert(license.includes('Copyright (c) 2012 davidshimjs'),'vendored QR dependency must retain upstream copyright');

console.log('EVO V3.3.5 local QR supply-chain checks passed');
