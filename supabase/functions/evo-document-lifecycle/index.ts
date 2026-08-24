import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";
import { verifyMessage } from "npm:viem@2.21.54";
import { rejectUntrustedBrowserOrigin, restrictedPreflight, withRestrictedCors } from "../_shared/evo-cors.ts";

const MAX_BODY_BYTES=16_384;
const walletRe=/^0x[0-9a-f]{40}$/;
const sealRe=/^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
const eventRe=/^EVD-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
const hex64=/^[0-9a-f]{64}$/;
const hex32=/^[0-9a-f]{32}$/;
const allowed=new Set(["DOCUMENT_REVOKED","DOCUMENT_SUPERSEDED","DOCUMENT_NOTE"]);

function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}})}
async function sha256(text:string){const bytes=new TextEncoder().encode(text);const digest=await crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("")}

async function handle(req:Request){
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  try{
    const declaredLength=Number(req.headers.get("content-length")||"0");
    if(declaredLength>MAX_BODY_BYTES)return json({error:"payload_too_large"},413);
    const raw=await req.text();
    if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES)return json({error:"payload_too_large"},413);
    let body:Record<string,unknown>;
    try{body=JSON.parse(raw||"{}")}catch{return json({error:"invalid_json"},400)}
    const event=body?.event&&typeof body.event==="object"&&!Array.isArray(body.event)?body.event as Record<string,unknown>:null;
    if(!event)return json({error:"invalid_payload"},400);

    const required=["eventId","sealId","version","eventType","actorWallet","eventDigest","nonce","signature","signatureMessage","createdAt"];
    for(const key of required)if(!event[key])return json({error:`missing_${key}`},400);
    if(event.version!=="EVO-DOCUMENT-LIFECYCLE-V1")return json({error:"invalid_version"},400);

    const eventId=String(event.eventId||"").toUpperCase();
    const sealId=String(event.sealId||"").toUpperCase();
    const eventType=String(event.eventType||"").toUpperCase();
    const actor=String(event.actorWallet||"").toLowerCase();
    const relatedSealId=String(event.relatedSealId||"").trim().toUpperCase();
    const reason=String(event.reason||"").trim();
    const digest=String(event.eventDigest||"").toLowerCase();
    const nonce=String(event.nonce||"").toLowerCase();
    const signature=String(event.signature||"");
    const signatureMessage=String(event.signatureMessage||"");
    const createdAt=String(event.createdAt||"");

    if(!eventRe.test(eventId)||!sealRe.test(sealId))return json({error:"invalid_id"},400);
    if(!allowed.has(eventType))return json({error:"invalid_event_type"},400);
    if(!walletRe.test(actor))return json({error:"invalid_actor_wallet"},400);
    if(!hex64.test(digest)||!hex32.test(nonce))return json({error:"invalid_hash"},400);
    if(reason.length>1200)return json({error:"reason_too_long"},400);
    if(eventType!=="DOCUMENT_NOTE"&&reason.length<3)return json({error:"reason_required"},400);
    if(signature.length<1||signature.length>512||signatureMessage.length<1||signatureMessage.length>2048)return json({error:"invalid_signature_evidence"},400);
    if(eventType==="DOCUMENT_SUPERSEDED"){
      if(!sealRe.test(relatedSealId))return json({error:"related_seal_required"},400);
      if(relatedSealId===sealId)return json({error:"cannot_supersede_with_self"},400);
    }else if(relatedSealId)return json({error:"related_seal_only_for_supersede"},400);
    const created=new Date(createdAt);
    if(Number.isNaN(created.getTime())||Math.abs(Date.now()-created.getTime())>10*60*1000)return json({error:"stale_or_future_timestamp"},400);

    const expectedDigest=await sha256([sealId,eventType,actor,relatedSealId,reason,createdAt,nonce].join("|"));
    if(expectedDigest!==digest)return json({error:"event_digest_mismatch"},400);
    const expectedEventId=`EVD-${digest.slice(0,8).toUpperCase()}-${digest.slice(8,16).toUpperCase()}-${digest.slice(16,24).toUpperCase()}`;
    if(expectedEventId!==eventId)return json({error:"event_id_mismatch"},400);
    const expectedMessage=`EVO DOCUMENT LIFECYCLE V1\nEvent ID: ${eventId}\nSeal ID: ${sealId}\nType: ${eventType}\nActor: ${actor}\nRelated seal: ${relatedSealId||"N/A"}\nDigest: ${digest}\nCreated: ${createdAt}`;
    if(signatureMessage!==expectedMessage)return json({error:"signature_message_mismatch"},400);
    const valid=await verifyMessage({address:actor as `0x${string}`,message:expectedMessage,signature:signature as `0x${string}`});
    if(!valid)return json({error:"invalid_signature"},401);

    const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
    const row={event_id:eventId,seal_id:sealId,version:"EVO-DOCUMENT-LIFECYCLE-V1",event_type:eventType,actor_wallet:actor,related_seal_id:relatedSealId,reason,event_digest:digest,nonce,signature,signature_message:expectedMessage,created_at:createdAt,status:"ACTIVE"};
    const {data,error}=await db.rpc("evo_register_document_lifecycle_authoritative",{p_row:row}).single();
    if(error){
      const m=String(error.message||"");
      if(m.includes("seal_not_found"))return json({error:"seal_not_found"},404);
      if(m.includes("not_a_document_proof"))return json({error:"not_a_document_proof"},409);
      if(m.includes("issuer_signature_required"))return json({error:"issuer_signature_required"},403);
      if(m.includes("replacement_not_found"))return json({error:"replacement_not_found"},404);
      if(m.includes("replacement_not_document"))return json({error:"replacement_not_document"},409);
      if(m.includes("replacement_issuer_mismatch"))return json({error:"replacement_issuer_mismatch"},409);
      if(m.includes("replacement_is_not_current"))return json({error:"replacement_is_not_current"},409);
      if(m.includes("document_lifecycle_already_terminal"))return json({error:"document_lifecycle_already_terminal"},409);
      if(m.includes("event_id_conflict"))return json({error:"event_id_conflict"},409);
      if(String(error.code||"")==="23505")return json({error:"document_lifecycle_conflict"},409);
      console.error(error.code||"document_lifecycle_rpc_error");return json({error:"database_error"},500);
    }
    return json({ok:true,event:{event_id:data.eventId,seal_id:data.sealId,event_type:data.eventType,related_seal_id:data.relatedSealId,registered_at:data.registeredAt,status:data.status},idempotent:Boolean(data.idempotent),atomicAuthority:true},201);
  }catch(err){console.error(err instanceof Error?err.name:"unknown");return json({error:"internal_error"},500)}
}

Deno.serve(async(req:Request)=>{
  const preflight=restrictedPreflight(req);
  if(preflight)return preflight;
  const denied=rejectUntrustedBrowserOrigin(req);
  if(denied)return denied;
  return withRestrictedCors(req,await handle(req));
});
