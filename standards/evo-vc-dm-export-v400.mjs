export const EVO_VC_DM_EXPORT_PROFILE='EVO-VC-DM-2.0-UNSECURED-EXPORT-V1';
export const W3C_VC_CONTEXT='https://www.w3.org/ns/credentials/v2';
export const EVO_VC_CONTEXT='https://lionelricca.github.io/evo-protocol/contexts/evo-v1.jsonld';
export const EVO_VC_SCHEMA_URL='https://lionelricca.github.io/evo-protocol/schemas/evo-proof-credential-v400.schema.json';

const HEX64=/^[a-f0-9]{64}$/;

function required(value,name){
  const out=String(value??'').trim();
  if(!out)throw new Error(`missing_${name}`);
  return out;
}

function asUri(value,name){
  const out=required(value,name);
  try{
    const parsed=new URL(out);
    if(!parsed.protocol)throw new Error('missing_protocol');
  }catch{
    throw new Error(`invalid_${name}`);
  }
  return out;
}

function asIso(value){
  const date=new Date(value||Date.now());
  if(Number.isNaN(date.getTime()))throw new Error('invalid_valid_from');
  return date.toISOString();
}

function digestFrom(input={}){
  const digest=required(input.digest||input.asset_hash||input.assetHash||input.metadata_hash||input.metadataHash,'digest').toLowerCase();
  if(!HEX64.test(digest))throw new Error('invalid_digest');
  return digest;
}

export function buildEvoVcDataModelExport(input={},options={}){
  const evoId=required(input.sealId||input.seal_id,'evo_id').toUpperCase();
  const issuer=asUri(options.issuer||input.issuer,'issuer');
  const verificationUrl=asUri(options.verificationUrl||input.verificationUrl,'verification_url');
  const credentialId=asUri(options.credentialId||`urn:evo:credential:${evoId}`,'credential_id');
  const digest=digestFrom(input);

  const credential={
    '@context':[W3C_VC_CONTEXT,EVO_VC_CONTEXT],
    id:credentialId,
    type:['VerifiableCredential','EvoProofCredential'],
    issuer,
    validFrom:asIso(input.registered_at||input.registeredAt||input.created_at||input.createdAt),
    credentialSubject:{
      id:`urn:evo:proof:${evoId}`,
      evoId,
      proofType:String(options.proofType||'DocumentProof'),
      subjectType:String(input.asset_type||input.assetType||'Document'),
      title:String(input.title||''),
      reference:String(input.serial||input.reference||''),
      digestAlgorithm:'SHA-256',
      digest,
      verificationUrl,
      evidenceLevel:String(options.evidenceLevel||'EVO_CRYPTOGRAPHIC_PROOF')
    },
    credentialSchema:{
      id:EVO_VC_SCHEMA_URL,
      type:'JsonSchema'
    }
  };

  return Object.freeze({
    profile:EVO_VC_DM_EXPORT_PROFILE,
    interoperabilityTarget:'W3C Verifiable Credentials Data Model 2.0',
    security:Object.freeze({
      secured:false,
      status:'UNSECURED_EXPORT',
      statement:'This export is a VC Data Model representation only. It is not a cryptographically secured Verifiable Credential until an interoperable securing mechanism is applied and verified.'
    }),
    credential
  });
}

export function assertSecuredCredential(exportRecord={}){
  if(exportRecord?.security?.secured!==true)throw new Error('credential_not_cryptographically_secured');
  return true;
}
