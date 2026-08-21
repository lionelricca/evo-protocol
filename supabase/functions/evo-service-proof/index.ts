import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";
import { verifyMessage } from "npm:viem@2.21.54";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const walletRe=/^0x[0-9a-f]{40}$/;const hex64=/^[0-9a-f]{64}$/;const hex32=/^[0-9a-f]{32}$/;
const allowed=new Set(["INSPECTED","SERVICED","REPAIRED","COMMISSIONED","WARRANTY","COMPONENT_REPLACED","METER_READING","NOTE"]);
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json"}})}
async function sha256(text:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  try{
    const raw=await req.text();if(new TextEncoder().encode(raw).byteLength>32768)return json({error:"payload_too_large"},413);
    let body;try{body=JSON.parse(raw)}catch{return json({error:"invalid_json"},400)}
    const action=String(body?.action||"");const p=body?.payload;if(!p||typeof p!=="object")return json({error:"invalid_payload"},400);
    const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});

    async function currentOwner(sealId:string){
      const {data:seal,error}=await supabase.from("evo_seals").select("seal_id,issuer_wallet,status").eq("seal_id",sealId).eq("status","ACTIVE").single();
      if(error||!seal)throw new Error("seal_not_found");
      const {data:events,error:eventError}=await supabase.from("evo_passport_events").select("new_owner_wallet,registered_at").eq("seal_id",sealId).eq("event_type","TRANSFERRED").eq("status","ACTIVE").order("registered_at",{ascending:false}).limit(1);
      if(eventError)throw new Error("database_error");
      return String(events?.[0]?.new_owner_wallet||seal.issuer_wallet).toLowerCase();
    }

    if(action==="lookup"){
      const proofId=String(p.proofId||"").toUpperCase();
      if(!/^EVS-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/.test(proofId))return json({error:"invalid_proof_id"},400);
      const fields="proof_id,seal_id,version,service_type,owner_wallet,provider_wallet,provider_label,technician_label,performed_at,summary,meter,parts,next_service,evidence_digests,service_digest,created_at,registered_at,countersigned_at,evidence_level,status";
      const {data,error}=await supabase.from("evo_service_proofs").select(fields).eq("proof_id",proofId).eq("status","ACTIVE").maybeSingle();
      if(error)return json({error:"database_error"},500);if(!data)return json({error:"proof_not_found"},404);return json({ok:true,proof:data});
    }

    if(action==="create"){
      const required=["proofId","sealId","version","serviceType","ownerWallet","performedAt","summary","serviceDigest","ownerNonce","ownerSignature","ownerMessage","createdAt"];
      for(const key of required)if(!p[key])return json({error:`missing_${key}`},400);
      if(p.version!=="EVO-SERVICE-PROOF-V1")return json({error:"invalid_version"},400);
      if(!/^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/.test(p.sealId))return json({error:"invalid_seal_id"},400);
      if(!/^EVS-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/.test(p.proofId))return json({error:"invalid_proof_id"},400);
      if(!allowed.has(String(p.serviceType)))return json({error:"invalid_service_type"},400);
      const owner=String(p.ownerWallet).toLowerCase(),provider=String(p.providerWallet||"").toLowerCase();
      if(!walletRe.test(owner)||(provider&&!walletRe.test(provider)))return json({error:"invalid_wallet"},400);
      if(!hex64.test(String(p.serviceDigest))||!hex32.test(String(p.ownerNonce)))return json({error:"invalid_hash"},400);
      if(String(p.summary||"").trim().length<3||String(p.summary).length>4000)return json({error:"invalid_summary"},400);
      if(String(p.providerLabel||"").length>160||String(p.technicianLabel||"").length>160)return json({error:"label_too_long"},400);
      const created=new Date(p.createdAt),performed=new Date(p.performedAt);if(Number.isNaN(created.getTime())||Number.isNaN(performed.getTime()))return json({error:"invalid_time"},400);
      if(Math.abs(Date.now()-created.getTime())>10*60*1000)return json({error:"stale_or_future_timestamp"},400);
      const actualOwner=await currentOwner(p.sealId);if(actualOwner!==owner)return json({error:"actor_is_not_current_owner",currentOwner:actualOwner},403);

      const meter=p.meter&&typeof p.meter==="object"?p.meter:{};const parts=Array.isArray(p.parts)?p.parts:[];const nextService=p.nextService&&typeof p.nextService==="object"?p.nextService:{};const evidenceDigests=Array.isArray(p.evidenceDigests)?p.evidenceDigests:[];
      if(parts.length>100||evidenceDigests.length>30||evidenceDigests.some((h:string)=>!hex64.test(String(h))))return json({error:"invalid_evidence"},400);
      const expectedDigest=await sha256([p.sealId,p.serviceType,owner,provider,p.performedAt,String(p.summary).trim(),JSON.stringify(meter),JSON.stringify(parts),JSON.stringify(nextService),JSON.stringify(evidenceDigests),p.createdAt,p.ownerNonce].join("|"));
      if(expectedDigest!==p.serviceDigest)return json({error:"service_digest_mismatch"},400);
      const expectedId=`EVS-${p.serviceDigest.slice(0,8).toUpperCase()}-${p.serviceDigest.slice(8,16).toUpperCase()}-${p.serviceDigest.slice(16,24).toUpperCase()}`;if(expectedId!==p.proofId)return json({error:"proof_id_mismatch"},400);
      const expectedMessage=`EVO SERVICE PROOF V1\nProof ID: ${p.proofId}\nSeal ID: ${p.sealId}\nType: ${p.serviceType}\nOwner: ${owner}\nProvider: ${provider||"N/A"}\nDigest: ${p.serviceDigest}\nCreated: ${p.createdAt}`;
      if(p.ownerMessage!==expectedMessage)return json({error:"signature_message_mismatch"},400);
      const valid=await verifyMessage({address:owner as `0x${string}`,message:expectedMessage,signature:p.ownerSignature as `0x${string}`});if(!valid)return json({error:"invalid_signature"},401);
      const row={proof_id:p.proofId,seal_id:p.sealId,version:p.version,service_type:p.serviceType,owner_wallet:owner,provider_wallet:provider,provider_label:String(p.providerLabel||"").trim(),technician_label:String(p.technicianLabel||"").trim(),performed_at:p.performedAt,summary:String(p.summary).trim(),meter,parts,next_service:nextService,evidence_digests:evidenceDigests,service_digest:p.serviceDigest,owner_nonce:p.ownerNonce,owner_signature:p.ownerSignature,owner_message:p.ownerMessage,created_at:p.createdAt,evidence_level:"OWNER_DECLARED",status:"ACTIVE"};
      const {data,error}=await supabase.from("evo_service_proofs").insert(row).select("proof_id,seal_id,service_type,provider_wallet,evidence_level,registered_at,status").single();
      if(error){if(error.code==="23505")return json({error:"proof_already_exists"},409);console.error(error);return json({error:"database_error"},500)}return json({ok:true,proof:data},201);
    }

    if(action==="countersign"){
      const required=["proofId","actorWallet","createdAt","nonce","providerDigest","signature","signatureMessage"];for(const key of required)if(!p[key])return json({error:`missing_${key}`},400);
      const actor=String(p.actorWallet).toLowerCase();if(!walletRe.test(actor)||!hex32.test(String(p.nonce))||!hex64.test(String(p.providerDigest)))return json({error:"invalid_countersignature"},400);
      const {data:proof,error:proofError}=await supabase.from("evo_service_proofs").select("*").eq("proof_id",String(p.proofId).toUpperCase()).eq("status","ACTIVE").single();
      if(proofError||!proof)return json({error:"proof_not_found"},404);if(proof.evidence_level!=="OWNER_DECLARED")return json({error:"already_countersigned"},409);
      if(!proof.provider_wallet)return json({error:"provider_not_designated"},409);if(actor!==String(proof.provider_wallet).toLowerCase())return json({error:"only_designated_provider_can_countersign"},403);
      const created=new Date(p.createdAt);if(Number.isNaN(created.getTime())||Math.abs(Date.now()-created.getTime())>10*60*1000)return json({error:"stale_or_future_timestamp"},400);
      const expectedDigest=await sha256([proof.proof_id,proof.seal_id,proof.owner_wallet,proof.provider_wallet,proof.service_digest,p.createdAt,p.nonce].join("|"));if(expectedDigest!==p.providerDigest)return json({error:"provider_digest_mismatch"},400);
      const expectedMessage=`EVO SERVICE PROOF COUNTERSIGN V1\nProof ID: ${proof.proof_id}\nSeal ID: ${proof.seal_id}\nOwner: ${proof.owner_wallet}\nProvider: ${proof.provider_wallet}\nService digest: ${proof.service_digest}\nProvider digest: ${p.providerDigest}\nCountersigned: ${p.createdAt}`;
      if(p.signatureMessage!==expectedMessage)return json({error:"signature_message_mismatch"},400);
      const valid=await verifyMessage({address:actor as `0x${string}`,message:expectedMessage,signature:p.signature as `0x${string}`});if(!valid)return json({error:"invalid_signature"},401);
      const {data,error}=await supabase.from("evo_service_proofs").update({provider_digest:p.providerDigest,provider_nonce:p.nonce,provider_signature:p.signature,provider_message:p.signatureMessage,countersigned_at:p.createdAt,evidence_level:"PROVIDER_COUNTERSIGNED"}).eq("proof_id",proof.proof_id).eq("evidence_level","OWNER_DECLARED").select("proof_id,seal_id,evidence_level,countersigned_at").single();if(error)return json({error:"database_error"},500);return json({ok:true,proof:data},200);
    }

    return json({error:"invalid_action"},400);
  }catch(err){console.error(err);return json({error:err instanceof Error?err.message:"internal_error"},500)}
});
