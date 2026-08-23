import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";
import { verifyMessage } from "npm:viem@2.21.54";
import { rejectUntrustedBrowserOrigin, restrictedPreflight, withRestrictedCors } from "../_shared/evo-cors.ts";

const WALLET_RE=/^0x[0-9a-fA-F]{40}$/;
const CLIENT_RE=/^[0-9a-f]{64}$/;
const MAX_BODY_BYTES=4096;

function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}})}
async function sha256(text:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));return [...new Uint8Array(d)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function requestIp(req:Request){
  const forwarded=String(req.headers.get("x-forwarded-for")||"").split(",")[0].trim();
  return String(req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||forwarded||"").trim().slice(0,128);
}
async function signalHashes(req:Request,clientId:string){
  const pepper=String(Deno.env.get("EVO_TRIAL_PEPPER")||"");
  if(pepper.length<32)throw new Error("trial_guard_not_configured");
  const ip=requestIp(req);if(!ip)throw new Error("trial_network_signal_unavailable");
  return {
    clientHash:await sha256(`EVO-FREE-V400|CLIENT|${pepper}|${clientId}`),
    networkHash:await sha256(`EVO-FREE-V400|NETWORK|${pepper}|${ip}`),
  };
}
function sealMessageForWallet(message:string,wallet:string){
  return message.startsWith("EVO SEAL V1\n")&&message.includes(`\nIssuer: ${wallet}\n`)&&message.length<=2048;
}

async function handle(req:Request){
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  const declared=Number(req.headers.get("content-length")||"0");if(declared>MAX_BODY_BYTES)return json({error:"request_too_large"},413);
  const raw=await req.text();if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES)return json({error:"request_too_large"},413);
  let body:Record<string,unknown>;try{body=JSON.parse(raw||"{}")}catch{return json({error:"invalid_json"},400)}
  const action=String(body.action||"");
  const wallet=String(body.wallet||"").toLowerCase();
  const clientId=String(body.clientId||"").toLowerCase();
  if(!WALLET_RE.test(wallet))return json({error:"invalid_wallet"},400);
  if(!CLIENT_RE.test(clientId))return json({error:"invalid_client_id"},400);

  let hashes:{clientHash:string;networkHash:string};
  try{hashes=await signalHashes(req,clientId)}catch(error){return json({error:error instanceof Error?error.message:"trial_guard_unavailable",policy:"V400_ANTISYBIL",eligible:false},503)}

  const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});

  if(action==="status"){
    const {data,error}=await supabase.rpc("evo_free_proof_status",{p_wallet:wallet,p_client_hash:hashes.clientHash,p_network_hash:hashes.networkHash}).single();
    if(error){console.error(error);return json({error:"trial_status_unavailable",policy:"V400_ANTISYBIL",eligible:false},503)}
    return json({ok:true,policy:"V400_ANTISYBIL",eligible:Boolean(data?.eligible),reason:String(data?.reason||"unknown"),paidAvailable:Boolean(data?.paid_available),reserved:Boolean(data?.reserved)});
  }

  if(action==="reserve"){
    const signature=String(body.signature||"");
    const signatureMessage=String(body.signatureMessage||"");
    if(signature.length<1||signature.length>512||!sealMessageForWallet(signatureMessage,wallet))return json({error:"invalid_signature_evidence"},400);
    let valid=false;try{valid=await verifyMessage({address:wallet as `0x${string}`,message:signatureMessage,signature:signature as `0x${string}`})}catch{valid=false}
    if(!valid)return json({error:"invalid_signature"},401);
    const {data,error}=await supabase.rpc("evo_reserve_free_proof",{p_wallet:wallet,p_client_hash:hashes.clientHash,p_network_hash:hashes.networkHash}).single();
    if(error){console.error(error);return json({error:"trial_reservation_failed",policy:"V400_ANTISYBIL",eligible:false},503)}
    if(!data?.eligible)return json({ok:false,policy:"V400_ANTISYBIL",eligible:false,reason:String(data?.reason||"not_eligible")},409);
    return json({ok:true,policy:"V400_ANTISYBIL",eligible:true,reason:String(data?.reason||"reserved"),expiresAt:data?.expires_at||null});
  }

  return json({error:"invalid_action"},400);
}

Deno.serve(async req=>{
  const preflight=restrictedPreflight(req);if(preflight)return preflight;
  const denied=rejectUntrustedBrowserOrigin(req);if(denied)return denied;
  return withRestrictedCors(req,await handle(req));
});
