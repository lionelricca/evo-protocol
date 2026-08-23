import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";
import { verifyMessage } from "npm:viem@2.21.54";
import { rejectUntrustedBrowserOrigin, restrictedPreflight, withRestrictedCors } from "../_shared/evo-cors.ts";

const MAX_BODY_BYTES=32768;
const walletRe=/^0x[0-9a-f]{40}$/;
const hex64=/^[0-9a-f]{64}$/;
const hex32=/^[0-9a-f]{32}$/;
const proofRe=/^EVS-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
const sealRe=/^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
const allowed=new Set(["INSPECTED","SERVICED","REPAIRED","COMMISSIONED","WARRANTY","COMPONENT_REPLACED","METER_READING","NOTE"]);
const meterKinds=new Set(["HOURS","ODOMETER_KM","CYCLES","OTHER"]);

function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}})}
function canonical(value:unknown):string{
  if(Array.isArray(value))return `[${value.map(canonical).join(",")}]`;
  if(value&&typeof value==="object"){
    const object=value as Record<string,unknown>;
    return `{${Object.keys(object).sort().map(key=>`${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value===undefined?null:value);
}
async function sha256(text:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function cleanText(value:unknown,max:number){return String(value||"").trim().slice(0,max)}

async function handle(req:Request){
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  try{
    const declaredLength=Number(req.headers.get("content-length")||"0");
    if(declaredLength>MAX_BODY_BYTES)return json({error:"payload_too_large"},413);
    const raw=await req.text();
    if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES)return json({error:"payload_too_large"},413);
    let body:Record<string,unknown>;try{body=JSON.parse(raw)}catch{return json({error:"invalid_json"},400)}
    const action=String(body?.action||"");
    const p=body?.payload as Record<string,unknown>;
    if(!p||typeof p!=="object"||Array.isArray(p))return json({error:"invalid_payload"},400);
    const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});

    if(action==="lookup"){
      const proofId=String(p.proofId||"").toUpperCase();
      if(!proofRe.test(proofId))return json({error:"invalid_proof_id"},400);
      const fields="proof_id,seal_id,version,service_type,owner_wallet,provider_wallet,provider_label,technician_label,performed_at,summary,meter,parts,next_service,evidence_digests,service_digest,created_at,registered_at,countersigned_at,evidence_level,status";
      const {data,error}=await supabase.from("evo_service_proofs").select(fields).eq("proof_id",proofId).eq("status","ACTIVE").maybeSingle();
      if(error)return json({error:"database_error"},500);
      if(!data)return json({error:"proof_not_found"},404);
      return json({ok:true,proof:data});
    }

    if(action==="create"){
      const required=["proofId","sealId","version","serviceType","ownerWallet","performedAt","summary","serviceDigest","ownerNonce","ownerSignature","ownerMessage","createdAt"];
      for(const key of required)if(!p[key])return json({error:`missing_${key}`},400);
      if(p.version!=="EVO-SERVICE-PROOF-V1")return json({error:"invalid_version"},400);
      const sealId=String(p.sealId||"").toUpperCase(),proofId=String(p.proofId||"").toUpperCase();
      if(!sealRe.test(sealId))return json({error:"invalid_seal_id"},400);
      if(!proofRe.test(proofId))return json({error:"invalid_proof_id"},400);
      const serviceType=String(p.serviceType||"");if(!allowed.has(serviceType))return json({error:"invalid_service_type"},400);
      const owner=String(p.ownerWallet||"").toLowerCase(),provider=String(p.providerWallet||"").toLowerCase();
      if(!walletRe.test(owner)||(provider&&!walletRe.test(provider)))return json({error:"invalid_wallet"},400);
      if(provider&&provider===owner)return json({error:"provider_must_differ_from_owner"},400);
      const serviceDigest=String(p.serviceDigest||"");const ownerNonce=String(p.ownerNonce||"");
      if(!hex64.test(serviceDigest)||!hex32.test(ownerNonce))return json({error:"invalid_hash"},400);
      const summary=cleanText(p.summary,4000);if(summary.length<3)return json({error:"invalid_summary"},400);
      const providerLabel=cleanText(p.providerLabel,160),technicianLabel=cleanText(p.technicianLabel,160);
      const createdAt=String(p.createdAt||""),performedAt=String(p.performedAt||"");
      const created=new Date(createdAt),performed=new Date(performedAt);
      if(Number.isNaN(created.getTime())||Number.isNaN(performed.getTime()))return json({error:"invalid_time"},400);
      if(Math.abs(Date.now()-created.getTime())>10*60*1000)return json({error:"stale_or_future_timestamp"},400);

      const meter=p.meter&&typeof p.meter==="object"&&!Array.isArray(p.meter)?p.meter as Record<string,unknown>:{};
      if(Object.keys(meter).length){
        if(!meterKinds.has(String(meter.kind||"")))return json({error:"invalid_meter_kind"},400);
        const meterValue=Number(meter.value);if(!Number.isFinite(meterValue)||meterValue<0)return json({error:"invalid_meter_value"},400);
        if(String(meter.unit||"").length>32)return json({error:"invalid_meter_unit"},400);
      }
      const parts=Array.isArray(p.parts)?p.parts:[];
      if(parts.length>100)return json({error:"too_many_parts"},400);
      for(const part of parts){
        if(!part||typeof part!=="object")return json({error:"invalid_part"},400);
        const item=part as Record<string,unknown>;
        if(!cleanText(item.name,200))return json({error:"invalid_part_name"},400);
        if(String(item.partNumber||"").length>120)return json({error:"invalid_part_number"},400);
        if(item.quantity!==undefined&&(!Number.isFinite(Number(item.quantity))||Number(item.quantity)<0))return json({error:"invalid_part_quantity"},400);
      }
      const nextService=p.nextService&&typeof p.nextService==="object"&&!Array.isArray(p.nextService)?p.nextService as Record<string,unknown>:{};
      if(nextService.dueAt&&Number.isNaN(new Date(String(nextService.dueAt)).getTime()))return json({error:"invalid_next_service_date"},400);
      if(nextService.dueMeterValue!==undefined&&(!Number.isFinite(Number(nextService.dueMeterValue))||Number(nextService.dueMeterValue)<0))return json({error:"invalid_next_service_meter"},400);
      const evidenceDigests=Array.isArray(p.evidenceDigests)?p.evidenceDigests.map(value=>String(value).toLowerCase()):[];
      if(evidenceDigests.length>30||evidenceDigests.some(hash=>!hex64.test(hash)))return json({error:"invalid_evidence"},400);

      const expectedDigest=await sha256([sealId,serviceType,owner,provider,performedAt,summary,canonical(meter),canonical(parts),canonical(nextService),canonical(evidenceDigests),createdAt,ownerNonce].join("|"));
      if(expectedDigest!==serviceDigest)return json({error:"service_digest_mismatch"},400);
      const expectedId=`EVS-${serviceDigest.slice(0,8).toUpperCase()}-${serviceDigest.slice(8,16).toUpperCase()}-${serviceDigest.slice(16,24).toUpperCase()}`;
      if(expectedId!==proofId)return json({error:"proof_id_mismatch"},400);
      const expectedMessage=`EVO SERVICE PROOF V1\nProof ID: ${proofId}\nSeal ID: ${sealId}\nType: ${serviceType}\nOwner: ${owner}\nProvider: ${provider||"N/A"}\nDigest: ${serviceDigest}\nCreated: ${createdAt}`;
      if(p.ownerMessage!==expectedMessage)return json({error:"signature_message_mismatch"},400);
      const ownerSignature=String(p.ownerSignature||"");
      if(ownerSignature.length<1||ownerSignature.length>512||expectedMessage.length>2048)return json({error:"invalid_signature_evidence"},400);
      const valid=await verifyMessage({address:owner as `0x${string}`,message:expectedMessage,signature:ownerSignature as `0x${string}`});
      if(!valid)return json({error:"invalid_signature"},401);

      const row={
        proof_id:proofId,seal_id:sealId,version:"EVO-SERVICE-PROOF-V1",service_type:serviceType,
        owner_wallet:owner,provider_wallet:provider,provider_label:providerLabel,technician_label:technicianLabel,
        performed_at:performedAt,summary,meter,parts,next_service:nextService,evidence_digests:evidenceDigests,
        service_digest:serviceDigest,owner_nonce:ownerNonce,owner_signature:ownerSignature,owner_message:expectedMessage,
        created_at:createdAt
      };
      const {data,error}=await supabase.rpc("evo_register_service_proof_authoritative",{p_row:row}).single();
      if(error){
        const message=String(error.message||"");
        if(message.includes("actor_is_not_current_owner"))return json({error:"actor_is_not_current_owner"},403);
        if(message.includes("seal_not_found"))return json({error:"seal_not_found"},404);
        if(message.includes("proof_id_conflict"))return json({error:"proof_id_conflict"},409);
        if(message.includes("provider_must_differ_from_owner"))return json({error:"provider_must_differ_from_owner"},409);
        if(String(error.code||"")==="23505")return json({error:"proof_already_exists"},409);
        console.error(error.code||"service_proof_rpc_error");return json({error:"database_error"},500);
      }
      return json({
        ok:true,
        proof:{proof_id:data.proof_id,seal_id:data.seal_id,evidence_level:data.evidence_level,registered_at:data.registered_at,status:data.status},
        currentOwner:data.current_owner,
        idempotent:Boolean(data.idempotent),
        atomicAuthority:true
      },data.idempotent?200:201);
    }

    if(action==="countersign"){
      const required=["proofId","actorWallet","createdAt","nonce","providerDigest","signature","signatureMessage"];
      for(const key of required)if(!p[key])return json({error:`missing_${key}`},400);
      const proofId=String(p.proofId||"").toUpperCase(),actor=String(p.actorWallet||"").toLowerCase();
      if(!proofRe.test(proofId)||!walletRe.test(actor)||!hex32.test(String(p.nonce))||!hex64.test(String(p.providerDigest)))return json({error:"invalid_countersignature"},400);
      const {data:proof,error:proofError}=await supabase.from("evo_service_proofs").select("*").eq("proof_id",proofId).eq("status","ACTIVE").single();
      if(proofError||!proof)return json({error:"proof_not_found"},404);
      if(!proof.provider_wallet)return json({error:"provider_not_designated"},409);
      if(String(proof.provider_wallet).toLowerCase()===String(proof.owner_wallet).toLowerCase())return json({error:"invalid_provider_relation"},409);
      if(actor!==String(proof.provider_wallet).toLowerCase())return json({error:"only_designated_provider_can_countersign"},403);
      const createdAt=String(p.createdAt||"");const created=new Date(createdAt);
      if(Number.isNaN(created.getTime())||Math.abs(Date.now()-created.getTime())>10*60*1000)return json({error:"stale_or_future_timestamp"},400);
      const providerDigest=String(p.providerDigest||"");
      const expectedDigest=await sha256([proof.proof_id,proof.seal_id,proof.owner_wallet,proof.provider_wallet,proof.service_digest,createdAt,p.nonce].join("|"));
      if(expectedDigest!==providerDigest)return json({error:"provider_digest_mismatch"},400);
      const expectedMessage=`EVO SERVICE PROOF COUNTERSIGN V1\nProof ID: ${proof.proof_id}\nSeal ID: ${proof.seal_id}\nOwner: ${proof.owner_wallet}\nProvider: ${proof.provider_wallet}\nService digest: ${proof.service_digest}\nProvider digest: ${providerDigest}\nCountersigned: ${createdAt}`;
      if(p.signatureMessage!==expectedMessage)return json({error:"signature_message_mismatch"},400);
      const signature=String(p.signature||"");
      if(signature.length<1||signature.length>512||expectedMessage.length>2048)return json({error:"invalid_signature_evidence"},400);
      const valid=await verifyMessage({address:actor as `0x${string}`,message:expectedMessage,signature:signature as `0x${string}`});
      if(!valid)return json({error:"invalid_signature"},401);

      const row={proof_id:proof.proof_id,actor_wallet:actor,provider_digest:providerDigest,provider_nonce:String(p.nonce).toLowerCase(),provider_signature:signature,provider_message:expectedMessage,countersigned_at:createdAt};
      const {data,error}=await supabase.rpc("evo_countersign_service_proof_authoritative",{p_row:row}).single();
      if(error){
        const message=String(error.message||"");
        if(message.includes("proof_not_found"))return json({error:"proof_not_found"},404);
        if(message.includes("provider_not_designated"))return json({error:"provider_not_designated"},409);
        if(message.includes("invalid_provider_relation"))return json({error:"invalid_provider_relation"},409);
        if(message.includes("only_designated_provider_can_countersign"))return json({error:"only_designated_provider_can_countersign"},403);
        if(message.includes("already_countersigned"))return json({error:"already_countersigned"},409);
        console.error(error.code||"service_countersign_rpc_error");return json({error:"database_error"},500);
      }
      return json({ok:true,proof:{proof_id:data.proof_id,seal_id:data.seal_id,evidence_level:data.evidence_level,countersigned_at:data.countersigned_at},idempotent:Boolean(data.idempotent),atomicAuthority:true},200);
    }

    return json({error:"invalid_action"},400);
  }catch(err){console.error(err instanceof Error?err.name:"unknown");return json({error:"internal_error"},500)}
}

Deno.serve(async(req:Request)=>{
  const preflight=restrictedPreflight(req);
  if(preflight)return preflight;
  const denied=rejectUntrustedBrowserOrigin(req);
  if(denied)return denied;
  return withRestrictedCors(req,await handle(req));
});
