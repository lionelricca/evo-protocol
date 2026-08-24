import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
};
const MAX_BODY_BYTES=4096;
const MAX_ATTEMPTS=10;
const MAX_ISSUES_PER_HOUR=30;
const sealRe=/^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
const challengeRe=/^EVC-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
const hex64=/^[0-9a-f]{64}$/;
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}})}
function hex(bytes:Uint8Array){return [...bytes].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function sha256(text:string){const b=new TextEncoder().encode(text);return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",b)))}
function randomHex(bytes=32){const b=new Uint8Array(bytes);crypto.getRandomValues(b);return hex(b)}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  try{
    const raw=await req.text();
    if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES)return json({error:"payload_too_large"},413);
    let body:Record<string,unknown>;
    try{body=JSON.parse(raw||"{}")}catch{return json({error:"invalid_json"},400)}
    const action=String(body?.action||"").toLowerCase();
    const payload=body?.payload&&typeof body.payload==="object"&&!Array.isArray(body.payload)?body.payload as Record<string,unknown>:{};
    const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
    const audit=async(challengeId:string,sealId:string,attemptType:"ACCEPTED"|"REPLAY"|"MISMATCH"|"EXPIRED")=>{
      const {error}=await supabase.from("evo_challenge_attempts").insert({challenge_id:challengeId,seal_id:sealId,attempt_type:attemptType});
      if(error)console.error("challenge_audit_error",error.code);
    };

    if(action==="issue"){
      const sealId=String(payload?.sealId||"").trim().toUpperCase();
      if(!sealRe.test(sealId))return json({error:"invalid_seal_id"},400);
      const {data:seal,error:sealError}=await supabase.from("evo_seals").select("seal_id,digest,status").eq("seal_id",sealId).eq("status","ACTIVE").single();
      if(sealError||!seal)return json({error:"seal_not_found"},404);

      const now=new Date();
      const nowIso=now.toISOString();
      await supabase.from("evo_challenges").update({status:"EXPIRED"}).eq("seal_id",sealId).eq("status","PENDING").lt("expires_at",nowIso);

      // Reuse one still-live public software challenge instead of allowing a
      // caller to create an unbounded number of pending rows for the same Seal.
      const {data:pending,error:pendingError}=await supabase.from("evo_challenges")
        .select("challenge_id,seal_id,mode,challenge_nonce,created_at,expires_at,status")
        .eq("seal_id",sealId).eq("status","PENDING").gt("expires_at",nowIso)
        .order("created_at",{ascending:false}).limit(1).maybeSingle();
      if(pendingError)return json({error:"database_error"},500);
      if(pending)return json({ok:true,reused:true,challenge:{
        challengeId:pending.challenge_id,sealId:pending.seal_id,mode:pending.mode,
        challengeNonce:pending.challenge_nonce,createdAt:pending.created_at,expiresAt:pending.expires_at,
        authority:"OBSERVATIONAL_ONLY",authoritative:false,
      }},200);

      const hourAgo=new Date(now.getTime()-60*60*1000).toISOString();
      const {count:issueCount,error:countError}=await supabase.from("evo_challenges")
        .select("challenge_id",{count:"exact",head:true}).eq("seal_id",sealId).gte("created_at",hourAgo);
      if(countError)return json({error:"database_error"},500);
      if((issueCount||0)>=MAX_ISSUES_PER_HOUR)return json({error:"challenge_rate_limited"},429);

      const nonce=randomHex(32);
      const createdAt=nowIso;
      const expiresAt=new Date(now.getTime()+90_000).toISOString();
      const seed=await sha256(`${sealId}|${nonce}|${createdAt}|SOFTWARE_V0`);
      const challengeId=`EVC-${seed.slice(0,8).toUpperCase()}-${seed.slice(8,16).toUpperCase()}-${seed.slice(16,24).toUpperCase()}`;
      const {error}=await supabase.from("evo_challenges").insert({challenge_id:challengeId,seal_id:sealId,mode:"SOFTWARE_V0",challenge_nonce:nonce,status:"PENDING",created_at:createdAt,expires_at:expiresAt});
      if(error){console.error(error.code);return json({error:"database_error"},500)}
      return json({ok:true,reused:false,challenge:{challengeId,sealId,mode:"SOFTWARE_V0",challengeNonce:nonce,createdAt,expiresAt,authority:"OBSERVATIONAL_ONLY",authoritative:false}},201);
    }

    if(action==="respond"){
      const challengeId=String(payload?.challengeId||"").trim().toUpperCase();
      const responseHash=String(payload?.responseHash||"").trim().toLowerCase();
      if(!challengeRe.test(challengeId))return json({error:"invalid_challenge_id"},400);
      if(!hex64.test(responseHash))return json({error:"invalid_response_hash"},400);
      const {data:c,error:cError}=await supabase.from("evo_challenges").select("challenge_id,seal_id,mode,challenge_nonce,status,expires_at,attempt_count").eq("challenge_id",challengeId).single();
      if(cError||!c)return json({error:"challenge_not_found"},404);
      const attempts=Math.max(0,Number(c.attempt_count||0));
      if(attempts>=MAX_ATTEMPTS)return json({error:"challenge_attempt_limit",status:c.status},429);

      if(c.status!=="PENDING"){
        await Promise.all([
          audit(challengeId,c.seal_id,"REPLAY"),
          supabase.from("evo_challenges").update({attempt_count:attempts+1}).eq("challenge_id",challengeId).lt("attempt_count",MAX_ATTEMPTS)
        ]);
        return json({error:"challenge_already_consumed",status:c.status},409);
      }

      const now=new Date();
      if(new Date(c.expires_at).getTime()<=now.getTime()){
        await Promise.all([
          audit(challengeId,c.seal_id,"EXPIRED"),
          supabase.from("evo_challenges").update({status:"EXPIRED",attempt_count:attempts+1}).eq("challenge_id",challengeId).eq("status","PENDING")
        ]);
        return json({error:"challenge_expired"},410);
      }

      const {data:seal,error:sealError}=await supabase.from("evo_seals").select("digest,status").eq("seal_id",c.seal_id).eq("status","ACTIVE").single();
      if(sealError||!seal)return json({error:"seal_not_found"},404);
      const expected=await sha256(`${challengeId}|${c.seal_id}|${c.challenge_nonce}|${seal.digest}|SOFTWARE_V0`);
      if(expected!==responseHash){
        await Promise.all([
          audit(challengeId,c.seal_id,"MISMATCH"),
          supabase.from("evo_challenges").update({attempt_count:attempts+1}).eq("challenge_id",challengeId).eq("status","PENDING").lt("attempt_count",MAX_ATTEMPTS)
        ]);
        return json({error:"challenge_response_mismatch"},401);
      }

      const completedAt=now.toISOString();
      const {data:updated,error:updateError}=await supabase.from("evo_challenges")
        .update({status:"CONSUMED",response_hash:responseHash,completed_at:completedAt,attempt_count:attempts+1})
        .eq("challenge_id",challengeId).eq("status","PENDING").lt("attempt_count",MAX_ATTEMPTS).gt("expires_at",completedAt)
        .select("challenge_id,seal_id,mode,status,created_at,expires_at,completed_at,attempt_count").maybeSingle();
      if(updateError){console.error(updateError.code);return json({error:"database_error"},500)}
      if(!updated){await audit(challengeId,c.seal_id,"REPLAY");return json({error:"challenge_already_consumed"},409)}
      await audit(challengeId,c.seal_id,"ACCEPTED");
      return json({ok:true,proof:{...updated,antiReplay:true,physicalPresence:false,authority:"OBSERVATIONAL_ONLY",authoritative:false,meaning:"Fresh public software verification response accepted once. It is not possession or identity evidence."}});
    }

    return json({error:"invalid_action"},400);
  }catch(err){console.error(err instanceof Error?err.name:"unknown");return json({error:"internal_error"},500)}
});
