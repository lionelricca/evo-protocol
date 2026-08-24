import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  EVO_NFC_PROOF_VERSION,
  EVO_NFC_TRUSTED_VERIFIER,
  buildPublicNfcProof,
  isNfcProofAcceptableForPhysicalPresence
} from '../standards/evo-nfc-proof-v411.mjs';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const schema=JSON.parse(fs.readFileSync(path.join(__dirname,'..','schemas','evo-nfc-proof-v1.schema.json'),'utf8'));

const base={
  tagId:'EVO-NFC-TAG-0001',
  sealId:'EVO-12345678-ABCDEFGH-87654321',
  verifiedAt:'2026-08-24T15:30:00.000Z',
  verifierMode:EVO_NFC_TRUSTED_VERIFIER,
  macValid:true,
  tagBound:true,
  replayDetected:false,
  counterFresh:true,
  tamperState:'UNSUPPORTED'
};

{
  const proof=buildPublicNfcProof(base);
  assert.equal(proof.version,EVO_NFC_PROOF_VERSION);
  assert.equal(proof.status,'VERIFIED');
  assert.equal(proof.cryptographicVerified,true);
  assert.deepEqual(proof.evidenceLevels,['NFC_CRYPTO_VERIFIED']);
  assert.equal(proof.claims.cryptographicTagProof,true);
  assert.equal(proof.claims.physicalAuthenticity,false);
  assert.equal(isNfcProofAcceptableForPhysicalPresence(proof),true);
}

{
  const proof=buildPublicNfcProof({...base,macValid:false});
  assert.equal(proof.status,'REJECTED');
  assert.equal(proof.cryptographicVerified,false);
  assert(proof.riskSignals.includes('MAC_INVALID'));
  assert.equal(isNfcProofAcceptableForPhysicalPresence(proof),false);
}

{
  const proof=buildPublicNfcProof({...base,replayDetected:true});
  assert.equal(proof.status,'REJECTED');
  assert(proof.riskSignals.includes('REPLAY_DETECTED'));
  assert.equal(isNfcProofAcceptableForPhysicalPresence(proof),false);
}

{
  const proof=buildPublicNfcProof({...base,tagBound:false});
  assert.equal(proof.status,'REJECTED');
  assert(proof.riskSignals.includes('TAG_NOT_BOUND'));
}

{
  const proof=buildPublicNfcProof({...base,verifierMode:'BROWSER_LOCAL'});
  assert.equal(proof.status,'REJECTED');
  assert(proof.riskSignals.includes('UNTRUSTED_VERIFIER'));
  assert.equal(proof.claims.physicalAuthenticity,false);
}

{
  const proof=buildPublicNfcProof({...base,tamperState:'INTACT'});
  assert.equal(proof.status,'VERIFIED');
  assert.deepEqual(proof.evidenceLevels,['NFC_CRYPTO_VERIFIED','TAMPER_STATUS_VERIFIED']);
  assert.equal(proof.claims.tamperStatusVerified,true);
  assert.equal(proof.claims.physicalAuthenticity,false);
}

{
  const proof=buildPublicNfcProof({...base,tamperState:'OPEN'});
  assert.equal(proof.status,'VERIFIED_TAMPER_OPEN');
  assert.equal(proof.cryptographicVerified,true);
  assert(proof.riskSignals.includes('TAMPER_OPEN'));
  assert.equal(proof.claims.physicalAuthenticity,false);
}

{
  const proof=buildPublicNfcProof({
    ...base,
    aesKey:'00112233445566778899aabbccddeeff',
    masterKey:'ffeeddccbbaa99887766554433221100',
    rawSunPayload:'secret-test-payload'
  });
  assert.equal(Object.hasOwn(proof,'aesKey'),false);
  assert.equal(Object.hasOwn(proof,'masterKey'),false);
  assert.equal(Object.hasOwn(proof,'rawSunPayload'),false);
}

assert.equal(schema.properties.version.const,EVO_NFC_PROOF_VERSION);
assert.equal(schema.properties.verifierMode.const,EVO_NFC_TRUSTED_VERIFIER);
assert.equal(schema.properties.claims.properties.physicalAuthenticity.const,false);
assert.equal(schema.additionalProperties,false);

console.log('EVO V4.1.1 NFC public-proof boundary checks passed');
