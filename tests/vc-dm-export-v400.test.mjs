import assert from 'node:assert/strict';
import {
  EVO_VC_DM_EXPORT_PROFILE,
  W3C_VC_CONTEXT,
  EVO_VC_SCHEMA_URL,
  buildEvoVcDataModelExport,
  assertSecuredCredential
} from '../standards/evo-vc-dm-export-v400.mjs';

const digest='0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const record=buildEvoVcDataModelExport({
  sealId:'EVO-AAAAAAAA-BBBBBBBB-CCCCCCCC',
  asset_type:'Documento',
  title:'Inspection report',
  serial:'RPT-2026-001',
  asset_hash:digest,
  registered_at:'2026-08-23T12:00:00Z'
},{
  issuer:'urn:evo:issuer:0x1111111111111111111111111111111111111111',
  verificationUrl:'https://lionelricca.github.io/evo-protocol/v1/?seal=EVO-AAAAAAAA-BBBBBBBB-CCCCCCCC#verify'
});

assert.equal(record.profile,EVO_VC_DM_EXPORT_PROFILE);
assert.equal(record.security.secured,false);
assert.equal(record.security.status,'UNSECURED_EXPORT');
assert.equal(record.credential['@context'][0],W3C_VC_CONTEXT);
assert(record.credential.type.includes('VerifiableCredential'));
assert.equal(record.credential.credentialSchema.id,EVO_VC_SCHEMA_URL);
assert.equal(record.credential.credentialSubject.digest,digest);
assert(!('proof' in record.credential),'unsecured export must not invent a W3C proof');
assert(!('credentialStatus' in record.credential),'unimplemented status method must not be invented');
assert.throws(()=>assertSecuredCredential(record),/credential_not_cryptographically_secured/);
assert(!JSON.stringify(record).includes('evo.example'),'release output must contain no placeholder EVO domain');

console.log('EVO V4.0 VC Data Model export checks passed');
