import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";
import { verifyMessage } from "npm:viem@2.21.54";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
};
const MAX_BODY_BYTES=16384;
const walletRe=/^0x[0-9a-fA-F]{40}$/;
const hex64=/^[0-9a-f]{64}$/;
const hex32=/^[0-9a-f]{32}$/;
const sealRe=/^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
const offerRe=/^EVX-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
const actions=new Set(["inbox","lookup","offer","accept","cancel"]);
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}})}
async function sha256(text:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function signatureBounds(signature:unknown,message:unknown){const s=String(signature||""),m=String(message||"");return s.length>=1&&s.length<=512&&m.length>=1&&m.length<=2048}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  try{
    const declaredLength=Number(req.headers.get("content-length")||"0");
    if(declaredLength>MAX_BODY_BYTES)return json({error:"payload_too_large"},413);
    const raw=await req.text();
    if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES)return json({error:"payload_too_large"},413);
    let body:Record<string,any>;
    try{body=JSON.parse(raw||"{}")}catch{return json({error:"invalid_json"},400)}
    const action=String(body?.action||"").toLowerCase();
    if(!actions.has(action))return json({error:"invalid_action"},400);
    const p=body?.payload;
    if(!p||typeof p!=="object"||Array.isArray(p))return json({error:"invalid_payload"},400);
    const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});

    if(action==="inbox"){
      const required=["wallet","origin","issuedAt","expiresAt","nonce","signature","signatureMessage"];
      for(const k of required)if(!p[k])return json({error:`missing_${k}`},400);
      const wallet=String(p.wallet).toLowerCase();
      if(!walletRe.test(wallet)||!hex32.test(String(p.nonce)))return json({error:"invalid_inbox_request"},400);
      if(!signatureBounds(p.signature,p.signatureMessage))return json({error:"invalid_signature_evidence"},400);
      const origin=String(p.origin);if(origin.length<1||origin.length>240)return json({error:"invalid_origin"},400);
      const requestOrigin=String(req.headers.get("origin")||"");
      if(requestOrigin&&requestOrigin!==origin)return json({error:"origin_mismatch"},403);
      const issued=new Date(p.issuedAt),expires=new Date(p.expiresAt);
      if(Number.isNaN(issued.getTime())||Number.isNaN(expires.getTime()))return json({error:"invalid_time"},400);
      const now=Date.now(),ttl=expires.getTime()-issued.getTime();
      if(ttl<30_000||ttl>5*60_000)return json({error:"invalid_expiry"},400);
      if(issued.getTime()>now+60_000||now-issued.getTime()>5*60_000||expires.getTime()<=now)return json({error:"expired_or_future_request"},401);
      const expectedMessage=`EVO TRANSFER INBOX V1\nWallet: ${wallet}\nOrigin: ${origin}\nNonce: ${p.nonce}\nIssued: ${p.issuedAt}\nExpires: ${p.expiresAt}`;
      if(p.signatureMessage!==expectedMessage)return json({error:"signature_message_mismatch"},400);
      const valid=await verifyMessage({address:wallet as `0x${string}`,message:expectedMessage,signature:String(p.signature) as `0x${string}`});
      if(!valid)return json({error:"invalid_signature"},401);
      await supabase.from("evo_passport_transfers").update({status:"EXPIRED"}).eq("to_wallet",wallet).eq("status","PENDING").lte("expires_at",new Date().toISOString());
      const fields="offer_id,seal_id,from_wallet,to_wallet,offer_digest,created_at,expires_at,status";
      const {data,error}=await supabase.from("evo_passport_transfers").select(fields).eq("to_wallet",wallet).eq("status","PENDING").gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(50);
      if(error){console.error(error.code||"inbox_database_error");return json({error:"database_error"},500)}
      return json({ok:true,wallet,offers:data||[]});
    }

    if(action==="lookup"){
      const offerId=String(p.offerId||"").toUpperCase();
      if(!offerRe.test(offerId))return json({error:"invalid_offer_id"},400);
      const fields="offer_id,seal_id,from_wallet,to_wallet,offer_digest,created_at,expires_at,status,accepted_at,registered_at";
      const {data:o,error}=await supabase.from("evo_passport_transfers").select(fields).eq("offer_id",offerId).maybeSingle();
      if(error){console.error(error.code||"lookup_database_error");return json({error:"database_error"},500)}
      if(!o)return json({error:"offer_not_found"},404);
      if(o.status==="PENDING"&&new Date(o.expires_at).getTime()<=Date.now()){
        const {data:expired,error:expiryError}=await supabase.from("evo_passport_transfers").update({status:"EXPIRED"}).eq("offer_id",offerId).eq("status","PENDING").select(fields).single();
        if(expiryError){console.error(expiryError.code||"expiry_database_error");return json({error:"database_error"},500)}
        return json({ok:true,offer:expired});
      }
      return json({ok:true,offer:o});
    }

    if(action==="offer"){
      const required=["sealId","fromWallet","toWallet","createdAt","expiresAt","nonce","offerDigest","offerId","signature","signatureMessage"];
      for(const k of required)if(!p[k])return json({error:`missing_${k}`},400);
      const sealId=String(p.sealId||"").toUpperCase(),offerId=String(p.offerId||"").toUpperCase();
      if(!sealRe.test(sealId)||!offerRe.test(offerId))return json({error:"invalid_id"},400);
      const from=String(p.fromWallet||"").toLowerCase(),to=String(p.toWallet||"").toLowerCase();
      if(!walletRe.test(from)||!walletRe.test(to))return json({error:"invalid_wallet"},400);
      if(from===to)return json({error:"same_wallet"},400);
      if(!hex32.test(String(p.nonce))||!hex64.test(String(p.offerDigest)))return json({error:"invalid_hash"},400);
      if(!signatureBounds(p.signature,p.signatureMessage))return json({error:"invalid_signature_evidence"},400);
      const created=new Date(p.createdAt),expires=new Date(p.expiresAt);
      if(Number.isNaN(created.getTime())||Number.isNaN(expires.getTime()))return json({error:"invalid_time"},400);
      if(Math.abs(Date.now()-created.getTime())>10*60*1000)return json({error:"stale_or_future_timestamp"},400);
      const ttl=expires.getTime()-created.getTime();if(ttl<5*60*1000||ttl>24*60*60*1000)return json({error:"invalid_expiry"},400);
      const expectedDigest=await sha256([sealId,from,to,p.createdAt,p.expiresAt,p.nonce].join("|"));
      if(expectedDigest!==p.offerDigest)return json({error:"offer_digest_mismatch"},400);
      const expectedId=`EVX-${String(p.offerDigest).slice(0,8).toUpperCase()}-${String(p.offerDigest).slice(8,16).toUpperCase()}-${String(p.offerDigest).slice(16,24).toUpperCase()}`;
      if(expectedId!==offerId)return json({error:"offer_id_mismatch"},400);
      const expectedMessage=`EVO PASSPORT TRANSFER OFFER V1\nOffer ID: ${offerId}\nSeal ID: ${sealId}\nFrom: ${from}\nTo: ${to}\nDigest: ${p.offerDigest}\nExpires: ${p.expiresAt}\nCreated: ${p.createdAt}`;
      if(p.signatureMessage!==expectedMessage)return json({error:"signature_message_mismatch"},400);
      const valid=await verifyMessage({address:from as `0x${string}`,message:expectedMessage,signature:String(p.signature) as `0x${string}`});
      if(!valid)return json({error:"invalid_signature"},401);
      const {data,error}=await supabase.rpc("evo_create_passport_transfer_offer_authoritative",{p_row:{
        offer_id:offerId,seal_id:sealId,from_wallet:from,to_wallet:to,offer_digest:String(p.offerDigest).toLowerCase(),
        offer_nonce:String(p.nonce).toLowerCase(),offer_signature:String(p.signature),offer_message:expectedMessage,
        created_at:String(p.createdAt),expires_at:String(p.expiresAt)
      }}).single();
      if(error){
        const m=String(error.message||"");
        if(m.includes("actor_is_not_current_owner"))return json({error:"actor_is_not_current_owner"},403);
        if(m.includes("seal_not_found"))return json({error:"seal_not_found"},404);
        if(m.includes("offer_id_conflict"))return json({error:"offer_id_conflict"},409);
        if(String(error.code||"")==="23505")return json({error:"pending_transfer_exists"},409);
        console.error(error.code||"offer_rpc_error");return json({error:"database_error"},500);
      }
      return json({ok:true,offer:{offer_id:data.offerId,seal_id:data.sealId,from_wallet:data.fromWallet,to_wallet:data.toWallet,status:data.status,created_at:data.createdAt,expires_at:data.expiresAt},idempotent:Boolean(data.idempotent),atomicAuthority:true},201);
    }

    if(action==="accept"){
      const required=["offerId","actorWallet","createdAt","nonce","acceptDigest","signature","signatureMessage"];
      for(const k of required)if(!p[k])return json({error:`missing_${k}`},400);
      const offerId=String(p.offerId||"").toUpperCase();
      const actor=String(p.actorWallet||"").toLowerCase();
      if(!offerRe.test(offerId))return json({error:"invalid_offer_id"},400);
      if(!walletRe.test(actor)||!hex32.test(String(p.nonce))||!hex64.test(String(p.acceptDigest)))return json({error:"invalid_acceptance"},400);
      if(!signatureBounds(p.signature,p.signatureMessage))return json({error:"invalid_signature_evidence"},400);
      const {data:o,error:oErr}=await supabase.from("evo_passport_transfers").select("offer_id,seal_id,from_wallet,to_wallet,offer_digest,status,expires_at").eq("offer_id",offerId).maybeSingle();
      if(oErr){console.error(oErr.code||"accept_lookup_error");return json({error:"database_error"},500)}
      if(!o)return json({error:"offer_not_found"},404);
      if(o.status==="CANCELLED")return json({error:"offer_cancelled",status:o.status},409);
      if(o.status==="EXPIRED")return json({error:"offer_expired",status:o.status},409);
      if(actor!==String(o.to_wallet).toLowerCase())return json({error:"only_recipient_can_accept"},403);
      const created=new Date(p.createdAt);if(Number.isNaN(created.getTime())||Math.abs(Date.now()-created.getTime())>10*60*1000)return json({error:"stale_or_future_timestamp"},400);
      const expectedDigest=await sha256([o.offer_id,o.seal_id,String(o.from_wallet).toLowerCase(),String(o.to_wallet).toLowerCase(),o.offer_digest,p.createdAt,p.nonce].join("|"));
      if(expectedDigest!==p.acceptDigest)return json({error:"accept_digest_mismatch"},400);
      const expectedMessage=`EVO PASSPORT TRANSFER ACCEPT V1\nOffer ID: ${o.offer_id}\nSeal ID: ${o.seal_id}\nFrom: ${String(o.from_wallet).toLowerCase()}\nTo: ${String(o.to_wallet).toLowerCase()}\nOffer digest: ${o.offer_digest}\nAcceptance digest: ${p.acceptDigest}\nAccepted: ${p.createdAt}`;
      if(p.signatureMessage!==expectedMessage)return json({error:"signature_message_mismatch"},400);
      const valid=await verifyMessage({address:actor as `0x${string}`,message:expectedMessage,signature:String(p.signature) as `0x${string}`});
      if(!valid)return json({error:"invalid_signature"},401);
      const eventDigest=await sha256([o.seal_id,"TRANSFERRED",String(o.from_wallet).toLowerCase(),String(o.to_wallet).toLowerCase(),o.offer_digest,p.acceptDigest,p.createdAt].join("|"));
      const eventId=`EVP-${eventDigest.slice(0,8).toUpperCase()}-${eventDigest.slice(8,16).toUpperCase()}-${eventDigest.slice(16,24).toUpperCase()}`;
      const {data,error}=await supabase.rpc("evo_accept_passport_transfer_authoritative",{
        p_offer_id:o.offer_id,p_actor_wallet:actor,p_accept_digest:String(p.acceptDigest).toLowerCase(),p_accept_nonce:String(p.nonce).toLowerCase(),
        p_accept_signature:String(p.signature),p_accept_message:expectedMessage,p_accepted_at:String(p.createdAt),p_event_id:eventId,p_event_digest:eventDigest
      }).single();
      if(error){console.error(error.code||"accept_rpc_error");return json({error:"transfer_accept_failed"},409)}
      if(!data?.ok)return json({error:String(data?.error||"transfer_accept_failed"),status:data?.status,currentOwner:data?.currentOwner},409);
      return json({ok:true,result:data,atomicAuthority:true},201);
    }

    if(action==="cancel"){
      const required=["offerId","actorWallet","createdAt","nonce","cancelDigest","signature","signatureMessage"];
      for(const k of required)if(!p[k])return json({error:`missing_${k}`},400);
      const offerId=String(p.offerId||"").toUpperCase(),actor=String(p.actorWallet||"").toLowerCase();
      if(!offerRe.test(offerId)||!walletRe.test(actor)||!hex32.test(String(p.nonce))||!hex64.test(String(p.cancelDigest)))return json({error:"invalid_cancellation"},400);
      if(!signatureBounds(p.signature,p.signatureMessage))return json({error:"invalid_signature_evidence"},400);
      const {data:o,error:oErr}=await supabase.from("evo_passport_transfers").select("offer_id,seal_id,from_wallet,to_wallet,offer_digest,status,expires_at").eq("offer_id",offerId).maybeSingle();
      if(oErr){console.error(oErr.code||"cancel_lookup_error");return json({error:"database_error"},500)}
      if(!o)return json({error:"offer_not_found"},404);
      if(o.status==="ACCEPTED")return json({error:"offer_already_accepted",status:o.status},409);
      if(o.status==="EXPIRED")return json({error:"offer_expired",status:o.status},409);
      if(actor!==String(o.from_wallet).toLowerCase())return json({error:"only_sender_can_cancel"},403);
      const created=new Date(p.createdAt);if(Number.isNaN(created.getTime())||Math.abs(Date.now()-created.getTime())>10*60*1000)return json({error:"stale_or_future_timestamp"},400);
      const expectedDigest=await sha256([o.offer_id,o.seal_id,actor,String(o.to_wallet).toLowerCase(),o.offer_digest,p.createdAt,p.nonce].join("|"));
      if(expectedDigest!==p.cancelDigest)return json({error:"cancel_digest_mismatch"},400);
      const expectedMessage=`EVO PASSPORT TRANSFER CANCEL V1\nOffer ID: ${o.offer_id}\nSeal ID: ${o.seal_id}\nFrom: ${actor}\nTo: ${String(o.to_wallet).toLowerCase()}\nOffer digest: ${o.offer_digest}\nCancel digest: ${p.cancelDigest}\nCancelled: ${p.createdAt}`;
      if(p.signatureMessage!==expectedMessage)return json({error:"signature_message_mismatch"},400);
      const valid=await verifyMessage({address:actor as `0x${string}`,message:expectedMessage,signature:String(p.signature) as `0x${string}`});
      if(!valid)return json({error:"invalid_signature"},401);
      const {data,error}=await supabase.rpc("evo_cancel_passport_transfer_authoritative",{
        p_offer_id:o.offer_id,p_actor_wallet:actor,p_cancel_digest:String(p.cancelDigest).toLowerCase(),p_cancel_nonce:String(p.nonce).toLowerCase(),
        p_cancel_signature:String(p.signature),p_cancel_message:expectedMessage,p_cancelled_at:String(p.createdAt)
      }).single();
      if(error){console.error(error.code||"cancel_rpc_error");return json({error:"transfer_cancel_failed"},409)}
      if(!data?.ok)return json({error:String(data?.error||"transfer_cancel_failed"),status:data?.status,currentOwner:data?.currentOwner},409);
      return json({ok:true,offer:{offer_id:o.offer_id,status:data.status},idempotent:Boolean(data.idempotent),atomicAuthority:true},200);
    }

    return json({error:"invalid_action"},400);
  }catch(err){console.error(err instanceof Error?err.name:"unknown");return json({error:"internal_error"},500)}
});
