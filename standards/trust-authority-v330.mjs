export const TRUST_AUTHORITY_LEVELS=Object.freeze({
  SIGNED_IDENTITY:1,
  SIGNED_CONTINUITY:2,
  TRUSTED_DIGITAL_IDENTITY:3,
  HIGH_ASSURANCE_EVIDENCE:4,
});

const STRONG_ISSUER_STATES=new Set(['DOMAIN_VERIFIED','ORGANIZATION_VERIFIED']);
const KNOWN_ISSUER_STATES=new Set(['WALLET_PROVEN','DOMAIN_VERIFIED','ORGANIZATION_VERIFIED']);

export function classifyTrustAuthority(input={}){
  const issuerTrust=String(input.issuerTrust||'SELF_DECLARED').toUpperCase();
  const signedContinuityEvents=Math.max(0,Number(input.signedContinuityEvents||0));
  const providerCountersignedProofs=Math.max(0,Number(input.providerCountersignedProofs||0));
  const externalValidatedEvidence=Math.max(0,Number(input.externalValidatedEvidence||0));
  const regulatedEvidence=Math.max(0,Number(input.regulatedEvidence||0));
  const securePhysicalProofs=Math.max(0,Number(input.securePhysicalProofs||0));
  const publicPulseCount=Math.max(0,Number(input.publicPulseCount||0));
  const softwareChallengesAccepted=Math.max(0,Number(input.softwareChallengesAccepted||0));

  const suspended=issuerTrust==='SUSPENDED';
  const trustedIssuer=KNOWN_ISSUER_STATES.has(issuerTrust);
  const strongerIssuer=STRONG_ISSUER_STATES.has(issuerTrust);
  const independentEvidence=providerCountersignedProofs>0||externalValidatedEvidence>0;
  const highAssurance=regulatedEvidence>0||securePhysicalProofs>0;

  let level=TRUST_AUTHORITY_LEVELS.SIGNED_IDENTITY;
  let label='SIGNED IDENTITY';

  if(!suspended&&highAssurance){
    level=TRUST_AUTHORITY_LEVELS.HIGH_ASSURANCE_EVIDENCE;
    label='HIGH ASSURANCE EVIDENCE';
  }else if(!suspended&&((strongerIssuer&&signedContinuityEvents>0)||independentEvidence)){
    level=TRUST_AUTHORITY_LEVELS.TRUSTED_DIGITAL_IDENTITY;
    label='TRUSTED DIGITAL IDENTITY';
  }else if(!suspended&&signedContinuityEvents>0){
    level=TRUST_AUTHORITY_LEVELS.SIGNED_CONTINUITY;
    label='SIGNED CONTINUITY';
  }

  return Object.freeze({
    level,
    label,
    issuerTrust,
    suspended,
    trustedIssuer,
    strongerIssuer,
    signedContinuityEvents,
    providerCountersignedProofs,
    externalValidatedEvidence,
    regulatedEvidence,
    securePhysicalProofs,
    publicPulseCount,
    softwareChallengesAccepted,
    publicTelemetryObserved:publicPulseCount>0||softwareChallengesAccepted>0,
    publicTelemetryAuthoritative:false,
    rule:'PUBLIC_TELEMETRY_NEVER_ELEVATES_AUTHORITY',
  });
}
