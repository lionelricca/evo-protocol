'use strict';

const fs=require('fs');
const assert=require('assert');

const trust=fs.readFileSync('v1/service-proof-v312-trust.js','utf8');
const history=fs.readFileSync('v1/service-proof-v311-history.js','utf8');
const edge=fs.readFileSync('supabase/functions/evo-service-proof/index.ts','utf8');
const migration=fs.readFileSync('supabase/migrations/20260821223000_service_provider_distinct_wallet.sql','utf8');

assert(trust.includes('provider===owner'),'Client must reject an owner wallet reused as provider');
assert(trust.includes('setCustomValidity'),'Provider wallet validation must block the form before signature');
assert(trust.includes('PENDIENTE DE PROVEEDOR'),'UI must distinguish a requested but incomplete second signature');
assert(trust.includes('PROVIDER PENDING'),'English UI must expose pending provider state');
assert(history.includes("proof.provider_wallet\n      ?t('PENDIENTE DE PROVEEDOR'"),'Managed history must distinguish pending provider evidence');
assert(edge.includes('provider_must_differ_from_owner'),'Backend must reject a provider equal to the owner');
assert(edge.includes('invalid_provider_relation'),'Backend must fail closed for legacy invalid owner/provider relations');
assert(migration.includes("provider_wallet = '' or provider_wallet <> owner_wallet"),'Database must enforce distinct owner/provider wallets');
assert(history.includes('service-proof-v312-trust.js?v=20260821-v312-trust'),'V3.1.2 trust enhancer must use a fresh cache key');

console.log('EVO V3.1.2 Service Proof trust checks passed');
