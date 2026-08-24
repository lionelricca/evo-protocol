import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";
import { verifyMessage } from "npm:viem@2.21.54";
import { rejectUntrustedBrowserOrigin, restrictedPreflight, withRestrictedCors } from "../_shared/evo-cors.ts";

const MAX_BODY_BYTES=8192;
const walletRe=/^0x[0-9a-f]{40}$/;
const hex64=/^[0-9a-f]{64}$/;
const hex32=/^[0-9a-f]{32}$/;
const submissionRe=/^EOG-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}})}
function stable(obj:Record<string,unknown>){return JSON.stringify(Object.keys(obj).sort().reduce((a,k)=>(a[k]=typeof obj[k]==="string"?String(obj[k]).trim():obj[k],a),{} as Record<string,unknown>))}
async function sha256(text:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function issuerIdFor(wallet:string){const h=(await sha256(`EVO-ISSUER-V1|${wallet}`)).toUpperCase();return `EVO-I-${h.slice(0,8)}-${h.slice(8,16)}-${h.slice(16,24)}`}
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
    const s=body?.submission&&typeof body.submission==="object"&&!Array.isArray(body.submission)?body.submission as Record<string,unknown>:null;
    if(!s)return json({error:"invalid_payload"},400);

    const issuerWallet=String(s.issuerWallet||"").toLowerCase();
    const legalName=String(s.legalName||"").trim();
    const countryCode=String(s.countryCode||"").trim().toUpperCase();
    const registryType=String(s.registryType||"").trim();
    const registryReferenceHash=String(s.registryReferenceHash||"").toLowerCase();
    const evidenceHash=String(s.evidenceHash||"").toLowerCase();
    const publicReferenceUrl=String(s.publicReferenceUrl||"").trim();
    const createdAt=String(s.createdAt||"");
    const nonce=String(s.nonce||"").toLowerCase();
    const payloadHash=String(s.payloadHash||"").toLowerCase();
    const submissionId=String(s.submissionId||"").trim().toUpperCase();
    const signature=String(s.signature||"");
    const signatureMessage=String(s.signatureMessage||"");

    if(!walletRe.test(issuerWallet))return json({error:"invalid_wallet"},400);
    if(legalName.length>180)return json({error:"invalid_legal_name"},400);
    if(!/^[A-Z]{2}$/.test(countryCode))return json({error:"invalid_country_code"},400);
    if(registryType.length<2||registryType.length>80)return json({error:"invalid_registry_type"},400);
    if(!hex64.test(registryReferenceHash))return json({error:"invalid_registry_reference_hash"},400);
    if(evidenceHash&&!hex64.test(evidenceHash))return json({error:"invalid_evidence_hash"},400);
    if(!hex32.test(nonce)||!hex64.test(payloadHash)||!submissionRe.test(submissionId))return json({error:"invalid_hash_nonce_or_id"},400);
    if(publicReferenceUrl.length>500)return json({error:"public_reference_too_long"},400);
    if(publicReferenceUrl){try{const u=new URL(publicReferenceUrl);if(u.protocol!=="https:")throw new Error()}catch{return json({error:"invalid_public_reference_url"},400)}}
    const created=new Date(createdAt);
    if(Number.isNaN(created.getTime())||Math.abs(Date.now()-created.getTime())>10*60*1000)return json({error:"stale_or_future_timestamp"},400);

    const canonical={createdAt,countryCode,evidenceHash,issuerWallet,legalName,nonce,publicReferenceUrl,registryReferenceHash,registryType};
    const expectedHash=await sha256(stable(canonical));
    if(expectedHash!==payloadHash)return json({error:"payload_hash_mismatch"},400);
    const expectedId=`EOG-${expectedHash.slice(0,8).toUpperCase()}-${expectedHash.slice(8,16).toUpperCase()}-${expectedHash.slice(16,24).toUpperCase()}`;
    if(expectedId!==submissionId)return json({error:"submission_id_mismatch"},400);
    const signedLegalName=legalName||"UNRESOLVED";
    const expectedMessage=`EVO ORGANIZATION EVIDENCE V0\nSubmission ID: ${submissionId}\nWallet: ${issuerWallet}\nLegal name: ${signedLegalName}\nCountry: ${countryCode}\nRegistry type: ${registryType}\nRegistry reference hash: ${registryReferenceHash}\nEvidence hash: ${evidenceHash||"N/A"}\nPublic reference: ${publicReferenceUrl||"N/A"}\nPayload hash: ${payloadHash}\nCreated: ${createdAt}`;
    if(signatureMessage!==expectedMessage)return json({error:"signature_message_mismatch"},400);
    const valid=await verifyMessage({address:issuerWallet as `0x${string}`,message:expectedMessage,signature:signature as `0x${string}`});
    if(!valid)return json({error:"invalid_signature"},401);

    const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
    try{await proveWallet(db,issuerWallet)}catch(e){const m=String((e as Error)?.message||e);return json({error:m},m==="issuer_suspended"?403:500)}

    const {data:last,error:lastError}=await db.from("evo_organization_submissions").select("created_at").eq("issuer_wallet",issuerWallet).order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(lastError)return json({error:"database_error"},500);
    if(last&&Date.now()-new Date(last.created_at).getTime()<30_000)return json({error:"rate_limited"},429);

    const {error:supersedeError}=await db.from("evo_organization_submissions").update({status:"SUPERSEDED"}).eq("issuer_wallet",issuerWallet).eq("status","PENDING");
    if(supersedeError)return json({error:"database_error"},500);
    const row={submission_id:submissionId,issuer_wallet:issuerWallet,legal_name:legalName,country_code:countryCode,registry_type:registryType,registry_reference_hash:registryReferenceHash,public_reference_url:publicReferenceUrl,evidence_hash:evidenceHash,evidence_file_name:"",payload_hash:payloadHash,nonce,signature,signature_message:signatureMessage,status:"PENDING",created_at:createdAt};
    const {error}=await db.from("evo_organization_submissions").insert(row);
    if(error){
      if(error.code==="23505")return json({error:"submission_conflict_or_pending_exists"},409);
      console.error("organization_submission_insert",error.code);return json({error:"database_error"},500);
    }

    return json({ok:true,submission:{submissionId,status:"PENDING",legalName,legalNameResolved:!!legalName,countryCode,registryType,evidenceHash:!!evidenceHash,publicReference:!!publicReferenceUrl,createdAt},meaning:"PENDING REVIEW means the wallet submitted signed organization evidence. The legal organization name may remain unresolved until independent review. It is not an EVO organization verification until that review approves it."},201);
  }catch(err){console.error("organization_submission_internal",err instanceof Error?err.name:"unknown");return json({error:"internal_error"},500)}
}

Deno.serve(async(req:Request)=>{
  const preflight=restrictedPreflight(req);
  if(preflight)return preflight;
  const denied=rejectUntrustedBrowserOrigin(req);
  if(denied)return denied;
  return withRestrictedCors(req,await handle(req));
});
