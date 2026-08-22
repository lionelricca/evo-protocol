import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.105.4";
import { verifyMessage } from "npm:viem@2.21.54";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
};
const MAX_BODY_BYTES=98_304;
const walletRe=/^0x[0-9a-f]{40}$/;
const modelRe=/^EBM-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
const passportRe=/^EBP-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
const sealRe=/^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/;
const hex64=/^[0-9a-f]{64}$/;
const ACTIONS=new Set(["requirements","assess","prepare_model","commit_model","get_model","prepare_passport","commit_passport","get_passport","export_dpp"]);

const REQUIREMENTS=[
{id:"manufacturerIdentity",label:"Manufacturer identity",access:"PUBLIC",reference:"Annex XIII 1(a) + Annex VI Part A(1)",conditional:false},
{id:"batteryCategory",label:"Battery category",access:"PUBLIC",reference:"Annex XIII 1(a) + Annex VI Part A(2)",conditional:false},
{id:"batteryIdentification",label:"Battery / model identification",access:"PUBLIC",reference:"Annex XIII 1(a) + Annex VI Part A(2)",conditional:false},
{id:"manufacturingPlace",label:"Place of manufacture",access:"PUBLIC",reference:"Annex XIII 1(a) + Annex VI Part A(3)",conditional:false},
{id:"manufactureDate",label:"Date of manufacture",access:"PUBLIC",reference:"Annex XIII 1(a) + Annex VI Part A(4)",conditional:false},
{id:"weightKg",label:"Weight",access:"PUBLIC",reference:"Annex XIII 1(a) + Annex VI Part A(5)",conditional:false},
{id:"capacityAh",label:"Capacity (Ah)",access:"PUBLIC",reference:"Annex XIII 1(a) + Annex VI Part A(6); Annex XIII 1(g)",conditional:false},
{id:"chemistry",label:"Battery chemistry",access:"PUBLIC",reference:"Annex XIII 1(a),(b)",conditional:false},
{id:"hazardousSubstances",label:"Hazardous substances",access:"PUBLIC",reference:"Annex XIII 1(a),(b)",conditional:false},
{id:"usableExtinguishingAgent",label:"Usable extinguishing agent",access:"PUBLIC",reference:"Annex XIII 1(a) + Annex VI Part A(9)",conditional:false},
{id:"criticalRawMaterials",label:"Critical raw materials",access:"PUBLIC",reference:"Annex XIII 1(a),(b)",conditional:false},
{id:"carbonFootprint",label:"Carbon footprint information",access:"PUBLIC",reference:"Annex XIII 1(c); Article 7",conditional:true},
{id:"responsibleSourcing",label:"Responsible sourcing / due diligence",access:"PUBLIC",reference:"Annex XIII 1(d); Article 52(3)",conditional:true},
{id:"recycledContent",label:"Recycled content information",access:"PUBLIC",reference:"Annex XIII 1(e); Article 8(1)",conditional:true},
{id:"renewableContentShare",label:"Share of renewable content",access:"PUBLIC",reference:"Annex XIII 1(f)",conditional:true},
{id:"voltageMinV",label:"Minimum voltage",access:"PUBLIC",reference:"Annex XIII 1(h)",conditional:false},
{id:"voltageNominalV",label:"Nominal voltage",access:"PUBLIC",reference:"Annex XIII 1(h)",conditional:false},
{id:"voltageMaxV",label:"Maximum voltage",access:"PUBLIC",reference:"Annex XIII 1(h)",conditional:false},
{id:"voltageTemperatureRange",label:"Voltage temperature range",access:"PUBLIC",reference:"Annex XIII 1(h)",conditional:true},
{id:"originalPowerW",label:"Original power capability",access:"PUBLIC",reference:"Annex XIII 1(i)",conditional:false},
{id:"powerLimits",label:"Power limits / temperature range",access:"PUBLIC",reference:"Annex XIII 1(i)",conditional:true},
{id:"expectedLifetimeCycles",label:"Expected lifetime in cycles",access:"PUBLIC",reference:"Annex XIII 1(j)",conditional:false},
{id:"lifetimeReferenceTest",label:"Cycle-life reference test",access:"PUBLIC",reference:"Annex XIII 1(j)",conditional:false},
{id:"capacityExhaustionThreshold",label:"Capacity threshold for exhaustion",access:"PUBLIC",reference:"Annex XIII 1(k)",conditional:true,categories:["EV"]},
{id:"storageTemperatureRange",label:"Non-use storage temperature range",access:"PUBLIC",reference:"Annex XIII 1(l)",conditional:false},
{id:"commercialWarrantyPeriod",label:"Commercial warranty calendar period",access:"PUBLIC",reference:"Annex XIII 1(m)",conditional:false},
{id:"roundTripEfficiencyInitial",label:"Initial round-trip energy efficiency",access:"PUBLIC",reference:"Annex XIII 1(n)",conditional:false},
{id:"roundTripEfficiencyHalfLife",label:"Round-trip efficiency at 50% cycle-life",access:"PUBLIC",reference:"Annex XIII 1(n)",conditional:false},
{id:"cellResistance",label:"Internal cell resistance",access:"PUBLIC",reference:"Annex XIII 1(o)",conditional:false},
{id:"packResistance",label:"Internal pack resistance",access:"PUBLIC",reference:"Annex XIII 1(o)",conditional:false},
{id:"cycleLifeTestCRate",label:"C-rate of cycle-life test",access:"PUBLIC",reference:"Annex XIII 1(p)",conditional:false},
{id:"markingRequirements",label:"Required markings",access:"PUBLIC",reference:"Annex XIII 1(q); Article 13(4),(5)",conditional:true},
{id:"euDeclarationOfConformity",label:"EU declaration of conformity",access:"PUBLIC",reference:"Annex XIII 1(r); Article 18",conditional:false},
{id:"wastePreventionManagement",label:"Waste prevention and management information",access:"PUBLIC",reference:"Annex XIII 1(s); Article 74(1)(a)-(f)",conditional:false},
{id:"detailedComposition",label:"Detailed cathode/anode/electrolyte composition",access:"LEGITIMATE_INTEREST",reference:"Annex XIII 2(a)",conditional:false},
{id:"replacementParts",label:"Replacement part numbers and sources",access:"LEGITIMATE_INTEREST",reference:"Annex XIII 2(b)",conditional:false},
{id:"explodedDiagrams",label:"Exploded diagrams / cell location",access:"LEGITIMATE_INTEREST",reference:"Annex XIII 2(c)",conditional:false},
{id:"disassemblySequence",label:"Disassembly sequence",access:"LEGITIMATE_INTEREST",reference:"Annex XIII 2(c)",conditional:false},
{id:"fasteningTechniques",label:"Fastening techniques",access:"LEGITIMATE_INTEREST",reference:"Annex XIII 2(c)",conditional:false},
{id:"disassemblyTools",label:"Tools required for disassembly",access:"LEGITIMATE_INTEREST",reference:"Annex XIII 2(c)",conditional:false},
{id:"damageWarnings",label:"Warnings about risk of damage",access:"LEGITIMATE_INTEREST",reference:"Annex XIII 2(c)",conditional:false},
{id:"cellCountAndLayout",label:"Cell count and layout",access:"LEGITIMATE_INTEREST",reference:"Annex XIII 2(c)",conditional:false},
{id:"safetyMeasures",label:"Safety measures",access:"LEGITIMATE_INTEREST",reference:"Annex XIII 2(d)",conditional:false},
{id:"complianceTestReports",label:"Compliance test report results",access:"AUTHORITY",reference:"Annex XIII 3",conditional:false},
{id:"performanceDurabilityValues",label:"Performance and durability values",access:"INDIVIDUAL_LEGITIMATE_INTEREST",reference:"Annex XIII 4(a); Article 10(1)",conditional:false},
{id:"stateOfHealth",label:"State of health",access:"INDIVIDUAL_LEGITIMATE_INTEREST",reference:"Annex XIII 4(b); Article 14",conditional:false},
{id:"batteryStatus",label:"Original / repurposed / re-used / remanufactured / waste status",access:"INDIVIDUAL_LEGITIMATE_INTEREST",reference:"Annex XIII 4(c)",conditional:false},
{id:"usageCycles",label:"Charge/discharge cycle data",access:"INDIVIDUAL_LEGITIMATE_INTEREST",reference:"Annex XIII 4(d)",conditional:false},
{id:"negativeEvents",label:"Negative events / accidents",access:"INDIVIDUAL_LEGITIMATE_INTEREST",reference:"Annex XIII 4(d)",conditional:false},
{id:"operatingTemperature",label:"Operating environmental temperature history",access:"INDIVIDUAL_LEGITIMATE_INTEREST",reference:"Annex XIII 4(d)",conditional:false},
{id:"stateOfChargeHistory",label:"State of charge history",access:"INDIVIDUAL_LEGITIMATE_INTEREST",reference:"Annex XIII 4(d)",conditional:false},
] as const;

type AnyRecord=Record<string,any>;
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}})}
function hex(bytes:Uint8Array){return [...bytes].map(b=>b.toString(16).padStart(2,"0")).join("")}
async function sha256(text:string){return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text))))}
function deepNormalize(value:any):any{if(typeof value==="string")return value.trim();if(Array.isArray(value))return value.map(deepNormalize);if(value&&typeof value==="object"){const out:AnyRecord={};for(const key of Object.keys(value).sort())out[key]=deepNormalize(value[key]);return out}return value}
function canonical(value:any){return JSON.stringify(deepNormalize(value))}
function idFromHash(prefix:string,hash:string){return `${prefix}-${hash.slice(0,8).toUpperCase()}-${hash.slice(8,16).toUpperCase()}-${hash.slice(16,24).toUpperCase()}`}
function present(v:any){if(v===null||v===undefined)return false;if(typeof v==="string")return v.trim().length>0;if(Array.isArray(v))return v.length>0;if(typeof v==="object")return Object.keys(v).length>0;return true}
function signatureBounds(signature:any,message:any){const s=String(signature||""),m=String(message||"");return s.length>=1&&s.length<=512&&m.length>=1&&m.length<=2048}
function secretKey(){const modern=Deno.env.get("SUPABASE_SECRET_KEYS");if(modern){try{const keys=JSON.parse(modern);if(typeof keys?.default==="string")return keys.default;const first=Object.values(keys).find(v=>typeof v==="string");if(typeof first==="string")return first}catch{}}const legacy=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!legacy)throw new Error("server_secret_unavailable");return legacy}
function dbClient(){return createClient(Deno.env.get("SUPABASE_URL")!,secretKey(),{auth:{persistSession:false}})}
function applicability(category:string,energy:any){const c=String(category||"").toUpperCase(),kwh=Number(energy);if(c==="EV"||c==="LMT")return{state:"LIKELY_REQUIRED",reason:"Article 77(1) category"};if(c==="INDUSTRIAL"&&Number.isFinite(kwh)&&kwh>2)return{state:"LIKELY_REQUIRED",reason:"Industrial battery > 2 kWh under Article 77(1)"};if(c==="INDUSTRIAL"&&Number.isFinite(kwh)&&kwh<=2)return{state:"NOT_APPLICABLE_BY_ART77_1",reason:"Industrial battery is not greater than 2 kWh"};return{state:"NEEDS_CLASSIFICATION_REVIEW",reason:"Battery category or energy threshold needs review"}}
function requirementApplies(req:any,category:string){return !req.categories||req.categories.includes(category)}
function requirementInScope(req:any,scope:string){if(scope==="INDIVIDUAL")return req.access==="INDIVIDUAL_LEGITIMATE_INTEREST";return req.access!=="INDIVIDUAL_LEGITIMATE_INTEREST"}
function assessBattery(battery:AnyRecord){const category=String(battery?.batteryCategory||battery?.category||"").toUpperCase();const energy=battery?.nominalEnergyKwh;const scope=String(battery?.scope||"MODEL").toUpperCase();const fields=deepNormalize(battery?.fields||{});const na=new Set((Array.isArray(battery?.notApplicable)?battery.notApplicable:[]).map((x:any)=>String(x)));const app=scope==="INDIVIDUAL"?{state:"INDIVIDUAL_DATA_SCOPE",reason:"Annex XIII point 4"}:applicability(category,energy);const rows:any[]=[];let complete=0,total=0;for(const req of REQUIREMENTS){if(!requirementInScope(req,scope))continue;if(!requirementApplies(req,category)){rows.push({...req,status:"NOT_APPLICABLE",reason:"Not applicable to selected category"});continue}total++;if(present(fields[req.id])){complete++;rows.push({...req,status:"READY"})}else if(req.conditional&&na.has(req.id)){complete++;rows.push({...req,status:"NOT_APPLICABLE",reason:"Declared not applicable; evidence should be retained"})}else rows.push({...req,status:"MISSING_DATA",reason:req.conditional?"Conditional requirement unresolved or missing":"Required passport data missing"})}const score=total?Math.round(complete/total*100):0;const missing=rows.filter(r=>r.status==="MISSING_DATA");const publicRows=rows.filter(r=>r.access==="PUBLIC"),publicComplete=publicRows.filter(r=>r.status!=="MISSING_DATA").length;const publicScore=publicRows.length?Math.round(publicComplete/publicRows.length*100):0;return{engine:"EVO Battery Passport Compliance Engine V0.2",legalPosition:"READINESS_ASSESSMENT_NOT_CERTIFICATION",regulation:"EU 2023/1542",deadline:"2027-02-18",scope,applicability:app,score,publicScore,state:scope!=="INDIVIDUAL"&&app.state==="NOT_APPLICABLE_BY_ART77_1"?"NOT_APPLICABLE":missing.length?"MISSING_DATA":"READY",counts:{total,complete,missing:missing.length,publicTotal:publicRows.length,publicComplete},missing:missing.map(r=>({id:r.id,label:r.label,access:r.access,reference:r.reference,conditional:r.conditional})),requirements:rows}}
function splitFields(fields:AnyRecord,notApplicable:string[]=[]){const blocks:any={PUBLIC:{fields:{},notApplicable:[]},LEGITIMATE_INTEREST:{fields:{},notApplicable:[]},AUTHORITY:{fields:{},notApplicable:[]},INDIVIDUAL_LEGITIMATE_INTEREST:{fields:{},notApplicable:[]}};const na=new Set(notApplicable);for(const req of REQUIREMENTS){if(present(fields?.[req.id]))blocks[req.access].fields[req.id]=deepNormalize(fields[req.id]);if(na.has(req.id))blocks[req.access].notApplicable.push(req.id)}return blocks}
function modelMessage(modelId:string,dataHash:string,wallet:string,signedAt:string){return `EVO BATTERY MODEL V0\nModel ID: ${modelId}\nData Hash: ${dataHash}\nIssuer: ${wallet}\nSigned: ${signedAt}`}
function passportMessage(passportId:string,dataHash:string,wallet:string,signedAt:string){return `EVO BATTERY PASSPORT V0\nPassport ID: ${passportId}\nData Hash: ${dataHash}\nIssuer: ${wallet}\nSigned: ${signedAt}`}
function freshTimestamp(signedAt:string){const ms=Date.parse(signedAt);if(Number.isNaN(ms))return false;const age=Date.now()-ms;return age<=10*60*1000&&age>=-60*1000}
function mergeModelBlocks(state:any){const fields={...(state?.publicData?.fields||{}),...(state?.legitimateInterestData?.fields||{}),...(state?.authorityData?.fields||{})};const notApplicable=[...(state?.publicData?.notApplicable||[]),...(state?.legitimateInterestData?.notApplicable||[]),...(state?.authorityData?.notApplicable||[])];return{fields,notApplicable}}
function rpcError(message:string,code:string){if(message.includes("model_id_conflict")||message.includes("unique_model_identifier_conflict"))return["model_conflict",409];if(message.includes("passport_id_conflict")||message.includes("unique_battery_identifier_conflict")||message.includes("passport_version_conflict"))return["passport_conflict",409];if(message.includes("issuer_does_not_control_ready_model"))return["issuer_does_not_control_ready_model",403];if(message.includes("seal_not_owned_by_issuer"))return["seal_not_owned_by_issuer",403];if(code==="23505")return["registry_conflict",409];return["database_error",500] as const}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({error:"method_not_allowed"},405);
  try{
    const declaredLength=Number(req.headers.get("content-length")||"0");
    if(declaredLength>MAX_BODY_BYTES)return json({error:"payload_too_large"},413);
    const raw=await req.text();
    if(new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES)return json({error:"payload_too_large"},413);
    let body:AnyRecord;
    try{body=JSON.parse(raw||"{}")}catch{return json({error:"invalid_json"},400)}
    const action=String(body?.action||"requirements").toLowerCase();
    if(!ACTIONS.has(action))return json({error:"invalid_action"},400);

    if(action==="requirements")return json({ok:true,schemaVersion:"EVO-BATTERY-DPP-SCHEMA-V0.2",requirements:REQUIREMENTS,accessLevels:["PUBLIC","LEGITIMATE_INTEREST","AUTHORITY","INDIVIDUAL_LEGITIMATE_INTEREST"],registryIntegration:"NOT_IMPLEMENTED",accessPolicyVersion:"EVO-DPP-ACCESS-POLICY-DRAFT-2026-08",note:"Readiness mapping only; not legal certification."});
    if(action==="assess")return json({ok:true,assessment:assessBattery(body?.battery||{})});

    if(action==="prepare_model"){
      const issuerWallet=String(body?.issuerWallet||"").toLowerCase(),battery=deepNormalize(body?.battery||{});
      if(!walletRe.test(issuerWallet))return json({error:"invalid_issuer_wallet"},400);
      const category=String(battery?.batteryCategory||"").toUpperCase();
      if(!["LMT","INDUSTRIAL","EV","OTHER"].includes(category))return json({error:"invalid_battery_category"},400);
      const uniqueModelIdentifier=String(battery?.uniqueModelIdentifier||"").trim(),modelName=String(battery?.modelName||"").trim();
      if(!uniqueModelIdentifier||uniqueModelIdentifier.length>240||!modelName||modelName.length>240)return json({error:"model_identity_required"},400);
      const fields=deepNormalize(battery?.fields||{}),notApplicable=Array.isArray(battery?.notApplicable)?battery.notApplicable.map((x:any)=>String(x)):[],blocks=splitFields(fields,notApplicable);
      const energy=battery?.nominalEnergyKwh===""||battery?.nominalEnergyKwh==null?null:Number(battery.nominalEnergyKwh);
      if(energy!==null&&(!Number.isFinite(energy)||energy<0))return json({error:"invalid_nominal_energy"},400);
      const modelState={schemaVersion:"EVO-BATTERY-MODEL-V0",issuerWallet,uniqueModelIdentifier,modelName,batteryCategory:category,nominalEnergyKwh:energy,publicData:blocks.PUBLIC,legitimateInterestData:blocks.LEGITIMATE_INTEREST,authorityData:blocks.AUTHORITY};
      const dataHash=await sha256(canonical(modelState)),modelId=idFromHash("EBM",dataHash),signedAt=new Date().toISOString(),signatureMessage=modelMessage(modelId,dataHash,issuerWallet,signedAt);
      return json({ok:true,modelId,dataHash,signedAt,signatureMessage,modelState,assessment:assessBattery({...battery,batteryCategory:category,scope:"MODEL"})});
    }

    if(action==="commit_model"){
      const p=body?.payload||{},issuerWallet=String(p?.issuerWallet||"").toLowerCase(),modelState=deepNormalize(p?.modelState||{}),submittedModelId=String(p?.modelId||"").toUpperCase(),submittedHash=String(p?.dataHash||"").toLowerCase(),signedAt=String(p?.signedAt||""),signatureMessage=String(p?.signatureMessage||""),signature=String(p?.signature||"");
      if(!walletRe.test(issuerWallet)||!modelRe.test(submittedModelId)||!hex64.test(submittedHash)||!freshTimestamp(signedAt)||!signatureBounds(signature,signatureMessage))return json({error:"invalid_or_stale_payload"},400);
      if(String(modelState?.issuerWallet||"").toLowerCase()!==issuerWallet)return json({error:"issuer_payload_mismatch"},400);
      const expectedHash=await sha256(canonical(modelState)),expectedId=idFromHash("EBM",expectedHash),expectedMessage=modelMessage(expectedId,expectedHash,issuerWallet,signedAt);
      if(expectedHash!==submittedHash||expectedId!==submittedModelId||expectedMessage!==signatureMessage)return json({error:"model_integrity_mismatch"},400);
      const valid=await verifyMessage({address:issuerWallet as `0x${string}`,message:expectedMessage,signature:signature as `0x${string}`});if(!valid)return json({error:"invalid_signature"},401);
      const merged=mergeModelBlocks(modelState),assessment=assessBattery({batteryCategory:modelState.batteryCategory,nominalEnergyKwh:modelState.nominalEnergyKwh,fields:merged.fields,notApplicable:merged.notApplicable,scope:"MODEL"}),recordStatus=assessment.state==="READY"?"ACTIVE":"DRAFT",db=dbClient();
      const row={model_id:expectedId,schema_version:"EVO-BATTERY-MODEL-V0",issuer_wallet:issuerWallet,unique_model_identifier:String(modelState.uniqueModelIdentifier),model_name:String(modelState.modelName),battery_category:String(modelState.batteryCategory),nominal_energy_kwh:modelState.nominalEnergyKwh,public_data:modelState.publicData||{},legitimate_interest_data:modelState.legitimateInterestData||{},authority_data:modelState.authorityData||{},data_hash:expectedHash,signature,signature_message:expectedMessage,signed_at:signedAt,status:recordStatus};
      const {data,error}=await db.rpc("evo_register_battery_model_authoritative",{p_row:row}).single();
      if(error){const [e,s]=rpcError(String(error.message||""),String(error.code||""));console.error(error.code||"battery_model_rpc_error");return json({error:e},s as number)}
      return json({ok:true,model:{model_id:data.modelId,data_hash:data.dataHash,status:data.status,created_at:data.createdAt},idempotent:Boolean(data.idempotent),assessment,atomicAuthority:true},201);
    }

    if(action==="get_model"){
      const modelId=String(body?.modelId||"").trim().toUpperCase();if(!modelRe.test(modelId))return json({error:"invalid_model_id"},400);
      const db=dbClient();const {data,error}=await db.from("evo_battery_models").select("model_id,unique_model_identifier,model_name,battery_category,nominal_energy_kwh,public_data,data_hash,status,created_at,updated_at").eq("model_id",modelId).eq("status","ACTIVE").maybeSingle();
      if(error)return json({error:"database_error"},500);if(!data)return json({error:"model_not_found_or_not_public"},404);return json({ok:true,model:data,access:"PUBLIC"});
    }

    if(action==="prepare_passport"){
      const issuerWallet=String(body?.issuerWallet||"").toLowerCase(),p=deepNormalize(body?.passport||{});if(!walletRe.test(issuerWallet))return json({error:"invalid_issuer_wallet"},400);
      const modelId=String(p?.modelId||"").toUpperCase();if(!modelRe.test(modelId))return json({error:"invalid_model_id"},400);
      const uniqueBatteryIdentifier=String(p?.uniqueBatteryIdentifier||"").trim();if(!uniqueBatteryIdentifier||uniqueBatteryIdentifier.length>320)return json({error:"unique_battery_identifier_required"},400);
      const status=String(p?.batteryStatus||"ORIGINAL").toUpperCase();if(!["ORIGINAL","REPURPOSED","REUSED","REMANUFACTURED","WASTE"].includes(status))return json({error:"invalid_battery_status"},400);
      const sealId=p?.sealId?String(p.sealId).toUpperCase():null;if(sealId&&!sealRe.test(sealId))return json({error:"invalid_seal_id"},400);
      const db=dbClient();const {data:model,error:modelError}=await db.from("evo_battery_models").select("model_id,issuer_wallet,status").eq("model_id",modelId).maybeSingle();if(modelError)return json({error:"database_error"},500);if(!model||model.status!=="ACTIVE")return json({error:"model_not_ready"},409);if(String(model.issuer_wallet).toLowerCase()!==issuerWallet)return json({error:"issuer_does_not_control_model"},403);
      if(sealId){const {data:seal,error:sealError}=await db.from("evo_seals").select("seal_id,issuer_wallet,status").eq("seal_id",sealId).maybeSingle();if(sealError)return json({error:"database_error"},500);if(!seal||String(seal.issuer_wallet).toLowerCase()!==issuerWallet||seal.status!=="ACTIVE")return json({error:"seal_not_owned_by_issuer"},403)}
      const rawIndividual=deepNormalize(p?.individualData?.fields||p?.individualData||{});rawIndividual.batteryStatus=status;const indNA=Array.isArray(p?.individualData?.notApplicable)?p.individualData.notApplicable.map((x:any)=>String(x)):[];const indBlock=splitFields(rawIndividual,indNA).INDIVIDUAL_LEGITIMATE_INTEREST;
      const passportState={schemaVersion:"EVO-BATTERY-PASSPORT-V0",modelId,uniqueBatteryIdentifier,batterySerial:String(p?.batterySerial||"").slice(0,240),sealId,issuerWallet,batteryStatus:status,individualData:indBlock};
      const dataHash=await sha256(canonical(passportState)),passportId=idFromHash("EBP",dataHash),signedAt=new Date().toISOString(),signatureMessage=passportMessage(passportId,dataHash,issuerWallet,signedAt),assessment=assessBattery({scope:"INDIVIDUAL",fields:indBlock.fields,notApplicable:indBlock.notApplicable});
      return json({ok:true,passportId,dataHash,signedAt,signatureMessage,passportState,assessment});
    }

    if(action==="commit_passport"){
      const p=body?.payload||{},issuerWallet=String(p?.issuerWallet||"").toLowerCase(),state=deepNormalize(p?.passportState||{}),submittedId=String(p?.passportId||"").toUpperCase(),submittedHash=String(p?.dataHash||"").toLowerCase(),signedAt=String(p?.signedAt||""),signatureMessage=String(p?.signatureMessage||""),signature=String(p?.signature||"");
      if(!walletRe.test(issuerWallet)||!passportRe.test(submittedId)||!hex64.test(submittedHash)||!freshTimestamp(signedAt)||!signatureBounds(signature,signatureMessage))return json({error:"invalid_or_stale_payload"},400);
      if(String(state?.issuerWallet||"").toLowerCase()!==issuerWallet)return json({error:"issuer_payload_mismatch"},400);
      const expectedHash=await sha256(canonical(state)),expectedId=idFromHash("EBP",expectedHash),expectedMessage=passportMessage(expectedId,expectedHash,issuerWallet,signedAt);if(expectedHash!==submittedHash||expectedId!==submittedId||expectedMessage!==signatureMessage)return json({error:"passport_integrity_mismatch"},400);
      const valid=await verifyMessage({address:issuerWallet as `0x${string}`,message:expectedMessage,signature:signature as `0x${string}`});if(!valid)return json({error:"invalid_signature"},401);
      const snapshot=deepNormalize({...state,dataHash:expectedHash,passportId:expectedId}),snapshotHash=await sha256(canonical(snapshot));
      const passportRow={passport_id:expectedId,schema_version:"EVO-BATTERY-PASSPORT-V0",model_id:String(state.modelId),unique_battery_identifier:String(state.uniqueBatteryIdentifier),battery_serial:String(state.batterySerial||"")||null,seal_id:state.sealId||null,issuer_wallet:issuerWallet,battery_status:String(state.batteryStatus),individual_data:state.individualData||{},data_hash:expectedHash,signature,signature_message:expectedMessage,signed_at:signedAt,status:"ACTIVE"};
      const versionRow={passport_id:expectedId,version_no:1,snapshot,snapshot_hash:snapshotHash,actor_wallet:issuerWallet,signature,signature_message:expectedMessage,signed_at:signedAt};
      const db=dbClient();const {data,error}=await db.rpc("evo_register_battery_passport_atomic",{p_passport:passportRow,p_version:versionRow}).single();
      if(error){const [e,s]=rpcError(String(error.message||""),String(error.code||""));console.error(error.code||"battery_passport_rpc_error");return json({error:e},s as number)}
      return json({ok:true,passport:{passport_id:data.passportId,model_id:data.modelId,status:data.status,created_at:data.createdAt},version:data.version,snapshotHash:data.snapshotHash,idempotent:Boolean(data.idempotent),atomic:true},201);
    }

    if(action==="get_passport"||action==="export_dpp"){
      const passportId=String(body?.passportId||"").trim().toUpperCase();if(!passportRe.test(passportId))return json({error:"invalid_passport_id"},400);
      const db=dbClient();
      const {data:passport,error}=await db.from("evo_battery_passports").select("passport_id,model_id,unique_battery_identifier,battery_serial,seal_id,issuer_wallet,battery_status,data_hash,status,created_at,updated_at").eq("passport_id",passportId).eq("status","ACTIVE").maybeSingle();
      if(error)return json({error:"database_error"},500);if(!passport)return json({error:"passport_not_found"},404);
      const {data:model,error:modelError}=await db.from("evo_battery_models").select("model_id,unique_model_identifier,model_name,battery_category,nominal_energy_kwh,public_data,data_hash,status,created_at,updated_at").eq("model_id",passport.model_id).eq("status","ACTIVE").maybeSingle();
      if(modelError)return json({error:"database_error"},500);
      if(action==="get_passport")return json({ok:true,passport,model,access:"PUBLIC",restrictedDataExcluded:true});
      const exportObject={
        profileVersion:"EVO-EU-BATTERY-DPP-2026-01",
        legalPosition:"INTEROPERABILITY_EXPORT_NOT_CERTIFICATION",
        regulation:"EU 2023/1542",
        registryState:"NOT_REGISTERED_BY_EVO",
        accessPolicyVersion:"EVO-DPP-ACCESS-POLICY-DRAFT-2026-08",
        identifiers:{passportId:passport.passport_id,uniqueBatteryIdentifier:passport.unique_battery_identifier,uniqueModelIdentifier:model?.unique_model_identifier||null,sealId:passport.seal_id||null},
        economicOperator:{issuerWallet:passport.issuer_wallet},
        battery:{batterySerial:passport.battery_serial,batteryStatus:passport.battery_status,batteryCategory:model?.battery_category||null,nominalEnergyKwh:model?.nominal_energy_kwh??null,modelName:model?.model_name||null},
        publicData:model?.public_data||{},
        evidence:{passportDataHash:passport.data_hash,modelDataHash:model?.data_hash||null,evoProofRef:passport.seal_id||null},
        interoperability:{mediaType:"application/json",machineReadable:true,structured:true,portable:true,vendorLockIn:"NONE_BY_DESIGN",registryIntegration:"NOT_IMPLEMENTED"},
      };
      const exportHash=await sha256(canonical(exportObject));
      return json({ok:true,profile:exportObject,exportHash,restrictedDataExcluded:true});
    }

    return json({error:"invalid_action"},400);
  }catch(err){console.error(err instanceof Error?err.name:"unknown");return json({error:"internal_error"},500)}
});
