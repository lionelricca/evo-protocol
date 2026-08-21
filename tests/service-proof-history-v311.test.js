'use strict';

const fs=require('fs');
const assert=require('assert');

const src=fs.readFileSync('v1/service-proof-v311-history.js','utf8');

assert(src.includes("passportEvent evoServiceHistoryEvent"),'managed history must render Service Proof events');
assert(src.includes("passportEvent:not(.evoServiceHistoryEvent)"),'counter must exclude already-injected Service Proof nodes');
assert(src.includes("baseCount+proofs.length"),'history counter must combine Passport events and Service Proofs');
assert(src.includes("publicAssetTimeline .publicAssetEvent"),'public Passport must count base public events');
assert(src.includes("PROVIDER_COUNTERSIGNED"),'history must preserve countersignature evidence level');
assert(src.includes("OWNER DECLARED")||src.includes("DECLARADO POR PROPIETARIO"),'history must distinguish owner declarations');
assert(src.includes("evo_service_proofs"),'history must read the Service Proof table');
assert(src.includes("window.evoSyncServiceHistory"),'history sync should be explicitly callable after service creation/loading');

console.log('EVO Service Proof history V3.1.1 checks passed');
