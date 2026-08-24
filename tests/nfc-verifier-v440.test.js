'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const verifier = fs.readFileSync(path.join(ROOT, 'supabase/functions/evo-nfc-verifier/index.ts'), 'utf8');
const crypto = fs.readFileSync(path.join(ROOT, 'supabase/functions/_shared/evo-aes-cmac.mjs'), 'utf8');
const architecture = fs.readFileSync(path.join(ROOT, 'docs/NFC_ARCHITECTURE.md'), 'utf8');

assert.match(verifier, /EVO_NFC_PILOT_KEYS/, 'pilot keys must come from server environment, never request/public storage');
assert.match(verifier, /EVO_NFC_ADMIN_SECRET/, 'binding enrollment must have a separate server admin boundary');
assert.match(verifier, /restrictedPreflight/, 'NFC browser integration must use restricted CORS');
assert.match(verifier, /rejectUntrustedBrowserOrigin/, 'untrusted browser origins must be rejected');
assert.doesNotMatch(verifier, /Access-Control-Allow-Origin[^\n]*\*/, 'NFC verifier must not introduce wildcard browser CORS');
assert.match(verifier, /EVO NFC Verifier V4\.6/, 'runtime status must expose the TagTamper-capable verifier line');
assert.match(verifier, /NXP_AN12196_REV_2_0_VECTOR_VALIDATED/, 'runtime status must identify the validated NXP reference basis');
assert.match(verifier, /SDM_ENCRYPTED_TTSTATUS_SUPPORTED/, 'runtime status must expose encrypted TagTamper support');
assert.match(verifier, /evo_accept_nfc_counter/, 'cryptographic success must pass through atomic replay authority');
assert.match(verifier, /p_seal_id:\s*profile\.sealId/, 'atomic authority must bind the expected Seal in the same decision');
assert.match(verifier, /physicalPilotApproved === true/, 'final physical-grade claim must remain gated per enrolled physical tag');
assert.match(verifier, /fullyVerified = cryptoValid && replayAccepted && physicalApproved && tamperStatusVerified/, 'TagTamper final claim must require crypto + replay + physical pilot + valid tamper status');
assert.match(verifier, /evidenceState[\s\S]*NFC_CRYPTO_VERIFIED/, 'final evidence state must only be reachable through the full gate');
assert.match(verifier, /expectedUid/, 'cryptographic UID must be bound to the enrolled tag profile');
assert.match(verifier, /ENC_ASCII_CMAC_SUFFIX/, 'TagTamper profile must pin the reviewed dynamic MAC-input layout');
assert.match(verifier, /new TextEncoder\(\)\.encode\(`\$\{encData\}&cmac=`\)/, 'TagTamper MAC input must be derived server-side from the encrypted mirror and fixed suffix');
assert.match(verifier, /decryptSdmEncFileData/, 'TagTamper encrypted mirror must be decrypted server-side');
assert.match(verifier, /parseTagTamperStatus/, 'TagTamper C/O/I status must be parsed server-side');
assert.match(verifier, /TAGTAMPER_STATUS_INVALID/, 'invalid/not-enabled tamper status must fail closed');
assert.match(verifier, /MAX_BODY_BYTES\s*=\s*16_384/, 'public verification input must remain bounded');
assert.match(verifier, /from\("evo_nfc_tags"\)\.insert/, 'binding enrollment must write only server-side after active-Seal validation');

assert.match(crypto, /NIST SP 800-38B AES-CMAC/, 'CMAC implementation must state its standard basis');
assert.match(crypto, /0x3c, 0xc3, 0x00, 0x01, 0x00, 0x80/, 'NXP SDM MAC session-key derivation prefix must stay explicit');
assert.match(crypto, /0xc3, 0x3c, 0x00, 0x01, 0x00, 0x80/, 'NXP SDM ENC session-key derivation prefix must stay explicit');
assert.match(crypto, /full\[i \* 2 \+ 1\]/, 'NXP MACt truncation must retain odd CMAC bytes');
assert.match(crypto, /picc_uid_counter_mirroring_required/, 'PICC parsing must fail closed when UID/counter mirroring is absent');
assert.match(crypto, /decryptSdmEncFileData/, 'shared crypto must implement encrypted SDM file-data decryption');
assert.match(crypto, /value === 0x43[\s\S]*CLOSE/, 'TagTamper Close code must follow the NXP C value');
assert.match(crypto, /value === 0x4f[\s\S]*OPEN/, 'TagTamper Open code must follow the NXP O value');
assert.match(crypto, /value === 0x49[\s\S]*INVALID/, 'TagTamper Invalid code must follow the NXP I value');

assert.match(architecture, /AN12196.*Rev\. 2\.0|Rev\. 2\.0.*AN12196/i, 'architecture must pin the reviewed NXP application-note revision');
assert.match(architecture, /physical pilot/i, 'architecture must preserve the physical evidence gate');
assert.match(architecture, /never.*AES key|AES key.*never/i, 'architecture must prohibit public/browser key exposure');
assert.match(architecture, /TTPermStatus[\s\S]*TTCurrStatus/i, 'architecture must document the two NXP TagTamper states');
assert.match(architecture, /43h[\s\S]*4Fh[\s\S]*49h/i, 'architecture must document NXP C/O/I tamper codes');

console.log('EVO V4.6 NFC verifier + TagTamper security/claim checks passed');
