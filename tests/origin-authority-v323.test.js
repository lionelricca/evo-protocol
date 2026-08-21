'use strict';

const fs=require('fs');
const assert=require('assert');

const authority=fs.readFileSync('v1/origin-authority-v323.js','utf8');
const css=fs.readFileSync('v1/origin-authority-v323.css','utf8');
const proof=fs.readFileSync('v1/document-proof-v30.js','utf8');

assert(authority.includes("organization?.status==='ACTIVE'&&organization?.legal_name"),'Organization Verified must require an active organization record with legal name');
assert(authority.includes("else if(domain?.status==='ACTIVE'&&domain?.domain)level='DOMAIN_VERIFIED'"),'Domain proof must remain a separate trust level');
assert(authority.includes("level='WALLET_PROVEN'"),'Wallet control must remain a separate trust level');
assert(authority.includes("level='SELF_DECLARED'"),'Unverified issuer names must remain self-declared');
assert(authority.includes('NOMBRE DECLARADO'),'Spanish public UI must label unverified names as declared');
assert(authority.includes('DECLARED NAME'),'English public UI must label unverified names as declared');
assert(authority.includes("issuer.readOnly=true;issuer.value=authority.organization.legal_name"),'Verified legal name must auto-lock the Document Proof issuer field');
assert(authority.includes('El nombre escrito sigue siendo una etiqueta pública.'),'Domain verification must not be presented as legal-company-name verification');
assert(authority.includes('no una identidad organizacional verificada'),'Wallet proof must not be presented as organization verification');
assert(authority.includes("seal.issuer_label||short(seal.issuer_wallet)"),'Self-declared names may be displayed only in the declared-name state');
assert(css.includes('.originAuthorityBanner.is-organization-verified'),'Organization verified state must be visually distinct');
assert(css.includes('.originAuthorityBanner.is-self-declared'),'Self-declared state must be visually distinct');
assert(proof.includes('origin-authority-v323.js?v=20260821-v323-origin-authority'),'Document Proof loader must load the V3.2.3 authority script');
assert(proof.includes('origin-authority-v323.css?v=20260821-v323-origin-authority'),'Document Proof loader must load the V3.2.3 authority styles');

console.log('EVO V3.2.3 Origin issuer authority checks passed');
