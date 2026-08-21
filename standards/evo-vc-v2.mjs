const VC_CONTEXT='https://www.w3.org/ns/credentials/v2';
const EVO_CONTEXT={
  '@version':1.1,
  evo:'https://evo.example/vocab#',
  evoId:'evo:evoId',
  proofType:'evo:proofType',
  subjectType:'evo:subjectType',
  reference:'evo:reference',
  digestAlgorithm:'evo:digestAlgorithm',
  digest:'evo:digest',
  verificationUrl:{'@id':'evo:verificationUrl','@type':'@id'},
  evidenceLevel:'evo:evidenceLevel'
};

function required(value,name){if(value===undefined||value===null||String(value).trim()==='')throw new Error(`missing_${name}`);return String(value).trim();}

export function proofTypeFor(seal){
  const type=String(seal.asset_type||seal.assetType||'').toLowerCase();
  if(type==='documento'||type==='document')return 'DocumentProof';
  return 'AssetPassport';
}

export function toEvoProofCredential(seal,{issuer,verificationUrl,credentialId,schemaUrl='https://evo.example/schemas/evo-proof-credential-v2.schema.json',evidenceLevel='EVO_CRYPTOGRAPHIC_PROOF'}={}){
  const evoId=required(seal.seal_id||seal.sealId,'evo_id');
  const issuerId=required(issuer,'issuer');
  const verifyUrl=required(verificationUrl,'verification_url');
  const digest=required(seal.asset_hash||seal.assetHash||seal.metadata_hash||seal.metadataHash,'digest').toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(digest))throw new Error('invalid_digest');
  const validFrom=new Date(seal.registered_at||seal.registeredAt||seal.created_at||seal.createdAt||Date.now()).toISOString();
  const subjectType=String(seal.asset_type||seal.assetType||'Asset');

  return {
    '@context':[VC_CONTEXT,EVO_CONTEXT],
    id:credentialId||`urn:evo:credential:${evoId}`,
    type:['VerifiableCredential','EvoProofCredential'],
    issuer:issuerId,
    validFrom,
    credentialSubject:{
      id:`urn:evo:proof:${evoId}`,
      evoId,
      proofType:proofTypeFor(seal),
      subjectType,
      title:String(seal.title||''),
      reference:String(seal.serial||''),
      digestAlgorithm:'SHA-256',
      digest,
      verificationUrl:verifyUrl,
      evidenceLevel
    },
    credentialSchema:{id:schemaUrl,type:'JsonSchema'}
  };
}

export const EVO_VC_V2={context:VC_CONTEXT,evoContext:EVO_CONTEXT};
