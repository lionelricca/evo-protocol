import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
};
const MAX_BODY_BYTES=2048;
const MAX_EVENTS=1000;
const MAX_TRANSFERS=1000;
const MAX_PULSES_ANALYZED=5000;
const MAX_CHALLENGE_ATTEMPTS=2000;
const MAX_SERVICE_PROOFS=1000;
const sealRe=/^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
const ZERO="0".repeat(64);
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}})}
async function sha256(text:string){const b=new TextEncoder().encode(text);const d=await crypto.subtle.digest("SHA-256",b);return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}

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

    const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
    const {data:seal,error:sealError}=await supabase.from("evo_seals")
      .select("seal_id,status,asset_type,title,issuer_wallet,issuer_label,serial,asset_hash,created_at,registered_at")
      .eq("seal_id",sealId).single();
    if(sealError||!seal)return json({error:"seal_not_found"},404);

    const [eventsResult,transfersResult,pulsesResult,challengeResult,serviceResult]=await Promise.all([
      supabase.from("evo_passport_events")
        .select("event_id,event_type,actor_wallet,new_owner_wallet,note,event_digest,created_at,registered_at,status",{count:"exact"})
        .eq("seal_id",sealId).eq("status","ACTIVE").order("registered_at",{ascending:true}).limit(MAX_EVENTS),
      supabase.from("evo_passport_transfers")
        .select("offer_id,from_wallet,to_wallet,status,created_at,expires_at,accepted_at,registered_at",{count:"exact"})
        .eq("seal_id",sealId).order("registered_at",{ascending:true}).limit(MAX_TRANSFERS),
      supabase.from("evo_pulses")
        .select("pulse_id,source,client_nonce,prev_pulse_hash,pulse_hash,observed_at,observed_ms,status",{count:"exact"})
        .eq("seal_id",sealId).eq("status","ACTIVE").order("observed_ms",{ascending:true}).limit(MAX_PULSES_ANALYZED),
      supabase.from("evo_challenge_attempts")
        .select("attempt_type,attempted_at",{count:"exact"})
        .eq("seal_id",sealId).order("attempted_at",{ascending:false}).limit(MAX_CHALLENGE_ATTEMPTS),
      supabase.from("evo_service_proofs")
        .select("proof_id,evidence_level,service_digest,provider_digest,registered_at,countersigned_at,status",{count:"exact"})
        .eq("seal_id",sealId).eq("status","ACTIVE").order("registered_at",{ascending:false}).limit(MAX_SERVICE_PROOFS),
    ]);
    for(const r of [eventsResult,transfersResult,pulsesResult,challengeResult,serviceResult])if(r.error)return json({error:"database_error"},500);

    const ev=eventsResult.data||[];
    const tr=transfersResult.data||[];
    const pu=pulsesResult.data||[];
    const ca=challengeResult.data||[];
    const sp=serviceResult.data||[];
    const totalEvents=eventsResult.count??ev.length;
    const totalTransfers=transfersResult.count??tr.length;
    const totalPulses=pulsesResult.count??pu.length;
    const totalChallengeAttempts=challengeResult.count??ca.length;
    const totalServiceProofs=serviceResult.count??sp.length;

    let duplicateAssetCount=0;
    if(seal.asset_hash){
      const {count}=await supabase.from("evo_seals").select("seal_id",{count:"exact",head:true}).eq("asset_hash",seal.asset_hash).eq("status","ACTIVE");
      duplicateAssetCount=count||0;
    }
    let duplicateSerialCount=0;
    if(seal.serial&&seal.issuer_wallet){
      const {count}=await supabase.from("evo_seals").select("seal_id",{count:"exact",head:true}).eq("serial",seal.serial).eq("issuer_wallet",String(seal.issuer_wallet).toLowerCase()).eq("status","ACTIVE");
      duplicateSerialCount=count||0;
    }

    let risk=0;
    const signals:Array<{code:string,severity:"INFO"|"LOW"|"MEDIUM"|"HIGH",title:string,detail:string,points:number}>=[];
    const add=(code:string,severity:"INFO"|"LOW"|"MEDIUM"|"HIGH",title:string,detail:string,points=0)=>{signals.push({code,severity,title,detail,points});risk+=points};

    if(seal.status!=="ACTIVE")add("SEAL_NOT_ACTIVE","HIGH","Sello no activo","El registro no está en estado ACTIVE.",70);
    else add("SEAL_ACTIVE","INFO","Registro activo","El EVO Seal existe y está activo.");

    if(seal.asset_hash)add("ASSET_HASH_PRESENT","INFO","Huella SHA-256 registrada","Existe una huella criptográfica del activo/archivo.");
    else add("NO_ASSET_HASH","LOW","Sin huella de archivo","Este sello no contiene asset hash; la integridad del archivo no puede compararse.",10);

    if(duplicateAssetCount>1)add("DUPLICATE_ASSET_HASH","HIGH","Huella repetida","La misma huella SHA-256 aparece en más de un sello activo. Requiere revisión.",35);
    if(duplicateSerialCount>1)add("DUPLICATE_SERIAL","HIGH","Serial repetido","El mismo emisor tiene más de un sello activo con este serial.",30);

    const blankEvents=ev.filter((e:any)=>!String(e.note||"").trim()&&["NOTE","SOLD","REPAIRED","WARRANTY","INSPECTED"].includes(e.event_type));
    if(blankEvents.length)add("LEGACY_EMPTY_DETAILS","LOW","Evento sin detalle","Hay eventos antiguos sin detalle descriptivo. La regla actual impide nuevos eventos vacíos.",3);
    if(totalEvents>MAX_EVENTS)add("EVENT_ANALYSIS_TRUNCATED","INFO","Historial extenso",`Guardian analizó los primeros ${MAX_EVENTS} eventos de ${totalEvents}.`);

    const transferEvents=ev.filter((e:any)=>e.event_type==="TRANSFERRED");
    for(let i=1;i<transferEvents.length;i++){
      const a=new Date(transferEvents[i-1].registered_at).getTime();const b=new Date(transferEvents[i].registered_at).getTime();
      if(Number.isFinite(a)&&Number.isFinite(b)&&b-a<5*60*1000){add("RAPID_TRANSFERS","HIGH","Transferencias demasiado rápidas","Se detectaron cambios de propietario separados por menos de 5 minutos.",30);break}
    }

    const now=Date.now();
    const recentTransfers=transferEvents.filter((e:any)=>now-new Date(e.registered_at).getTime()<30*24*60*60*1000).length;
    if(recentTransfers>10)add("HIGH_TRANSFER_VELOCITY","MEDIUM","Alta rotación de propiedad",`Se registraron ${recentTransfers} transferencias en los últimos 30 días.`,20);
    const pending=tr.filter((t:any)=>t.status==="PENDING"&&new Date(t.expires_at).getTime()>now).length;
    if(pending)add("PENDING_TRANSFER","INFO","Transferencia pendiente",`Hay ${pending} oferta(s) de transferencia todavía pendientes. La propiedad aún no cambia.`);

    const pulseAnalysisComplete=totalPulses<=pu.length;
    let pulseChainValid=pulseAnalysisComplete;
    if(pulseAnalysisComplete){
      for(let i=0;i<pu.length;i++){
        const p:any=pu[i];
        const expectedPrev=i===0?ZERO:String((pu[i-1] as any).pulse_hash||"");
        if(String(p.prev_pulse_hash)!==expectedPrev){pulseChainValid=false;break}
        const expectedHash=await sha256([sealId,String(p.prev_pulse_hash),String(p.observed_ms),String(p.client_nonce),String(p.source)].join("|"));
        if(expectedHash!==String(p.pulse_hash)){pulseChainValid=false;break}
      }
    }
    const pulse24h=pu.filter((p:any)=>now-Number(p.observed_ms)<24*60*60*1000).length;
    const lastPulseAt=pu.length?String((pu[pu.length-1] as any).observed_at||""):"";
    if(totalPulses&&pulseAnalysisComplete&&pulseChainValid)add("PULSE_CHAIN_ACTIVE","INFO","EVO Pulse íntegro",`${totalPulses} observación(es) públicas forman una cadena íntegra. Esta señal es observacional, no autoritativa.`);
    if(totalPulses&&pulseAnalysisComplete&&!pulseChainValid)add("PULSE_CHAIN_BROKEN","HIGH","Cadena EVO Pulse inconsistente","La secuencia criptográfica pública no es íntegra. Requiere investigación.",50);
    if(!pulseAnalysisComplete)add("PULSE_ANALYSIS_TRUNCATED","INFO","Pulse extenso",`Hay ${totalPulses} Pulses; la verificación completa se omite en este análisis público para limitar costo.`);
    if(pulse24h>=20)add("HIGH_PUBLIC_OBSERVATION_ACTIVITY","INFO","Alta actividad pública",`Se observaron al menos ${pulse24h} Pulses recientes. No elevan autoridad ni confianza por sí solos.`);

    const challenge24h=ca.filter((a:any)=>now-new Date(a.attempted_at).getTime()<24*60*60*1000);
    const acceptedChallenges=ca.filter((a:any)=>a.attempt_type==="ACCEPTED").length;
    const replayAttempts=ca.filter((a:any)=>a.attempt_type==="REPLAY").length;
    const mismatchAttempts=ca.filter((a:any)=>a.attempt_type==="MISMATCH").length;
    const expiredAttempts=ca.filter((a:any)=>a.attempt_type==="EXPIRED").length;
    const replay24h=challenge24h.filter((a:any)=>a.attempt_type==="REPLAY").length;
    const mismatch24h=challenge24h.filter((a:any)=>a.attempt_type==="MISMATCH").length;
    if(acceptedChallenges)add("SOFTWARE_CHALLENGES_ACCEPTED","INFO","Software Challenge observado",`${acceptedChallenges} desafío(s) SOFTWARE_V0 fueron completados. Son anti-replay, pero no prueban identidad, autoridad ni presencia física.`);
    if(totalChallengeAttempts>MAX_CHALLENGE_ATTEMPTS)add("CHALLENGE_ANALYSIS_TRUNCATED","INFO","Auditoría Challenge extensa",`Guardian limitó el análisis a ${MAX_CHALLENGE_ATTEMPTS} intentos recientes.`);
    if(replay24h>0&&replay24h<3)add("REPLAY_ATTEMPT_OBSERVED","INFO","Intento de replay detectado",`Se detectaron ${replay24h} intento(s) de replay recientes. El servidor los rechazó.`);
    if(replay24h>=3&&replay24h<10)add("REPLAY_ACTIVITY","MEDIUM","Actividad de replay anómala",`Se detectaron ${replay24h} intentos de replay en 24 horas.`,15);
    if(replay24h>=10)add("REPLAY_ATTACK_PATTERN","HIGH","Patrón de replay severo",`Se detectaron ${replay24h} intentos de replay en 24 horas. Requiere investigación.`,35);
    if(mismatch24h>=3&&mismatch24h<10)add("CHALLENGE_MISMATCH_ACTIVITY","MEDIUM","Respuestas de desafío inválidas",`Se detectaron ${mismatch24h} respuestas incorrectas en 24 horas.`,15);
    if(mismatch24h>=10)add("CHALLENGE_TAMPER_PATTERN","HIGH","Patrón de respuestas inválidas",`Se detectaron ${mismatch24h} respuestas incorrectas en 24 horas.`,35);

    const providerCountersignedProofs=sp.filter((p:any)=>p.evidence_level==="PROVIDER_COUNTERSIGNED"&&p.provider_digest).length;
    const ownerSignedServiceProofs=sp.length;
    if(ownerSignedServiceProofs)add("SIGNED_SERVICE_PROOFS","INFO","Service Proof firmado",`${ownerSignedServiceProofs} Service Proof(s) activos contienen evidencia firmada por el propietario.`);
    if(providerCountersignedProofs)add("INDEPENDENT_COUNTERSIGNATURE","INFO","Contrafirma independiente",`${providerCountersignedProofs} Service Proof(s) tienen contrafirma del proveedor designado.`);
    if(totalServiceProofs>MAX_SERVICE_PROOFS)add("SERVICE_ANALYSIS_TRUNCATED","INFO","Service Proof extenso",`Guardian analizó ${MAX_SERVICE_PROOFS} de ${totalServiceProofs} registros.`);

    const ageMs=now-new Date(seal.registered_at||seal.created_at).getTime();
    if(ageMs<60*60*1000)add("VERY_NEW_SEAL","INFO","Sello reciente","El sello fue creado hace menos de una hora; todavía tiene poco historial.");
    if(!signals.some(s=>s.points>0))add("NO_ANOMALIES","INFO","Sin anomalías detectadas","Las reglas de Guardian no encontraron señales materiales de riesgo en los datos disponibles.");

    risk=Math.max(0,Math.min(100,risk));
    const riskLevel=risk>=50?"HIGH":risk>=20?"MEDIUM":"LOW";

    // Confidence measures quality of authoritative digital evidence, not truth.
    // Public Pulse and SOFTWARE_V0 Challenge intentionally contribute zero.
    let confidence=25;
    if(seal.asset_hash)confidence+=15;
    if(seal.serial)confidence+=5;
    if(ev.length)confidence+=Math.min(15,ev.length*3);
    if(ownerSignedServiceProofs)confidence+=Math.min(9,ownerSignedServiceProofs*3);
    if(providerCountersignedProofs)confidence+=Math.min(16,providerCountersignedProofs*8);
    if(ageMs>24*60*60*1000)confidence+=5;
    confidence=Math.min(85,confidence);

    let currentOwner=String(seal.issuer_wallet||"").toLowerCase();
    for(const e of ev as any[])if(e.event_type==="TRANSFERRED"&&e.new_owner_wallet)currentOwner=String(e.new_owner_wallet).toLowerCase();

    return json({
      ok:true,
      engine:"EVO AI Guardian V0.6",
      mode:"EXPLAINABLE_RISK + SIGNED_AUTHORITY + PUBLIC_TELEMETRY_AUDIT",
      sealId,
      verdict:riskLevel==="LOW"?"NO MATERIAL ANOMALIES DETECTED":riskLevel==="MEDIUM"?"REVIEW RECOMMENDED":"HIGH RISK — MANUAL REVIEW REQUIRED",
      riskScore:risk,
      riskLevel,
      evidenceConfidence:confidence,
      currentOwner,
      stats:{
        passportEvents:totalEvents+1,
        signedPassportEvents:totalEvents,
        transferEvents:totalTransfers,
        pendingTransferOffers:pending,
        duplicateAssetCount,duplicateSerialCount,
        serviceProofs:totalServiceProofs,
        ownerSignedServiceProofs,
        providerCountersignedProofs,
        pulsesTotal:totalPulses,pulses24h:pulse24h,lastPulseAt,
        pulseChainValid:pulseAnalysisComplete?pulseChainValid:null,
        pulseAnalysisComplete,
        acceptedChallenges,replayAttempts,mismatchAttempts,expiredAttempts,replay24h,mismatch24h,
      },
      authorityEvidence:{
        signedPassportEvents:totalEvents,
        ownerSignedServiceProofs,
        providerCountersignedProofs,
        publicPulseCount:totalPulses,
        softwareChallengesAccepted:acceptedChallenges,
        publicTelemetryAuthoritative:false,
        rule:"PUBLIC_TELEMETRY_NEVER_ELEVATES_AUTHORITY",
      },
      publicTelemetry:{
        pulses:totalPulses,
        pulseChainValid:pulseAnalysisComplete?pulseChainValid:null,
        softwareChallengesAccepted:acceptedChallenges,
        authority:"OBSERVATIONAL_ONLY",
      },
      signals,
      limitations:[
        "Guardian analiza evidencia digital; no certifica autenticidad física por sí solo.",
        "EVO Pulse es telemetría pública y no aumenta Evidence Confidence ni Authority Level.",
        "Challenge SOFTWARE_V0 usa datos públicos y no aumenta Evidence Confidence ni Authority Level.",
        "Evidence Confidence describe la calidad/independencia de la evidencia disponible, no la verdad material de una declaración.",
        "Un riesgo bajo significa que no se detectaron anomalías con las señales disponibles, no que el activo sea necesariamente auténtico."
      ],
      analyzedAt:new Date().toISOString()
    });
  }catch(err){console.error(err instanceof Error?err.name:"unknown");return json({error:"internal_error"},500)}
});
