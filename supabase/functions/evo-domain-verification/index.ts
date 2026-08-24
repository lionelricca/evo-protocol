import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";
import { verifyMessage } from "npm:viem@2.21.54";
import { rejectUntrustedBrowserOrigin, restrictedPreflight, withRestrictedCors } from "../_shared/evo-cors.ts";

const MAX_BODY_BYTES=4096;
const walletRe=/^0x[0-9a-fA-F]{40}$/;
const hex32=/^[0-9a-f]{32}$/;
const challengeRe=/^EVD-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
function json(data:unknown,status=200,extraHeaders:Record<string,string>={}){
  return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...extraHeaders}})
}
function hex(bytes:Uint8Array){return [...bytes].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function sha256(text:string){return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text))))}
async function issuerIdFor(wallet:string){const h=(await sha256(`EVO-ISSUER-V1|${wallet}`)).toUpperCase();return `EVO-I-${h.slice(0,8)}-${h.slice(8,16)}-${h.slice(16,24)}`}
function randomHex(bytes=32){const b=new Uint8Array(bytes);crypto.getRandomValues(b);return hex(b)}
function normalizeDomain(input:string){
  const d=String(input||"").trim().toLowerCase().replace(/^https?:\/\//,"").replace(/\/.*$/,"").replace(/\.$/,"");
  if(d.length<4||d.length>253||!d.includes("."))throw new Error("invalid_domain");
  if(d.includes(":")||/^\d+\.\d+\.\d+\.\d+$/.test(d)||d==="localhost")throw new Error("invalid_domain");
  const labels=d.split(".");
  for(const l of labels){if(!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(l))throw new Error("invalid_domain")}
  return d;
}
async function queryTxt(name:string){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),5000);
  try{
    const url=`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`;
    const r=await fetch(url,{headers:{Accept:"application/dns-json"},signal:controller.signal});
    if(!r.ok)throw new Error("dns_lookup_failed");
    const data=await r.json();
    const answers=Array.isArray(data?.Answer)?data.Answer:[];
    return answers.filter((a:any)=>Number(a?.type)===16).map((a:any)=>String(a?.data||"").replace(/^"|"$/g,"").replace(/"\s+"/g,""));
  }finally{clearTimeout(timer)}
}
async function proveWallet(db:any,issuerWallet:string){
  const {data:acct,error:readError}=await db.from("evo_wallet_accounts").select("issuer_wallet,issuer_id,first_chain_id,last_chain_id,status,created_at,proven_at").eq("issuer_wallet",issuerWallet).maybeSingle();
  if(readError)throw new Error("wallet_account_error");
  if(acct?.status==="SUSPENDED")throw new Error("issuer_suspended");
  const now=new Date().toISOString();
  const row={issuer_wallet:issuerWallet,issuer_id:acct?.issuer_id||await issuerIdFor(issuerWallet),first_chain_id:acct?.first_chain_id||null,last_chain_id:acct?.last_chain_id||null,status:"WALLET_PROVEN",created_at:acct?.created_at||now,updated_at:now,proven_at:acct?.proven_at||now};
  const {error}=await db.from("evo_wallet_accounts").upsert(row,{onConflict:"issuer_wallet"});
  if(error)throw new Error("wallet_account_error");
}

async function handle(req:Request){
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  try{
    const declaredLength=Number(req.headers.get("content-length")||"0");
    if(declaredLength>MAX_BODY_BYTES)return json({error:"payload_too_large"},413);
    const raw=await req.text();
    if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES)return json({error:"payload_too_large"},413);
    let body:Record<string,unknown>;
    try{body=JSON.parse(raw||"{}")}catch{return json({error:"invalid_json"},400)}
    const action=String(body?.action||"").toLowerCase();
    const payload=body?.payload&&typeof body.payload==="object"&&!Array.isArray(body.payload)?body.payload as Record<string,unknown>:{};
    const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});

    if(action==="issue"){
      const issuerWallet=String(payload?.issuerWallet||"").toLowerCase();
      if(!walletRe.test(issuerWallet))return json({error:"invalid_wallet"},400);
      let domain="";try{domain=normalizeDomain(String(payload?.domain||""))}catch{return json({error:"invalid_domain"},400)}
      const clientNonce=String(payload?.clientNonce||"").toLowerCase();
      const signedAt=String(payload?.signedAt||"");
      const signature=String(payload?.signature||"");
      if(!hex32.test(clientNonce))return json({error:"invalid_nonce"},400);
      const signed=new Date(signedAt);
      if(Number.isNaN(signed.getTime())||Math.abs(Date.now()-signed.getTime())>10*60*1000)return json({error:"stale_or_future_timestamp"},400);
      const message=`EVO DOMAIN VERIFY V0\nWallet: ${issuerWallet}\nDomain: ${domain}\nNonce: ${clientNonce}\nSigned: ${signedAt}`;
      const valid=await verifyMessage({address:issuerWallet as `0x${string}`,message,signature:signature as `0x${string}`});
      if(!valid)return json({error:"invalid_signature"},401);
      try{await proveWallet(db,issuerWallet)}catch(e){const m=String((e as Error)?.message||e);return json({error:m},m==="issuer_suspended"?403:500)}

      const {data:claimed,error:claimedError}=await db.from("evo_domain_verifications").select("issuer_wallet,status").eq("domain",domain).eq("status","ACTIVE").maybeSingle();
      if(claimedError)return json({error:"database_error"},500);
      if(claimed&&String(claimed.issuer_wallet).toLowerCase()!==issuerWallet)return json({error:"domain_already_claimed"},409);

      const nowIso=new Date().toISOString();
      await db.from("evo_domain_challenges").update({status:"EXPIRED"}).eq("issuer_wallet",issuerWallet).eq("domain",domain).eq("status","PENDING").lt("expires_at",nowIso);
      const {data:pending,error:pendingError}=await db.from("evo_domain_challenges")
        .select("challenge_id,domain,token,expires_at")
        .eq("issuer_wallet",issuerWallet).eq("domain",domain).eq("status","PENDING").gt("expires_at",nowIso)
        .order("created_at",{ascending:false}).limit(1).maybeSingle();
      if(pendingError)return json({error:"database_error"},500);
      if(pending){
        const dnsName=`_evo-verification.${domain}`;
        const txtValue=`evo-domain-verification=${pending.token}`;
        return json({ok:true,reused:true,challenge:{challengeId:pending.challenge_id,domain,dnsName,txtValue,expiresAt:pending.expires_at,method:"DNS_TXT"}},200);
      }

      const token=randomHex(32);
      const createdAt=nowIso;
      const expiresAt=new Date(Date.now()+24*60*60*1000).toISOString();
      const seed=await sha256(`${issuerWallet}|${domain}|${token}|${createdAt}`);
      const challengeId=`EVD-${seed.slice(0,8).toUpperCase()}-${seed.slice(8,16).toUpperCase()}-${seed.slice(16,24).toUpperCase()}`;
      const {error}=await db.from("evo_domain_challenges").insert({challenge_id:challengeId,issuer_wallet:issuerWallet,domain,token,status:"PENDING",created_at:createdAt,expires_at:expiresAt});
      if(error){console.error("domain_challenge_insert",error.code);return json({error:"database_error"},500)}
      const dnsName=`_evo-verification.${domain}`;
      const txtValue=`evo-domain-verification=${token}`;
      return json({ok:true,reused:false,challenge:{challengeId,domain,dnsName,txtValue,expiresAt,method:"DNS_TXT"}},201);
    }

    if(action==="check"){
      const challengeId=String(payload?.challengeId||"").trim().toUpperCase();
      if(!challengeRe.test(challengeId))return json({error:"invalid_challenge_id"},400);

      const {data:slot,error:slotError}=await db.rpc("evo_domain_take_check_slot",{p_challenge_id:challengeId}).single();
      if(slotError||!slot){console.error("domain_check_slot",slotError?.code||"missing");return json({error:"database_error"},500)}
      if(!slot.allowed){
        const reason=String(slot.reason||"");
        if(reason==="not_found")return json({error:"challenge_not_found"},404);
        if(reason==="verified")return json({ok:true,verified:true,domain:slot.domain,status:"VERIFIED"});
        if(reason==="expired")return json({error:"challenge_expired"},410);
        if(reason==="rate_limited")return json({error:"too_many_checks"},429);
        if(reason==="too_fast"){
          const retry=Math.max(1,Number(slot.retry_after_seconds||1));
          return json({error:"check_too_fast",retryAfterSeconds:retry},429,{"Retry-After":String(retry)});
        }
        return json({error:"challenge_not_pending",status:String(slot.challenge_status||"")},409);
      }

      const dnsName=`_evo-verification.${slot.domain}`;
      let records:string[]=[];
      try{records=await queryTxt(dnsName)}catch{return json({error:"dns_lookup_failed"},502)}
      const expected=`evo-domain-verification=${slot.token}`;
      const found=records.some(v=>v===expected);
      const checkedAt=new Date().toISOString();
      if(!found)return json({ok:true,verified:false,status:"PENDING",dnsName,expected,recordsFound:records.length,checkCount:Number(slot.check_count||0)});

      const {data:existingDomain,error:domainReadError}=await db.from("evo_domain_verifications").select("issuer_wallet,status").eq("domain",slot.domain).maybeSingle();
      if(domainReadError)return json({error:"database_error"},500);
      if(existingDomain&&existingDomain.status==="ACTIVE"&&String(existingDomain.issuer_wallet).toLowerCase()!==String(slot.issuer_wallet).toLowerCase())return json({error:"domain_already_claimed"},409);

      const {error:upsertError}=await db.from("evo_domain_verifications").upsert({issuer_wallet:slot.issuer_wallet,domain:slot.domain,method:"DNS_TXT",verified_at:checkedAt,last_reverified_at:checkedAt,status:"ACTIVE"},{onConflict:"issuer_wallet"});
      if(upsertError){console.error("domain_verification_upsert",upsertError.code);return json({error:"database_error"},500)}
      const {data:verifiedChallenge,error:verifyError}=await db.from("evo_domain_challenges")
        .update({status:"VERIFIED",verified_at:checkedAt}).eq("challenge_id",challengeId).eq("status","PENDING")
        .select("challenge_id").maybeSingle();
      if(verifyError)return json({error:"database_error"},500);
      if(!verifiedChallenge){
        const {data:current}=await db.from("evo_domain_challenges").select("status").eq("challenge_id",challengeId).maybeSingle();
        if(current?.status!=="VERIFIED")return json({error:"challenge_state_changed"},409);
      }
      const {data:profile}=await db.from("evo_issuer_profiles").select("status").eq("issuer_wallet",slot.issuer_wallet).maybeSingle();
      if(profile&&!["ORGANIZATION_VERIFIED","SUSPENDED"].includes(profile.status)){
        await db.from("evo_issuer_profiles").update({status:"DOMAIN_VERIFIED",verified_at:checkedAt,updated_at:checkedAt}).eq("issuer_wallet",slot.issuer_wallet);
      }
      return json({ok:true,verified:true,status:"VERIFIED",domain:slot.domain,method:"DNS_TXT",verifiedAt:checkedAt});
    }

    return json({error:"invalid_action"},400);
  }catch(err){console.error("domain_verification_internal",err instanceof Error?err.name:"unknown");return json({error:"internal_error"},500)}
}

Deno.serve(async(req:Request)=>{
  const preflight=restrictedPreflight(req);
  if(preflight)return preflight;
  const denied=rejectUntrustedBrowserOrigin(req);
  if(denied)return denied;
  return withRestrictedCors(req,await handle(req));
});
