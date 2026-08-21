import assert from 'node:assert/strict';
import {
  EVO_DOCUMENT_PROVENANCE_PROFILE,
  buildDocumentProvenanceRecord,
  attachExternalEvidence,
  classifyDocumentEvidence
} from '../standards/document-provenance-v321.mjs';

const digest='0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const parent='abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
const wallet='0x1111111111111111111111111111111111111111';

const origin=buildDocumentProvenanceRecord({
  sealId:'EVO-AAAAAAAA-BBBBBBBB-CCCCCCCC',
  digest,
  filename:'report.pdf',
  mimeType:'application/pdf',
  issuerWallet:wallet,
  issuerDomain:'example.com',
  verificationUrl:'https://example.com/verify/EVO-AAAAAAAA-BBBBBBBB-CCCCCCCC',
  createdAt:'2026-08-21T22:40:00Z'
});

assert.equal(origin.profile,EVO_DOCUMENT_PROVENANCE_PROFILE);
assert.equal(origin.integrity.algorithm,'SHA-256');
assert.equal(origin.provenance.relationship,'ORIGIN_DECLARED');
assert.equal(origin.semantics.provesExactFileMatch,true);
assert.equal(origin.semantics.provesContentTruth,false);
assert.equal(origin.semantics.provesLegalOriginality,false);
assert.equal(classifyDocumentEvidence(origin),'EVO_CRYPTOGRAPHIC_PROOF');

const derived=buildDocumentProvenanceRecord({
  sealId:'EVO-DDDDDDDD-EEEEEEEE-FFFFFFFF',
  digest,
  parentDigest:parent,
  issuerWallet:wallet,
  issuerDomain:'example.com',
  domainBindingStatus:'EVO_VERIFIED',
  verificationUrl:'https://example.com/verify/EVO-DDDDDDDD-EEEEEEEE-FFFFFFFF'
});
assert.equal(derived.provenance.relationship,'DERIVED_FROM');
assert.equal(derived.provenance.parentDigest,parent);
assert.equal(classifyDocumentEvidence(derived),'EVO_DOMAIN_BOUND_ISSUER');

const timestamped=attachExternalEvidence(origin,{
  type:'RFC3161_TIMESTAMP',
  validationStatus:'VALIDATED',
  authority:'Example TSA',
  reference:'tsa:123',
  validator:'evo-rfc3161-validator-v1',
  validatedAt:'2026-08-21T22:45:00Z'
});
assert.equal(classifyDocumentEvidence(timestamped),'EXTERNAL_VALIDATED_EVIDENCE');

const regulated=attachExternalEvidence(timestamped,{
  type:'QUALIFIED_TRUST_SERVICE',
  validationStatus:'VALIDATED',
  authority:'Example QTSP',
  reference:'qts:456',
  validator:'evo-trusted-list-validator-v1',
  validatedAt:'2026-08-21T22:46:00Z'
});
assert.equal(classifyDocumentEvidence(regulated),'EXTERNAL_REGULATED_TRUST');

assert.throws(()=>buildDocumentProvenanceRecord({...origin,digest:'bad',issuerWallet:wallet,verificationUrl:'https://example.com'}),/invalid_digest/);
assert.throws(()=>buildDocumentProvenanceRecord({sealId:'EVO-X',digest,issuerWallet:'0xbad',verificationUrl:'https://example.com'}),/invalid_issuer_wallet/);
assert.throws(()=>attachExternalEvidence(origin,{type:'PADES_SIGNATURE',validationStatus:'VALIDATED'}),/missing_validator/);

console.log('EVO V3.2.1 document provenance checks passed');
