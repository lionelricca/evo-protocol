import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";
import { verifyMessage } from "npm:viem@2.21.54";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const walletRe=/^0x[0-9a-fA-F]{40}$/;const hex64=/^[0-9a-f]{64}$/;const hex32=/^[0-9a-f]{32}$/;
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json"}})}
async function sha256(text:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  try{
    const raw=await req.text();if(new TextEncoder().encode(raw).byteLength>16384)return json({error:"payload_too_large"},413);
    let body;try{body=JSON.parse(raw)}catch{return json({error:"invalid_json"},400)}const action=String(body?.action||"");const p=body?.payload;
    if(!p||typeof p!=="object")return json({error:"invalid_payload"},400);
    const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});

    if(action==="inbox"){
      const required=["wallet","origin","issuedAt","expiresAt","nonce","signature","signatureMessage"];
      for(const k of required)if(!p[k])return json({error:`missing_${k}`},400);
      const wallet=String(p.wallet).toLowerCase();
      if(!walletRe.test(wallet)||!hex32.test(String(p.nonce)))return json({error:"invalid_inbox_request"},400);
      const origin=String(p.origin);if(origin.length>240)return json({error:"invalid_origin"},400);
      const requestOrigin=String(req.headers.get("origin")||"");
      if(requestOrigin&&requestOrigin!==origin)return json({error:"origin_mismatch"},403);
      const issued=new Date(p.issuedAt),expires=new Date(p.expiresAt);
      if(Number.isNaN(issued.getTime())||Number.isNaN(expires.getTime()))return json({error:"invalid_time"},400);
      const now=Date.now(),ttl=expires.getTime()-issued.getTime();
      if(ttl<30_000||ttl>5*60_000)return json({error:"invalid_expiry"},400);
      if(issued.getTime()>now+60_000||now-issued.getTime()>5*60_000||expires.getTime()<=now)return json({error:"expired_or_future_request"},401);
      const expectedMessage=`EVO TRANSFER INBOX V1\nWallet: ${wallet}\nOrigin: ${origin}\nNonce: ${p.nonce}\nIssued: ${p.issuedAt}\nExpires: ${p.expiresAt}`;
      if(p.signatureMessage!==expectedMessage)return json({error:"signature_message_mismatch"},400);
      const valid=await verifyMessage({address:wallet as `0x${string}`,message:expectedMessage,signature:p.signature as `0x${string}`});
      if(!valid)return json({error:"invalid_signature"},401);
      await supabase.from("evo_passport_transfers").update({status:"EXPIRED"}).eq("to_wallet",wallet).eq("status","PENDING").lte("expires_at",new Date().toISOString());
      const fields="offer_id,seal_id,from_wallet,to_wallet,offer_digest,created_at,expires_at,status";
      const {data,error}=await supabase.from("evo_passport_transfers").select(fields).eq("to_wallet",wallet).eq("status","PENDING").gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(50);
      if(error){console.error(error);return json({error:"database_error"},500)}
      return json({ok:true,wallet,offers:data||[]});
    }

    if(action==="lookup"){
      const offerId=String(p.offerId||"").toUpperCase();
      if(!/^EVX-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/.test(offerId))return json({error:"invalid_offer_id"},400);
      const fields="offer_id,seal_id,from_wallet,to_wallet,offer_digest,created_at,expires_at,status,accepted_at,registered_at";
      const {data:o,error}=await supabase.from("evo_passport_transfers").select(fields).eq("offer_id",offerId).maybeSingle();
      if(error){console.error(error);return json({error:"database_error"},500)}
      if(!o)return json({error:"offer_not_found"},404);
      if(o.status==="PENDING"&&new Date(o.expires_at).getTime()<=Date.now()){
        const {data:expired,error:expiryError}=await supabase.from("evo_passport_transfers").update({status:"EXPIRED"}).eq("offer_id",offerId).eq("status","PENDING").select(fields).single();
        if(expiryError){console.error(expiryError);return json({error:"database_error"},500)}
        return json({ok:true,offer:expired});
      }
      return json({ok:true,offer:o});
    }

    async function getCurrentOwner(sealId:string){
      const {data:seal,error}=await supabase.from("evo_seals").select("seal_id,issuer_wallet,status").eq("seal_id",sealId).eq("status","ACTIVE").single();
      if(error||!seal)throw new Error("seal_not_found");
      const {data:ev,error:evErr}=await supabase.from("evo_passport_events").select("new_owner_wallet,registered_at").eq("seal_id",sealId).eq("event_type","TRANSFERRED").eq("status","ACTIVE").order("registered_at",{ascending:false}).limit(1);
      if(evErr)throw new Error("database_error");
      return String(ev?.[0]?.new_owner_wallet||seal.issuer_wallet).toLowerCase();
    }

    if(action==="offer"){
      const required=["sealId","fromWallet","toWallet","createdAt","expiresAt","nonce","offerDigest","offerId","signature","signatureMessage"];
      for(const k of required)if(!p[k])return json({error:`missing_${k}`},400);
      if(!/^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/.test(p.sealId))return json({error:"invalid_seal_id"},400);
      if(!walletRe.test(p.fromWallet)||!walletRe.test(p.toWallet))return json({error:"invalid_wallet"},400);
      if(!hex32.test(p.nonce)||!hex64.test(p.offerDigest))return json({error:"invalid_hash"},400);
      const from=String(p.fromWallet).toLowerCase(),to=String(p.toWallet).toLowerCase();
      if(from===to)return json({error:"same_wallet"},400);
      const created=new Date(p.createdAt),expires=new Date(p.expiresAt);if(Number.isNaN(created.getTime())||Number.isNaN(expires.getTime()))return json({error:"invalid_time"},400);
      const now=Date.now();if(Math.abs(now-created.getTime())>10*60*1000)return json({error:"stale_or_future_timestamp"},400);
      const ttl=expires.getTime()-created.getTime();if(ttl<5*60*1000||ttl>24*60*60*1000)return json({error:"invalid_expiry"},400);
      const currentOwner=await getCurrentOwner(p.sealId);if(from!==currentOwner)return json({error:"actor_is_not_current_owner",currentOwner},403);
      await supabase.from("evo_passport_transfers").update({status:"EXPIRED"}).eq("seal_id",p.sealId).eq("status","PENDING").lt("expires_at",new Date().toISOString());
      const expectedDigest=await sha256([p.sealId,from,to,p.createdAt,p.expiresAt,p.nonce].join("|"));if(expectedDigest!==p.offerDigest)return json({error:"offer_digest_mismatch"},400);
      const expectedId=`EVX-${p.offerDigest.slice(0,8).toUpperCase()}-${p.offerDigest.slice(8,16).toUpperCase()}-${p.offerDigest.slice(16,24).toUpperCase()}`;if(expectedId!==p.offerId)return json({error:"offer_id_mismatch"},400);
      const expectedMessage=`EVO PASSPORT TRANSFER OFFER V1\nOffer ID: ${p.offerId}\nSeal ID: ${p.sealId}\nFrom: ${from}\nTo: ${to}\nDigest: ${p.offerDigest}\nExpires: ${p.expiresAt}\nCreated: ${p.createdAt}`;
      if(p.signatureMessage!==expectedMessage)return json({error:"signature_message_mismatch"},400);
      const valid=await verifyMessage({address:from as `0x${string}`,message:expectedMessage,signature:p.signature as `0x${string}`});if(!valid)return json({error:"invalid_signature"},401);
      const {data,error}=await supabase.from("evo_passport_transfers").insert({offer_id:p.offerId,seal_id:p.sealId,from_wallet:from,to_wallet:to,offer_digest:p.offerDigest,offer_nonce:p.nonce,offer_signature:p.signature,offer_message:p.signatureMessage,created_at:p.createdAt,expires_at:p.expiresAt,status:"PENDING"}).select("offer_id,seal_id,from_wallet,to_wallet,status,created_at,expires_at").single();
      if(error){if(error.code==="23505")return json({error:"pending_transfer_exists"},409);console.error(error);return json({error:"database_error"},500)}
      return json({ok:true,offer:data},201);
    }

    if(action==="accept"){
      const required=["offerId","actorWallet","createdAt","nonce","acceptDigest","signature","signatureMessage"];
      for(const k of required)if(!p[k])return json({error:`missing_${k}`},400);
      if(!/^EVX-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/.test(p.offerId))return json({error:"invalid_offer_id"},400);
      if(!walletRe.test(p.actorWallet)||!hex32.test(p.nonce)||!hex64.test(p.acceptDigest))return json({error:"invalid_acceptance"},400);
      const {data:o,error:oErr}=await supabase.from("evo_passport_transfers").select("*").eq("offer_id",p.offerId).single();if(oErr||!o)return json({error:"offer_not_found"},404);
      if(o.status!=="PENDING")return json({error:"offer_not_pending",status:o.status},409);
      if(new Date(o.expires_at).getTime()<=Date.now()){await supabase.from("evo_passport_transfers").update({status:"EXPIRED"}).eq("offer_id",o.offer_id).eq("status","PENDING");return json({error:"offer_expired"},409)}
      const actor=String(p.actorWallet).toLowerCase();if(actor!==String(o.to_wallet).toLowerCase())return json({error:"only_recipient_can_accept"},403);
      const created=new Date(p.createdAt);if(Number.isNaN(created.getTime())||Math.abs(Date.now()-created.getTime())>10*60*1000)return json({error:"stale_or_future_timestamp"},400);
      const currentOwner=await getCurrentOwner(o.seal_id);if(currentOwner!==String(o.from_wallet).toLowerCase())return json({error:"owner_changed",currentOwner},409);
      const expectedDigest=await sha256([o.offer_id,o.seal_id,String(o.from_wallet).toLowerCase(),String(o.to_wallet).toLowerCase(),o.offer_digest,p.createdAt,p.nonce].join("|"));if(expectedDigest!==p.acceptDigest)return json({error:"accept_digest_mismatch"},400);
      const expectedMessage=`EVO PASSPORT TRANSFER ACCEPT V1\nOffer ID: ${o.offer_id}\nSeal ID: ${o.seal_id}\nFrom: ${String(o.from_wallet).toLowerCase()}\nTo: ${String(o.to_wallet).toLowerCase()}\nOffer digest: ${o.offer_digest}\nAcceptance digest: ${p.acceptDigest}\nAccepted: ${p.createdAt}`;
      if(p.signatureMessage!==expectedMessage)return json({error:"signature_message_mismatch"},400);
      const valid=await verifyMessage({address:actor as `0x${string}`,message:expectedMessage,signature:p.signature as `0x${string}`});if(!valid)return json({error:"invalid_signature"},401);
      const eventDigest=await sha256([o.seal_id,"TRANSFERRED",String(o.from_wallet).toLowerCase(),String(o.to_wallet).toLowerCase(),o.offer_digest,p.acceptDigest,p.createdAt].join("|"));
      const eventId=`EVP-${eventDigest.slice(0,8).toUpperCase()}-${eventDigest.slice(8,16).toUpperCase()}-${eventDigest.slice(16,24).toUpperCase()}`;
      const {data,error}=await supabase.rpc("accept_evo_passport_transfer",{p_offer_id:o.offer_id,p_accept_digest:p.acceptDigest,p_accept_nonce:p.nonce,p_accept_signature:p.signature,p_accept_message:p.signatureMessage,p_accepted_at:p.createdAt,p_event_id:eventId,p_event_digest:eventDigest});
      if(error){console.error(error);return json({error:String(error.message||"transfer_accept_failed")},409)}
      return json({ok:true,result:data},201);
    }

    if(action==="cancel"){
      const required=["offerId","actorWallet","createdAt","nonce","cancelDigest","signature","signatureMessage"];
      for(const k of required)if(!p[k])return json({error:`missing_${k}`},400);
      if(!walletRe.test(p.actorWallet)||!hex32.test(p.nonce)||!hex64.test(p.cancelDigest))return json({error:"invalid_cancellation"},400);
      const {data:o,error:oErr}=await supabase.from("evo_passport_transfers").select("*").eq("offer_id",p.offerId).single();if(oErr||!o)return json({error:"offer_not_found"},404);
      if(o.status!=="PENDING")return json({error:"offer_not_pending",status:o.status},409);
      const actor=String(p.actorWallet).toLowerCase();if(actor!==String(o.from_wallet).toLowerCase())return json({error:"only_sender_can_cancel"},403);
      const currentOwner=await getCurrentOwner(o.seal_id);if(actor!==currentOwner)return json({error:"actor_is_not_current_owner",currentOwner},403);
      const created=new Date(p.createdAt);if(Number.isNaN(created.getTime())||Math.abs(Date.now()-created.getTime())>10*60*1000)return json({error:"stale_or_future_timestamp"},400);
      const expectedDigest=await sha256([o.offer_id,o.seal_id,actor,String(o.to_wallet).toLowerCase(),o.offer_digest,p.createdAt,p.nonce].join("|"));if(expectedDigest!==p.cancelDigest)return json({error:"cancel_digest_mismatch"},400);
      const expectedMessage=`EVO PASSPORT TRANSFER CANCEL V1\nOffer ID: ${o.offer_id}\nSeal ID: ${o.seal_id}\nFrom: ${actor}\nTo: ${String(o.to_wallet).toLowerCase()}\nOffer digest: ${o.offer_digest}\nCancel digest: ${p.cancelDigest}\nCancelled: ${p.createdAt}`;
      if(p.signatureMessage!==expectedMessage)return json({error:"signature_message_mismatch"},400);
      const valid=await verifyMessage({address:actor as `0x${string}`,message:expectedMessage,signature:p.signature as `0x${string}`});if(!valid)return json({error:"invalid_signature"},401);
      const {data,error}=await supabase.from("evo_passport_transfers").update({status:"CANCELLED",cancelled_at:p.createdAt,cancel_digest:p.cancelDigest,cancel_nonce:p.nonce,cancel_signature:p.signature,cancel_message:p.signatureMessage}).eq("offer_id",o.offer_id).eq("status","PENDING").select("offer_id,status").single();if(error)return json({error:"database_error"},500);
      return json({ok:true,offer:data},200);
    }

    return json({error:"invalid_action"},400);
  }catch(err){console.error(err);return json({error:err instanceof Error?err.message:"internal_error"},500)}
});