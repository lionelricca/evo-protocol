export const EVO_DOCUMENT_PROVENANCE_PROFILE='EVO-DOCUMENT-PROVENANCE-V1';

const HEX64=/^[a-f0-9]{64}$/;
const WALLET=/^0x[0-9a-f]{40}$/;
const EXTERNAL_TYPES=new Set([
  'RFC3161_TIMESTAMP',
  'PADES_SIGNATURE',
  'C2PA_CONTENT_CREDENTIAL',
  'W3C_VERIFIABLE_CREDENTIAL',
  'QUALIFIED_TRUST_SERVICE'
]);

function required(value,name){
  const out=String(value??'').trim();
  if(!out)throw new Error(`missing_${name}`);
  return out;
}

function isoDate(value){
  const date=new Date(value||Date.now());
  if(Number.isNaN(date.getTime()))throw new Error('invalid_created_at');
  return date.toISOString();
}

export function normalizeDigest(value){
  const digest=required(value,'digest').toLowerCase();
  if(!HEX64.test(digest))throw new Error('invalid_digest');
  return digest;
}

export function buildDocumentProvenanceRecord(input={}){
  const sealId=required(input.sealId,'seal_id').toUpperCase();
  const digest=normalizeDigest(input.digest);
  const parentDigest=input.parentDigest?normalizeDigest(input.parentDigest):'';
  const issuerWallet=String(input.issuerWallet||'').trim().toLowerCase();
  const issuerDomain=String(input.issuerDomain||'').trim().toLowerCase();
  if(issuerWallet&&!WALLET.test(issuerWallet))throw new Error('invalid_issuer_wallet');
  if(!issuerWallet&&!issuerDomain)throw new Error('missing_issuer_identity');
  const verificationUrl=required(input.verificationUrl,'verification_url');
  try{new URL(verificationUrl)}catch{throw new Error('invalid_verification_url')}

  const record={
    profile:EVO_DOCUMENT_PROVENANCE_PROFILE,
    id:`urn:evo:document:${sealId}:${digest.slice(0,16)}`,
    sealId,
    createdAt:isoDate(input.createdAt),
    subject:{
      filename:String(input.filename||''),
      mimeType:String(input.mimeType||'application/octet-stream'),
      reference:String(input.reference||'')
    },
    integrity:{algorithm:'SHA-256',digest},
    issuer:{
      wallet:issuerWallet,
      domain:issuerDomain,
      domainBindingStatus:input.domainBindingStatus==='EVO_VERIFIED'?'EVO_VERIFIED':'UNVERIFIED'
    },
    provenance:{
      relationship:parentDigest?'DERIVED_FROM':'ORIGIN_DECLARED',
      parentDigest:parentDigest||null
    },
    verificationUrl,
    evidence:[{type:'EVO_FILE_HASH',validationStatus:'VALIDATED'}],
    semantics:{
      provesExactFileMatch:true,
      provesIssuerDeclaration:true,
      provesContentTruth:false,
      provesLegalOriginality:false
    }
  };
  return record;
}

export function attachExternalEvidence(record,evidence={}){
  if(!record||record.profile!==EVO_DOCUMENT_PROVENANCE_PROFILE)throw new Error('invalid_record');
  const type=required(evidence.type,'evidence_type').toUpperCase();
  if(!EXTERNAL_TYPES.has(type))throw new Error('invalid_evidence_type');
  const validationStatus=evidence.validationStatus==='VALIDATED'?'VALIDATED':'UNVERIFIED';
  if(validationStatus==='VALIDATED'&&!String(evidence.validator||'').trim())throw new Error('missing_validator');
  const item={
    type,
    validationStatus,
    authority:String(evidence.authority||''),
    reference:String(evidence.reference||''),
    validator:String(evidence.validator||''),
    validatedAt:validationStatus==='VALIDATED'?isoDate(evidence.validatedAt):null
  };
  return {...record,evidence:[...(record.evidence||[]),item]};
}

export function classifyDocumentEvidence(record){
  const evidence=Array.isArray(record?.evidence)?record.evidence:[];
  const validated=type=>evidence.some(item=>item.type===type&&item.validationStatus==='VALIDATED');
  if(validated('QUALIFIED_TRUST_SERVICE'))return 'EXTERNAL_REGULATED_TRUST';
  if(validated('PADES_SIGNATURE')||validated('RFC3161_TIMESTAMP'))return 'EXTERNAL_VALIDATED_EVIDENCE';
  if(record?.issuer?.domainBindingStatus==='EVO_VERIFIED')return 'EVO_DOMAIN_BOUND_ISSUER';
  return 'EVO_CRYPTOGRAPHIC_PROOF';
}
