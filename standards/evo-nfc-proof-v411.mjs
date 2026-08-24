export const EVO_NFC_PROOF_VERSION='EVO-NFC-PROOF-V1';
export const EVO_NFC_TRUSTED_VERIFIER='SERVER_SIDE_NTAG424';

const HEX_ID=/^[A-Za-z0-9._:-]{8,128}$/;
const SEAL_ID=/^EVO-[A-Z0-9]{8}-[A-Z0-9]{8}-[A-Z0-9]{8}$/;
const TAMPER_STATES=new Set(['UNSUPPORTED','INTACT','OPEN','UNKNOWN']);

function text(value){return String(value||'').trim()}
function iso(value){
  const raw=text(value);
  if(!raw)return '';
  const time=Date.parse(raw);
  return Number.isFinite(time)?new Date(time).toISOString():'';
}
function tamper(value){
  const normalized=text(value).toUpperCase();
  return TAMPER_STATES.has(normalized)?normalized:'UNKNOWN';
}
function addRisk(list,value){if(value&&!list.includes(value))list.push(value)}

/**
 * Convert a trusted server decision into the only NFC evidence object that may
 * be exposed to the public EVO surface.
 *
 * This module deliberately does NOT verify AES/SUN/SDM data itself. Raw tag
 * cryptography and keys belong to a server-side verifier. The browser/public
 * layer receives only the decision and fail-closes unless every authoritative
 * precondition is present.
 */
export function buildPublicNfcProof(decision={}){
  const tagId=text(decision.tagId);
  const sealId=text(decision.sealId).toUpperCase();
  const verifiedAt=iso(decision.verifiedAt);
  const verifierMode=text(decision.verifierMode).toUpperCase();
  const tamperState=tamper(decision.tamperState);
  const replayDetected=decision.replayDetected===true;
  const counterFresh=decision.counterFresh===true;
  const tagBound=decision.tagBound===true;
  const macValid=decision.macValid===true;
  const risks=[];

  if(!HEX_ID.test(tagId))addRisk(risks,'TAG_ID_INVALID');
  if(!SEAL_ID.test(sealId))addRisk(risks,'SEAL_ID_INVALID');
  if(!verifiedAt)addRisk(risks,'VERIFICATION_TIME_INVALID');
  if(verifierMode!==EVO_NFC_TRUSTED_VERIFIER)addRisk(risks,'UNTRUSTED_VERIFIER');
  if(!macValid)addRisk(risks,'MAC_INVALID');
  if(!tagBound)addRisk(risks,'TAG_NOT_BOUND');
  if(replayDetected)addRisk(risks,'REPLAY_DETECTED');
  if(!counterFresh)addRisk(risks,'COUNTER_NOT_FRESH');

  const cryptographicVerified=risks.length===0;
  const evidenceLevels=[];
  let status='REJECTED';

  if(cryptographicVerified){
    evidenceLevels.push('NFC_CRYPTO_VERIFIED');
    status='VERIFIED';

    if(tamperState==='INTACT'){
      evidenceLevels.push('TAMPER_STATUS_VERIFIED');
    }else if(tamperState==='OPEN'){
      evidenceLevels.push('TAMPER_STATUS_VERIFIED');
      addRisk(risks,'TAMPER_OPEN');
      status='VERIFIED_TAMPER_OPEN';
    }
  }

  return {
    version:EVO_NFC_PROOF_VERSION,
    tagId,
    sealId,
    verifiedAt,
    verifierMode,
    status,
    cryptographicVerified,
    evidenceLevels,
    tamperState,
    replayDetected,
    counterFresh,
    tagBound,
    riskSignals:risks,
    claims:{
      cryptographicTagProof:cryptographicVerified,
      tamperStatusVerified:cryptographicVerified&&(tamperState==='INTACT'||tamperState==='OPEN'),
      physicalAuthenticity:false
    }
  };
}

export function isNfcProofAcceptableForPhysicalPresence(proof){
  return Boolean(
    proof&&
    proof.version===EVO_NFC_PROOF_VERSION&&
    proof.verifierMode===EVO_NFC_TRUSTED_VERIFIER&&
    proof.cryptographicVerified===true&&
    proof.replayDetected===false&&
    proof.counterFresh===true&&
    proof.tagBound===true&&
    Array.isArray(proof.evidenceLevels)&&
    proof.evidenceLevels.includes('NFC_CRYPTO_VERIFIED')
  );
}
