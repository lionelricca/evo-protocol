import fs from 'node:fs';

const src=fs.readFileSync('supabase/functions/evo-battery-passport/index.ts','utf8');
const migration=fs.readFileSync('supabase/migrations/20260822115000_battery_atomic_registration_v3314.sql','utf8');

function requireText(text,label){if(!src.includes(text))throw new Error(`missing_${label}`)}
function requireMigration(text,label){if(!migration.includes(text))throw new Error(`missing_migration_${label}`)}

requireText('jsr:@supabase/supabase-js@2.105.4','pinned_supabase');
requireText('MAX_BODY_BYTES=98_304','body_limit');
requireText('new TextEncoder().encode(raw).byteLength>MAX_BODY_BYTES','actual_byte_limit');
requireText('"X-Content-Type-Options":"nosniff"','nosniff');
requireText('"Cache-Control":"no-store"','no_store');
requireText('evo_register_battery_model_authoritative','model_rpc');
requireText('evo_register_battery_passport_atomic','passport_atomic_rpc');
requireText('profileVersion:"EVO-EU-BATTERY-DPP-2026-01"','dpp_profile');
requireText('legalPosition:"INTEROPERABILITY_EXPORT_NOT_CERTIFICATION"','no_certification_claim');
requireText('registryState:"NOT_REGISTERED_BY_EVO"','no_registry_claim');
requireText('restrictedDataExcluded:true','restricted_data_excluded');
requireText('accessPolicyVersion:"EVO-DPP-ACCESS-POLICY-DRAFT-2026-08"','versioned_access_policy');
if(src.includes('jsr:@supabase/supabase-js@2"'))throw new Error('unpinned_supabase_regression');
if(src.includes('.delete().eq("passport_id"'))throw new Error('manual_compensating_delete_regression');
if(src.includes('registryState:"REGISTERED"'))throw new Error('false_registry_claim');

requireMigration("set search_path to ''",'search_path');
requireMigration('evo_register_battery_passport_atomic','atomic_rpc');
requireMigration("pg_advisory_xact_lock",'advisory_lock');
requireMigration('insert into public.evo_battery_passports','passport_insert');
requireMigration('insert into public.evo_battery_passport_versions','version_insert');
requireMigration('revoke all on function public.evo_register_battery_passport_atomic(jsonb,jsonb) from anon','anon_revoke');
requireMigration('grant execute on function public.evo_register_battery_passport_atomic(jsonb,jsonb) to service_role','service_grant');

console.log('EVO V3.3.14 Battery Passport hardening checks passed');
