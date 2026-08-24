'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const index=read('v1/index.html');
const session=read('v1/wallet-session-v277.js');
const guard=read('v1/free-proof-antisybil-v400.js');
const critical=read('v1/i18n-critical-v410.js');
const i18n=read('v1/i18n-v275.js');
const documentProof=read('v1/document-proof-v30.js');

// Product truth must be correct before JavaScript patches or translations run.
assert.match(index,/1 por usuario elegible/,'Free Proof must be described as an eligible-user benefit in base HTML');
assert.doesNotMatch(index,/>\s*1 por wallet\s*</,'base commercial HTML must not claim one Free Proof per wallet');

// Origin is the commercial default: document must be the first asset-type option.
const documentOption=index.indexOf('<option value="Documento">Informe / documento</option>');
const productOption=index.indexOf('<option value="Producto">Equipo / producto</option>');
assert(documentOption>=0&&productOption>=0&&documentOption<productOption,'Document / EVO Origin must be the default first asset type');

// Critical copy should run immediately, not wait for the window load fallback.
const criticalDirect=index.indexOf('data-evo-i18n-critical-v410="1"');
const walletSession=index.indexOf('wallet-session-v277.js?v=20260824-v410-session');
assert(criticalDirect>=0&&walletSession>=0&&criticalDirect<walletSession,'critical V4.1 copy must load directly before wallet session fallback');
assert.match(session,/i18n-critical-v410\.js\?v=20260824-v410-critical-copy/,'wallet session must retain a V4.1 critical-copy fallback');

// Checkout defines the entitlement functions first; the anti-Sybil guard then wraps them deterministically.
const checkout=index.indexOf('./checkout.js?v=20260821-v22-proof-wallet');
const freeGuard=index.indexOf('data-evo-free-proof-v400="1"');
assert(checkout>=0&&freeGuard>=0&&checkout<freeGuard,'Free Proof anti-Sybil guard must load directly after checkout functions exist');
assert.match(session,/script\[data-evo-free-proof-v400\]/,'wallet session must keep the anti-Sybil loader as a fallback');
assert.match(guard,/const POLICY='V400_ANTISYBIL'/,'active Free Proof guard must use the V4 anti-Sybil policy');
assert.match(guard,/failClosed/,'anti-Sybil guard must fail closed when authority is unavailable');
assert.match(guard,/guardRequest\('reserve'/,'Free Proof creation must reserve eligibility server-side before registration');

// Dynamic legacy copy must be normalized too, including messages emitted after entitlement checks.
assert.match(critical,/MutationObserver/,'V4.1 critical copy must normalize dynamically inserted status and error messages');
assert.match(critical,/Crear mi Proof gratis/,'eligible action must be Proof-first, not Passport-first');
assert.match(critical,/Tu Free Proof ya no está disponible/,'ineligible state must avoid the obsolete per-wallet explanation');
assert.doesNotMatch(critical,/1 per wallet/,'V4.1 canonical critical copy must not expose the obsolete English per-wallet claim');

// Follow the real Origin activation chain, not just file existence.
assert.match(i18n,/ensureOriginDocumentModules/,'default surface must activate the consolidated document modules');
assert.match(i18n,/document-proof-v30\.js\?v=20260823-v400-origin/,'document proof runtime must be activated');
assert.match(i18n,/document-lifecycle-v30\.js\?v=20260823-v400-origin/,'document lifecycle runtime must be activated');
assert.match(i18n,/document-management-v30\.js\?v=20260823-v400-origin/,'document management runtime must be activated');
assert.match(documentProof,/origin-verifier-v322\.js\?v=20260821-v322-origin-verifier/,'exact-file Origin verifier must be activated from document proof');
assert.match(documentProof,/origin-authority-v323\.js\?v=20260821-v323-origin-authority/,'issuer-authority UI must be activated from document proof');

console.log('EVO V4.1 Origin surface integration checks passed');
