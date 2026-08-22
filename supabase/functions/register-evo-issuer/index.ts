import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";
import { verifyMessage } from "npm:viem@2.21.54";
import { rejectUntrustedBrowserOrigin, restrictedPreflight, withRestrictedCors } from "../_shared/evo-cors.ts";

const MAX_BODY_BYTES=4096;
const walletRe=/^0x[0-9a-fA-F]{40}$/;
const slugRe=/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const hex64=/^[0-9a-f]{64}$/;
const hex32=/^[0-9a-f]{32}$/;
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}})}
function stable(obj:Record<string,unknown>){return JSON.stringify(Object.keys(obj).sort().reduce((a,k)=>(a[k]=typeof obj[k]==="string"?String(obj[k]).trim():obj[k],a),{} as Record<string,unknown>))}
async function sha256(text:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function issuerIdFor(wallet:string){const h=(await sha256(`EVO-ISSUER-V1|${wallet}`)).toUpperCase();return `EVO-I-${h.slice(0,8)}-${h.slice(8,16)}-${h.slice(16,24)}`}

async function proveWallet(db:any,issuerWallet:string){
  const {data:acct,error:readError}=await db.from("evo_wallet_accounts")
    .select("issuer_wallet,issuer_id,first_chain_id,last_chain_id,status,created_at,proven_at")
    .eq("issuer_wallet",issuerWallet).maybeSingle();
  if(readError)throw new Error("wallet_account_error");
  if(acct?.status==="SUSPENDED")throw new Error("issuer_suspended");
  const now=new Date().toISOString();
  const row={
    issuer_wallet:issuerWallet,
    issuer_id:acct?.issuer_id||await issuerIdFor(issuerWallet),
    first_chain_id:acct?.first_chain_id||null,
    last_chain_id:acct?.last_chain_id||null,
    status:"WALLET_PROVEN",
    created_at:acct?.created_at||now,
    updated_at:now,
    proven_at:acct?.proven_at||now,
  };
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
    const p=body?.profile&&typeof body.profile==="object"&&!Array.isArray(body.profile)?body.profile as Record<string,unknown>:null;
    if(!p)return json({error:"invalid_payload"},400);

    const issuerWallet=String(p.issuerWallet||"").toLowerCase();
    const displayName=String(p.displayName||"").trim();
    const slug=String(p.slug||"").trim().toLowerCase();
    const website=String(p.website||"").trim();
    const createdAt=String(p.createdAt||"");
    const nonce=String(p.nonce||"").toLowerCase();
    const profileHash=String(p.profileHash||"").toLowerCase();
    const signature=String(p.signature||"");
    const signatureMessage=String(p.signatureMessage||"");

    if(!walletRe.test(issuerWallet))return json({error:"invalid_wallet"},400);
    if(displayName.length<1||displayName.length>160)return json({error:"invalid_display_name"},400);
    if(!slugRe.test(slug))return json({error:"invalid_slug"},400);
    if(website.length>300)return json({error:"website_too_long"},400);
    if(website){try{const u=new URL(website);if(!["http:","https:"].includes(u.protocol))throw new Error()}catch{return json({error:"invalid_website"},400)}}
    if(!hex32.test(nonce)||!hex64.test(profileHash))return json({error:"invalid_hash_or_nonce"},400);
    const signed=new Date(createdAt);
    if(Number.isNaN(signed.getTime())||Math.abs(Date.now()-signed.getTime())>10*60*1000)return json({error:"stale_or_future_timestamp"},400);

    const canonical={createdAt,displayName,issuerWallet,nonce,slug,website};
    const expectedHash=await sha256(stable(canonical));
    if(expectedHash!==profileHash)return json({error:"profile_hash_mismatch"},400);
    const expectedMessage=`EVO ISSUER TRUST V0\nWallet: ${issuerWallet}\nName: ${displayName}\nSlug: ${slug}\nWebsite: ${website||"N/A"}\nProfile hash: ${profileHash}\nSigned: ${createdAt}`;
    if(signatureMessage!==expectedMessage)return json({error:"signature_message_mismatch"},400);
    const valid=await verifyMessage({address:issuerWallet as `0x${string}`,message:expectedMessage,signature:signature as `0x${string}`});
    if(!valid)return json({error:"invalid_signature"},401);

    const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
    const {data:existing,error:existingError}=await db.from("evo_issuer_profiles")
      .select("issuer_wallet,status,created_at").eq("issuer_wallet",issuerWallet).maybeSingle();
    if(existingError)return json({error:"database_error"},500);
    if(existing?.status==="SUSPENDED")return json({error:"issuer_suspended"},403);

    try{await proveWallet(db,issuerWallet)}catch(e){const m=String((e as Error)?.message||e);return json({error:m},m==="issuer_suspended"?403:500)}

    const status=existing?.status&&["DOMAIN_VERIFIED","ORGANIZATION_VERIFIED"].includes(existing.status)?existing.status:"WALLET_PROVEN";
    const row={issuer_wallet:issuerWallet,display_name:displayName,slug,website,profile_hash:profileHash,nonce,signature,signature_message:signatureMessage,status,created_at:existing?.created_at||createdAt,updated_at:new Date().toISOString()};
    const {data,error}=await db.from("evo_issuer_profiles").upsert(row,{onConflict:"issuer_wallet"}).select("issuer_wallet,display_name,slug,website,status,created_at,updated_at,verified_at").single();
    if(error){
      if(error.code==="23505")return json({error:"slug_already_claimed"},409);
      console.error("issuer_profile_upsert",error.code);return json({error:"database_error"},500);
    }
    return json({ok:true,profile:data,meaning:"WALLET_PROVEN confirms control of this profile by the signing wallet. It does not by itself prove legal ownership of the displayed brand or organization."},200);
  }catch(err){console.error("issuer_registration_internal",err instanceof Error?err.name:"unknown");return json({error:"internal_error"},500)}
}

Deno.serve(async(req:Request)=>{
  const preflight=restrictedPreflight(req);
  if(preflight)return preflight;
  const denied=rejectUntrustedBrowserOrigin(req);
  if(denied)return denied;
  return withRestrictedCors(req,await handle(req));
});
