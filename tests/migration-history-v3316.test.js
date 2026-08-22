'use strict';
const assert=require('assert');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const migrationDir=path.join(root,'supabase','migrations');
const history=JSON.parse(fs.readFileSync(path.join(root,'security','production-migration-history-20260822.json'),'utf8'));
const files=new Set(fs.readdirSync(migrationDir));

for(const migration of history.migrations){
  const prefix=migration.version+'_';
  const matches=[...files].filter(file=>file.startsWith(prefix)&&file.endsWith('.sql'));
  assert(matches.length===1,`production migration ${migration.version} must map to exactly one local SQL file; found ${matches.join(', ')||'none'}`);
}

const retired=[
  '20260821234000_atomic_seal_registration_credit.sql',
  '20260821234200_active_asset_serial_guard.sql',
  '20260821235500_checkout_verification_rate_limit.sql',
  '20260822112500_asset_authority_lock_v3312.sql',
  '20260822113500_transfer_state_machine_v3313.sql',
  '20260822115000_battery_atomic_registration_v3314.sql',
];
for(const file of retired){
  assert(!files.has(file),`retired proposed migration filename must not remain after reconciliation: ${file}`);
}

const canonical=[
  '20260822105136_atomic_seal_registration_credit_v332.sql',
  '20260822105154_active_asset_serial_guard_v332.sql',
  '20260822105213_checkout_verification_rate_limit_v334.sql',
  '20260822105251_checkout_verification_explicit_deny_policies_v334.sql',
  '20260822110530_domain_check_slot_v338.sql',
  '20260822111047_organization_single_pending_guard_v3310.sql',
  '20260822111258_atomic_seal_registration_credit.sql',
  '20260822111307_active_asset_serial_guard.sql',
  '20260822111320_checkout_verification_rate_limit.sql',
  '20260822112538_asset_authority_lock_v3312.sql',
  '20260822113209_transfer_state_machine_v3313.sql',
  '20260822113955_battery_atomic_registration_v3314.sql',
];
for(const file of canonical)assert(files.has(file),`canonical production-aligned migration missing: ${file}`);

const duplicateMarkers=[
  '20260822111258_atomic_seal_registration_credit.sql',
  '20260822111307_active_asset_serial_guard.sql',
  '20260822111320_checkout_verification_rate_limit.sql',
];
for(const file of duplicateMarkers){
  const text=fs.readFileSync(path.join(migrationDir,file),'utf8');
  assert(text.includes('Production migration-history alignment marker'),'duplicate production application must remain an explicit no-op history marker');
}

console.log('EVO V3.3.16 production migration-history alignment checks passed');
