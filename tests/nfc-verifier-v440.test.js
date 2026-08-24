'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const verifier = fs.readFileSync(path.join(ROOT, 'supabase/functions/evo-nfc-verifier/index.ts'), 'utf8');
const crypto = fs.readFileSync(path.join(ROOT, 'supabase/functions/_shared/evo-aes-cmac.mjs'), 'utf8');
const architecture = fs.readFileSync(path.join(ROOT, 'docs/NFC_ARCHITECTURE.md'), 'utf8');

assert.match(verifier, /EVO_NFC_PILOT_KEYS/, 'pilot keys must come from server environment, never request/public storage');
assert.match(verifier, /restrictedPreflight/, 'NFC browser integration must use restricted CORS');
assert.match(verifier, /rejectUntrustedBrowserOrigin/, 'untrusted browser origins must be rejected');
assert.doesNotMatch(verifier, /Access-Control-Allow-Origin[^\n]*\*/, 'NFC verifier must not introduce wildcard browser CORS');
assert.match(verifier, /NXP_AN12196_REV_2_0_VECTOR_VALIDATED/, 'runtime status must identify the validated NXP reference basis');
assert.match(verifier, /CRYPTO_MATCH_PENDING_REPLAY_AUTHORITY/, 'crypto-only success must remain below physical-grade authority');
assert.match(verifier, /nfcCryptoVerified:\s*false/, 'V4.4 must never emit NFC_CRYPTO_VERIFIED before replay authority and physical pilot');
assert.match(verifier, /expectedUid/, 'cryptographic UID must be bound to the enrolled tag profile');
assert.match(verifier, /macInputMode.*ZERO_LENGTH/s, 'pilot configuration must pin the reviewed SDM MAC input mode');
assert.match(verifier, /MAX_BODY_BYTES\s*=\s*16_384/, 'public verification input must remain bounded');

assert.match(crypto, /NIST SP 800-38B AES-CMAC/, 'CMAC implementation must state its standard basis');
assert.match(crypto, /0x3c, 0xc3, 0x00, 0x01, 0x00, 0x80/, 'NXP SDM session-key derivation prefix must stay explicit');
assert.match(crypto, /full\[i \* 2 \+ 1\]/, 'NXP MACt truncation must retain odd CMAC bytes');
assert.match(crypto, /picc_uid_counter_mirroring_required/, 'PICC parsing must fail closed when UID/counter mirroring is absent');

assert.match(architecture, /AN12196.*Rev\. 2\.0|Rev\. 2\.0.*AN12196/i, 'architecture must pin the reviewed NXP application-note revision');
assert.match(architecture, /physical pilot/i, 'architecture must preserve the physical evidence gate');
assert.match(architecture, /never.*AES key|AES key.*never/i, 'architecture must prohibit public/browser key exposure');

console.log('EVO V4.4 NFC verifier security/claim checks passed');
