'use strict';
const assert=require('assert');
const fs=require('fs');

const edge=fs.readFileSync('supabase/functions/evo-checkout/index.ts','utf8');
const ui=fs.readFileSync('v1/checkout.js','utf8');
const app=fs.readFileSync('v1/app.js','utf8');

assert(edge.includes('npm:viem@2.21.54'),'exact-balance proof must use pinned signature verification');
assert(edge.includes('EVO CHECKOUT BALANCE V1'),'balance read must have a domain-specific signature message');
assert(edge.includes('BALANCE_SIGNATURE_MAX_AGE_MS = 2 * 60 * 1000'),'balance signatures must expire quickly');
assert(edge.includes('requestOrigin && requestOrigin !== origin'),'signed browser origin must match the request origin when present');
assert(edge.includes('privacy: "SIGNED_PRIVATE_BALANCE"'),'exact balance must be explicitly marked private/signed');
assert(edge.includes('proof: "EIP191_PERSONAL_SIGN"'),'exact balance response must declare the wallet-proof mechanism');

const publicStart=edge.indexOf('if (body.action === "status")');
const privateStart=edge.indexOf('if (body.action === "balance")');
const verifyStart=edge.indexOf('if (body.action !== "verify")');
assert(publicStart>=0&&privateStart>publicStart&&verifyStart>privateStart,'checkout actions must have public summary, signed balance and verify paths');
const publicBlock=edge.slice(publicStart,privateStart);
const verifyBlock=edge.slice(verifyStart);
assert(publicBlock.includes('privacy: "PUBLIC_SUMMARY"'),'public wallet lookup must be clearly redacted');
assert(publicBlock.includes('balanceRedacted: true'),'public summary must declare redaction');
assert(publicBlock.includes('exactBalanceRequiresWalletSignature: true'),'public summary must direct exact reads to wallet proof');
assert(publicBlock.includes('canCreate:'),'public summary may expose only a capability decision needed by Seal UX');
assert(!publicBlock.includes('purchasedCredits:'),'public summary must not disclose purchased-credit count');
assert(!publicBlock.includes('consumedCredits:'),'public summary must not disclose consumed-credit count');
assert(!publicBlock.includes('remainingCredits:'),'public summary must not disclose or approximate remaining-credit count');
assert(!verifyBlock.includes('purchasedCredits:'),'public payment verification must not disclose purchased-credit count');
assert(!verifyBlock.includes('consumedCredits:'),'public payment verification must not disclose consumed-credit count');
assert(!verifyBlock.includes('remainingCredits:'),'public payment verification must not disclose exact remaining-credit count');
assert(verifyBlock.includes('balancePrivate: true'),'payment verification must tell clients exact balance is private');

assert(ui.includes("body:JSON.stringify({ action:'status', wallet:normalizedWallet })"),'wallet connect must use redacted public status');
assert(ui.includes("action:'balance'"),'exact balance must use a separate signed action');
assert(ui.includes("method:'personal_sign'"),'browser must request explicit wallet proof before exact balance');
assert(ui.includes('proofRevealBalanceBtn'),'exact balance must be an explicit user action, not an automatic connect-time disclosure');
assert(ui.includes("privacy !== 'SIGNED_PRIVATE_BALANCE'"),'private-balance UI state must be distinct from public summary');
assert(ui.includes("'RESUMEN PÚBLICO', 'PUBLIC SUMMARY'"),'connected-wallet default UI must be public/redacted');
assert(ui.includes("'SALDO PRIVADO VERIFICADO', 'VERIFIED PRIVATE BALANCE'"),'signed exact read must be visibly distinguished');
assert(!ui.includes('EVO_CREDIT_BALANCE_KEY'),'exact balance must not be persisted in browser localStorage');
assert(!ui.includes('proofQuantity(result.remainingCredits)'),'payment verification result must not rely on exact balance disclosure');

assert(app.includes('!entitlement.canCreate'),'Seal creation must rely on a redacted capability decision, not an exact balance');
assert(!app.includes('Number(entitlement.remainingCredits'),'Seal UX must not depend on exact remaining-credit data');

console.log('EVO V3.3.17 Checkout Privacy Shield checks passed');