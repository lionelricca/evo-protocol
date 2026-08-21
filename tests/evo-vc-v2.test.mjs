import assert from 'node:assert/strict';
import {toEvoProofCredential,proofTypeFor} from '../standards/evo-vc-v2.mjs';

const seal={
  seal_id:'EVO-AAAAAAAA-BBBBBBBB-CCCCCCCC',
  asset_type:'Documento',
  title:'Informe técnico',
  serial:'INF-001',
  asset_hash:'0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  created_at:'2026-08-21T12:00:00Z'
};

assert.equal(proofTypeFor(seal),'DocumentProof');
const vc=toEvoProofCredential(seal,{issuer:'https://example.com/issuers/acme',verificationUrl:'https://example.com/verify/EVO-AAAAAAAA-BBBBBBBB-CCCCCCCC'});
assert.equal(vc['@context'][0],'https://www.w3.org/ns/credentials/v2');
assert(vc.type.includes('VerifiableCredential'));
assert.equal(vc.credentialSubject.evoId,seal.seal_id);
assert.equal(vc.credentialSubject.digestAlgorithm,'SHA-256');
assert.equal(vc.credentialSchema.type,'JsonSchema');
assert.equal(vc.credentialSubject.evidenceLevel,'EVO_CRYPTOGRAPHIC_PROOF');
assert.throws(()=>toEvoProofCredential({...seal,asset_hash:'bad'},{issuer:'https://example.com/issuers/acme',verificationUrl:'https://example.com/verify/x'}),/invalid_digest/);

console.log('EVO W3C VC v2 mapping checks passed');
