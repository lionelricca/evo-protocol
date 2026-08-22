import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
};
const MAX_BODY_BYTES=2048;
const sealRe=/^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}})}
function hex(bytes:Uint8Array){return [...bytes].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function sha256(text:string){const bytes=new TextEncoder().encode(text);return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)))}
function canonicalJson(value:Record<string,unknown>){const out:Record<string,unknown>={};for(const k of Object.keys(value).sort())out[k]=value[k];return JSON.stringify(out)}
function maxIso(values:(string|null|undefined)[]){const valid=values.filter(Boolean).map(String).filter(v=>!Number.isNaN(Date.parse(v)));if(!valid.length)return new Date(0).toISOString();return new Date(Math.max(...valid.map(v=>Date.parse(v)))).toISOString()}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  try{
    const raw=await req.text();
    if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES)return json({error:"payload_too_large"},413);
    let body:Record<string,unknown>;
    try{body=JSON.parse(raw||"{}")}catch{return json({error:"invalid_json"},400)}
    const sealId=String(body?.sealId||"").trim().toUpperCase();
    if(!sealRe.test(sealId))return json({error:"invalid_seal_id"},400);

    const baseUrl=`${Deno.env.get("SUPABASE_URL")!}/functions/v1/evo-ai-guardian`;
    const baseResponse=await fetch(baseUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sealId})});
    let base:Record<string,any>={};
    try{base=await baseResponse.json()}catch{return json({error:"guardian_base_invalid_response"},502)}
    if(!baseResponse.ok)return json(base,baseResponse.status);

    const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
    const {data:seal,error:sealError}=await db.from("evo_seals").select("issuer_wallet,issuer_label,digest,status,registered_at").eq("seal_id",sealId).single();
    if(sealError||!seal)return json({error:"seal_not_found"},404);
    const issuerWallet=String(seal.issuer_wallet||"").toLowerCase();

    const [profileResult,latestEventResult,latestTransferResult,latestPulseResult,latestChallengeResult,latestServiceResult]=await Promise.all([
      db.from("evo_issuer_profiles").select("issuer_wallet,display_name,slug,website,status,created_at,updated_at,verified_at").eq("issuer_wallet",issuerWallet).maybeSingle(),
      db.from("evo_passport_events").select("event_digest,event_type,new_owner_wallet,registered_at,status").eq("seal_id",sealId).eq("status","ACTIVE").order("registered_at",{ascending:false}).limit(1).maybeSingle(),
      db.from("evo_passport_events").select("new_owner_wallet,registered_at").eq("seal_id",sealId).eq("event_type","TRANSFERRED").eq("status","ACTIVE").order("registered_at",{ascending:false}).limit(1).maybeSingle(),
      db.from("evo_pulses").select("pulse_hash,observed_at,status").eq("seal_id",sealId).eq("status","ACTIVE").order("observed_ms",{ascending:false}).limit(1).maybeSingle(),
      db.from("evo_challenges").select("challenge_id,status,created_at,expires_at,completed_at").eq("seal_id",sealId).order("created_at",{ascending:false}).limit(1).maybeSingle(),
      db.from("evo_service_proofs").select("proof_id,service_digest,provider_digest,evidence_level,registered_at,countersigned_at,status").eq("seal_id",sealId).eq("status","ACTIVE").order("registered_at",{ascending:false}).limit(1).maybeSingle(),
    ]);
    for(const r of [profileResult,latestEventResult,latestTransferResult,latestPulseResult,latestChallengeResult,latestServiceResult]){
      if(r.error){console.error(r.error.code);return json({error:"database_error"},500)}
    }

    const profile=profileResult.data;
    const latestEvent=latestEventResult.data;
    const latestTransfer=latestTransferResult.data;
    const latestPulse=latestPulseResult.data;
    const latestChallenge=latestChallengeResult.data;
    const latestService=latestServiceResult.data;

    let risk=Number(base.riskScore||0);
    let confidence=Number(base.evidenceConfidence||0);
    const signals=Array.isArray(base.signals)?[...base.signals]:[];
    let issuerTrust="SELF_DECLARED";
    let issuerDisplay=String(seal.issuer_label||issuerWallet);

    if(!profile){
      signals.push({code:"ISSUER_SELF_DECLARED",severity:"INFO",title:"Emisor auto-declarado",detail:"El texto público del emisor no demuestra identidad de marca u organización.",points:0});
    }else{
      issuerTrust=String(profile.status||"WALLET_PROVEN");
      issuerDisplay=String(profile.display_name||issuerDisplay);
      if(issuerTrust==="WALLET_PROVEN"){
        signals.push({code:"ISSUER_WALLET_PROVEN",severity:"INFO",title:"Perfil de emisor firmado",detail:"Una firma válida prueba control de la wallet/perfil; no prueba representación legal de una marca.",points:0});
        confidence+=3;
      }else if(issuerTrust==="DOMAIN_VERIFIED"){
        signals.push({code:"ISSUER_DOMAIN_VERIFIED",severity:"INFO",title:"Dominio del emisor verificado",detail:"La wallet del emisor demostró control DNS del dominio registrado.",points:0});
        confidence+=6;
      }else if(issuerTrust==="ORGANIZATION_VERIFIED"){
        signals.push({code:"ISSUER_ORGANIZATION_VERIFIED",severity:"INFO",title:"Organización verificada",detail:"La organización completó la verificación independiente definida por EVO.",points:0});
        confidence+=10;
      }else if(issuerTrust==="SUSPENDED"){
        signals.push({code:"ISSUER_SUSPENDED",severity:"HIGH",title:"Perfil de emisor suspendido",detail:"El perfil asociado a la wallet firmante está suspendido. Requiere revisión manual.",points:40});
        risk+=40;
      }
    }

    risk=Math.max(0,Math.min(100,risk));
    confidence=Math.max(0,Math.min(95,confidence));
    const riskLevel=risk>=50?"HIGH":risk>=20?"MEDIUM":"LOW";
    const verdict=riskLevel==="LOW"?"NO MATERIAL ANOMALIES DETECTED":riskLevel==="MEDIUM"?"REVIEW RECOMMENDED":"HIGH RISK — MANUAL REVIEW REQUIRED";

    let challengeState="NONE";
    if(latestChallenge){
      const status=String(latestChallenge.status||"").toUpperCase();
      if(status==="CONSUMED")challengeState="SOFTWARE_FRESH_ACCEPTED";
      else if(status==="EXPIRED")challengeState="EXPIRED";
      else if(status==="PENDING"&&Date.parse(String(latestChallenge.expires_at||""))<=Date.now())challengeState="EXPIRED";
      else if(status==="PENDING")challengeState="PENDING";
    }

    const currentOwner=String(latestTransfer?.new_owner_wallet||issuerWallet||"NONE").toLowerCase();
    const passportHead=String(latestEvent?.event_digest||"NONE");
    const pulseHead=String(latestPulse?.pulse_hash||"NONE");
    const serviceProofHead=String(latestService?.provider_digest||latestService?.service_digest||"NONE");
    const physicalProofState="NONE";
    const signedPassportEvents=Math.max(0,Number(base.stats?.signedPassportEvents??Math.max(0,Number(base.stats?.passportEvents||1)-1)));
    const ownerSignedServiceProofs=Math.max(0,Number(base.stats?.ownerSignedServiceProofs||0));
    const providerCountersignedProofs=Math.max(0,Number(base.stats?.providerCountersignedProofs||0));
    const publicPulseCount=Math.max(0,Number(base.stats?.pulsesTotal||0));
    const softwareChallengesAccepted=Math.max(0,Number(base.stats?.acceptedChallenges||0));
    const strongerIssuer=["DOMAIN_VERIFIED","ORGANIZATION_VERIFIED"].includes(issuerTrust);
    const trustedIssuer=["WALLET_PROVEN","DOMAIN_VERIFIED","ORGANIZATION_VERIFIED"].includes(issuerTrust);
    const signedContinuity=signedPassportEvents>0||ownerSignedServiceProofs>0;
    const independentlyCorroborated=providerCountersignedProofs>0;

    let authorityLevel=1;
    let authorityLabel="SIGNED IDENTITY";
    if(issuerTrust==="SUSPENDED"){
      authorityLevel=1;authorityLabel="SIGNED IDENTITY";
    }else if(physicalProofState==="NFC_VERIFIED"){
      authorityLevel=4;authorityLabel="PHYSICAL CRYPTO PROOF";
    }else if(independentlyCorroborated||(strongerIssuer&&signedContinuity)){
      authorityLevel=3;authorityLabel="TRUSTED DIGITAL IDENTITY";
    }else if(signedContinuity){
      authorityLevel=2;authorityLabel="SIGNED CONTINUITY";
    }

    const authorityUpdatedAt=maxIso([
      seal.registered_at,
      profile?.updated_at,
      profile?.verified_at,
      latestEvent?.registered_at,
      latestTransfer?.registered_at,
      latestService?.registered_at,
      latestService?.countersigned_at,
    ]);
    const authorityState={
      version:"EVO-AUTHORITY-STATE-V1",
      sealId,
      issuerTrust,
      currentOwner:currentOwner||"NONE",
      passportHead,
      serviceProofHead,
      signedPassportEvents,
      ownerSignedServiceProofs,
      providerCountersignedProofs,
      physicalProofState,
      previousAuthorityRoot:"GENESIS",
      updatedAt:authorityUpdatedAt,
    };
    const authorityRoot=await sha256(canonicalJson(authorityState));

    // Reality state intentionally includes observational telemetry. It is useful
    // for anomaly detection, but its root is NOT the authority root.
    const realityUpdatedAt=maxIso([
      authorityUpdatedAt,
      latestPulse?.observed_at,
      latestChallenge?.completed_at,
      latestChallenge?.created_at,
    ]);
    const realityState={
      version:"EVO-REALITY-STATE-V1",
      sealId,
      authorityRoot,
      issuerTrust,
      currentOwner:currentOwner||"NONE",
      passportHead,
      serviceProofHead,
      pulseHead,
      challengeState,
      physicalProofState,
      riskState:riskLevel,
      previousRealityRoot:"GENESIS",
      updatedAt:realityUpdatedAt,
    };
    const realityRoot=await sha256(canonicalJson(realityState));

    const limitations=Array.isArray(base.limitations)?[...base.limitations]:[];
    limitations.push("Authority Root excluye Pulse y SOFTWARE_V0 Challenge para que actividad pública no pueda elevar ni modificar la evidencia autoritativa.");
    limitations.push("Reality Root incluye telemetría pública y sirve para continuidad/anomalías; no debe interpretarse como una certificación de autoridad.");
    limitations.push("WALLET_PROVEN demuestra control criptográfico de una wallet/perfil; no demuestra por sí solo representación legal de una marca o empresa.");

    return json({
      ...base,
      engine:"EVO AI Guardian V0.7",
      mode:"EXPLAINABLE_RISK + AUTHORITY_ROOT + REALITY_ROOT + ISSUER_TRUST",
      verdict,riskScore:risk,riskLevel,evidenceConfidence:confidence,signals,limitations,
      stats:{...(base.stats||{}),issuerTrust,realityLevel:authorityLevel,realityRoot,authorityRoot},
      issuer:{wallet:issuerWallet,displayName:issuerDisplay,trust:issuerTrust,profile:profile||null},
      authority:{
        version:"EVO-AUTHORITY-STATE-V1",
        level:authorityLevel,
        label:authorityLabel,
        root:authorityRoot,
        chainState:"UNANCHORED_V1",
        trustedIssuer,
        strongerIssuer,
        publicTelemetryAuthoritative:false,
        rule:"PUBLIC_TELEMETRY_NEVER_ELEVATES_AUTHORITY",
        state:authorityState,
      },
      publicTelemetry:{
        ...(base.publicTelemetry||{}),
        pulses:publicPulseCount,
        softwareChallengesAccepted,
        authority:"OBSERVATIONAL_ONLY",
      },
      reality:{
        version:"EVO-REALITY-STATE-V1",
        level:authorityLevel,
        label:authorityLabel,
        root:realityRoot,
        authorityRoot,
        chainState:"UNANCHORED_V1",
        trustedIssuer,
        state:realityState,
      },
      analyzedAt:new Date().toISOString(),
    });
  }catch(err){console.error(err instanceof Error?err.name:"unknown");return json({error:"internal_error"},500)}
});
