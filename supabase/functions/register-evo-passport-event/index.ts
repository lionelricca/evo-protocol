import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";
import { verifyMessage } from "npm:viem@2.21.54";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
};
const MAX_BODY_BYTES=8192;
const walletRe=/^0x[0-9a-fA-F]{40}$/;
const hex64=/^[0-9a-f]{64}$/;
const hex32=/^[0-9a-f]{32}$/;
const sealRe=/^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
const eventRe=/^EVP-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
const allowed=new Set(["SOLD","REPAIRED","WARRANTY","INSPECTED","NOTE"]);
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}})}
async function sha256(text:string){const bytes=new TextEncoder().encode(text);const digest=await crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("")}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  try{
    const raw=await req.text();
    if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES)return json({error:"payload_too_large"},413);
    let body:Record<string,unknown>;
    try{body=JSON.parse(raw||"{}")}catch{return json({error:"invalid_json"},400)}
    const event=body?.event&&typeof body.event==="object"&&!Array.isArray(body.event)?body.event as Record<string,unknown>:null;
    if(!event)return json({error:"invalid_payload"},400);

    const required=["eventId","sealId","version","eventType","actorWallet","eventDigest","nonce","signature","signatureMessage","createdAt"];
    for(const key of required)if(!event[key])return json({error:`missing_${key}`},400);
    if(event.eventType==="TRANSFERRED")return json({error:"two_party_transfer_required"},409);
    if(event.version!=="EVO-PASSPORT-V1")return json({error:"invalid_version"},400);

    const sealId=String(event.sealId||"").toUpperCase();
    const eventId=String(event.eventId||"").toUpperCase();
    const eventType=String(event.eventType||"");
    const actor=String(event.actorWallet||"").toLowerCase();
    const digest=String(event.eventDigest||"").toLowerCase();
    const nonce=String(event.nonce||"").toLowerCase();
    const note=String(event.note||"").trim();
    const createdAt=String(event.createdAt||"");
    if(!sealRe.test(sealId)||!eventRe.test(eventId))return json({error:"invalid_id"},400);
    if(!allowed.has(eventType))return json({error:"invalid_event_type"},400);
    if(!walletRe.test(actor))return json({error:"invalid_actor_wallet"},400);
    if(event.newOwnerWallet)return json({error:"new_owner_only_via_two_party_transfer"},400);
    if(!hex64.test(digest)||!hex32.test(nonce))return json({error:"invalid_hash"},400);
    if(note.length<1||note.length>1000)return json({error:"invalid_note"},400);
    const created=new Date(createdAt);
    if(Number.isNaN(created.getTime())||Math.abs(Date.now()-created.getTime())>10*60*1000)return json({error:"stale_or_future_timestamp"},400);

    const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
    const {data:seal,error:sealError}=await supabase.from("evo_seals").select("seal_id,issuer_wallet,status").eq("seal_id",sealId).eq("status","ACTIVE").single();
    if(sealError||!seal)return json({error:"seal_not_found"},404);
    const {data:transfers,error:transferError}=await supabase.from("evo_passport_events").select("new_owner_wallet,registered_at").eq("seal_id",sealId).eq("event_type","TRANSFERRED").eq("status","ACTIVE").order("registered_at",{ascending:false}).limit(1);
    if(transferError)return json({error:"database_error"},500);
    const currentOwner=String(transfers?.[0]?.new_owner_wallet||seal.issuer_wallet).toLowerCase();
    if(actor!==currentOwner)return json({error:"actor_is_not_current_owner",currentOwner},403);

    const expectedDigest=await sha256([sealId,eventType,actor,"",note,createdAt,nonce].join("|"));
    if(expectedDigest!==digest)return json({error:"event_digest_mismatch"},400);
    const expectedEventId=`EVP-${digest.slice(0,8).toUpperCase()}-${digest.slice(8,16).toUpperCase()}-${digest.slice(16,24).toUpperCase()}`;
    if(expectedEventId!==eventId)return json({error:"event_id_mismatch"},400);
    const expectedMessage=`EVO PASSPORT V1\nEvent ID: ${eventId}\nSeal ID: ${sealId}\nType: ${eventType}\nActor: ${actor}\nNew owner: N/A\nDigest: ${digest}\nCreated: ${createdAt}`;
    if(event.signatureMessage!==expectedMessage)return json({error:"signature_message_mismatch"},400);
    const valid=await verifyMessage({address:actor as `0x${string}`,message:expectedMessage,signature:event.signature as `0x${string}`});
    if(!valid)return json({error:"invalid_signature"},401);

    const row={event_id:eventId,seal_id:sealId,version:event.version,event_type:eventType,actor_wallet:actor,new_owner_wallet:"",note,event_digest:digest,nonce,signature:event.signature,signature_message:event.signatureMessage,created_at:createdAt,status:"ACTIVE"};
    const {data,error}=await supabase.from("evo_passport_events").insert(row).select("event_id,seal_id,event_type,registered_at,status").single();
    if(error){if(error.code==="23505")return json({error:"event_already_exists"},409);console.error(error.code);return json({error:"database_error"},500)}
    return json({ok:true,event:data,currentOwner,authority:"OWNER_SIGNED",authoritative:true},201);
  }catch(err){console.error(err instanceof Error?err.name:"unknown");return json({error:"internal_error"},500)}
});
