\set ON_ERROR_STOP on

-- Active model registration and exact retry.
select public.evo_register_battery_model_authoritative(jsonb_build_object(
  'model_id','EBM-11111111-22222222-33333333',
  'schema_version','EVO-BATTERY-MODEL-V0',
  'issuer_wallet','0x1111111111111111111111111111111111111111',
  'unique_model_identifier','EVO-TEST-MODEL-001',
  'model_name','EVO Battery Test Model',
  'battery_category','EV',
  'nominal_energy_kwh','82.5',
  'public_data',jsonb_build_object('fields',jsonb_build_object('batteryCategory','EV')),
  'legitimate_interest_data','{}'::jsonb,
  'authority_data','{}'::jsonb,
  'data_hash',repeat('1',64),
  'signature','model-sig',
  'signature_message','model-message',
  'signed_at',now(),
  'status','ACTIVE'
));
select public.evo_register_battery_model_authoritative(jsonb_build_object(
  'model_id','EBM-11111111-22222222-33333333',
  'schema_version','EVO-BATTERY-MODEL-V0',
  'issuer_wallet','0x1111111111111111111111111111111111111111',
  'unique_model_identifier','EVO-TEST-MODEL-001',
  'model_name','EVO Battery Test Model',
  'battery_category','EV',
  'nominal_energy_kwh','82.5',
  'public_data',jsonb_build_object('fields',jsonb_build_object('batteryCategory','EV')),
  'legitimate_interest_data','{}'::jsonb,
  'authority_data','{}'::jsonb,
  'data_hash',repeat('1',64),
  'signature','model-sig',
  'signature_message','model-message',
  'signed_at',now(),
  'status','ACTIVE'
));

do $$
declare n integer;
begin
  select count(*) into n from public.evo_battery_models where model_id='EBM-11111111-22222222-33333333';
  if n<>1 then raise exception 'model_retry_not_idempotent'; end if;
end;
$$;

-- Atomic passport + version 1 registration and exact retry.
select public.evo_register_battery_passport_atomic(
  jsonb_build_object(
    'passport_id','EBP-11111111-22222222-33333333',
    'schema_version','EVO-BATTERY-PASSPORT-V0',
    'model_id','EBM-11111111-22222222-33333333',
    'unique_battery_identifier','BATTERY-UNIT-001',
    'battery_serial','SERIAL-001',
    'seal_id','',
    'issuer_wallet','0x1111111111111111111111111111111111111111',
    'battery_status','ORIGINAL',
    'individual_data',jsonb_build_object('fields',jsonb_build_object('batteryStatus','ORIGINAL')),
    'data_hash',repeat('2',64),
    'signature','passport-sig',
    'signature_message','passport-message',
    'signed_at',now()
  ),
  jsonb_build_object(
    'passport_id','EBP-11111111-22222222-33333333',
    'version_no',1,
    'snapshot',jsonb_build_object('passportId','EBP-11111111-22222222-33333333','dataHash',repeat('2',64)),
    'snapshot_hash',repeat('3',64),
    'actor_wallet','0x1111111111111111111111111111111111111111',
    'signature','passport-sig',
    'signature_message','passport-message',
    'signed_at',now()
  )
);

-- Retry uses stored hashes and cannot create a second version.
select public.evo_register_battery_passport_atomic(
  jsonb_build_object(
    'passport_id','EBP-11111111-22222222-33333333',
    'schema_version','EVO-BATTERY-PASSPORT-V0',
    'model_id','EBM-11111111-22222222-33333333',
    'unique_battery_identifier','BATTERY-UNIT-001',
    'battery_serial','SERIAL-001',
    'seal_id','',
    'issuer_wallet','0x1111111111111111111111111111111111111111',
    'battery_status','ORIGINAL',
    'individual_data',jsonb_build_object('fields',jsonb_build_object('batteryStatus','ORIGINAL')),
    'data_hash',repeat('2',64),
    'signature','passport-sig',
    'signature_message','passport-message',
    'signed_at',now()
  ),
  jsonb_build_object(
    'passport_id','EBP-11111111-22222222-33333333',
    'version_no',1,
    'snapshot',jsonb_build_object('passportId','EBP-11111111-22222222-33333333','dataHash',repeat('2',64)),
    'snapshot_hash',repeat('3',64),
    'actor_wallet','0x1111111111111111111111111111111111111111',
    'signature','passport-sig',
    'signature_message','passport-message',
    'signed_at',now()
  )
);

do $$
declare p integer; v integer;
begin
  select count(*) into p from public.evo_battery_passports where passport_id='EBP-11111111-22222222-33333333';
  select count(*) into v from public.evo_battery_passport_versions where passport_id='EBP-11111111-22222222-33333333';
  if p<>1 or v<>1 then raise exception 'passport_retry_not_idempotent'; end if;
end;
$$;

-- Wrong issuer cannot register a passport against another issuer's active model.
do $$
begin
  begin
    perform public.evo_register_battery_passport_atomic(
      jsonb_build_object(
        'passport_id','EBP-AAAA1111-BBBB2222-CCCC3333','schema_version','EVO-BATTERY-PASSPORT-V0',
        'model_id','EBM-11111111-22222222-33333333','unique_battery_identifier','BATTERY-WRONG-ISSUER',
        'issuer_wallet','0x2222222222222222222222222222222222222222','battery_status','ORIGINAL',
        'individual_data','{}'::jsonb,'data_hash',repeat('4',64),'signature','x','signature_message','x','signed_at',now()
      ),
      jsonb_build_object(
        'passport_id','EBP-AAAA1111-BBBB2222-CCCC3333','version_no',1,'snapshot','{}'::jsonb,
        'snapshot_hash',repeat('5',64),'actor_wallet','0x2222222222222222222222222222222222222222',
        'signature','x','signature_message','x','signed_at',now()
      )
    );
    raise exception 'wrong_issuer_model_was_accepted';
  exception when others then
    if position('issuer_does_not_control_ready_model' in sqlerrm)=0 then raise; end if;
  end;
end;
$$;

-- Force the version insert to fail after the passport insert. The passport must roll back.
create or replace function public.evo_test_fail_battery_version()
returns trigger language plpgsql as $$
begin
  if new.passport_id='EBP-99999999-88888888-77777777' then raise exception 'forced_version_failure'; end if;
  return new;
end;
$$;
create trigger evo_test_fail_battery_version_trigger
before insert on public.evo_battery_passport_versions
for each row execute function public.evo_test_fail_battery_version();

do $$
begin
  begin
    perform public.evo_register_battery_passport_atomic(
      jsonb_build_object(
        'passport_id','EBP-99999999-88888888-77777777','schema_version','EVO-BATTERY-PASSPORT-V0',
        'model_id','EBM-11111111-22222222-33333333','unique_battery_identifier','BATTERY-ROLLBACK-001',
        'issuer_wallet','0x1111111111111111111111111111111111111111','battery_status','ORIGINAL',
        'individual_data','{}'::jsonb,'data_hash',repeat('6',64),'signature','rollback-sig','signature_message','rollback-message','signed_at',now()
      ),
      jsonb_build_object(
        'passport_id','EBP-99999999-88888888-77777777','version_no',1,
        'snapshot',jsonb_build_object('test','forced rollback'),'snapshot_hash',repeat('7',64),
        'actor_wallet','0x1111111111111111111111111111111111111111',
        'signature','rollback-sig','signature_message','rollback-message','signed_at',now()
      )
    );
    raise exception 'forced_version_failure_did_not_fire';
  exception when others then
    if position('forced_version_failure' in sqlerrm)=0 then raise; end if;
  end;
  if exists(select 1 from public.evo_battery_passports where passport_id='EBP-99999999-88888888-77777777') then
    raise exception 'passport_survived_failed_version_insert';
  end if;
end;
$$;

drop trigger evo_test_fail_battery_version_trigger on public.evo_battery_passport_versions;
drop function public.evo_test_fail_battery_version();

-- Same issuer + same unique battery identifier cannot silently map to another Passport ID.
do $$
begin
  begin
    perform public.evo_register_battery_passport_atomic(
      jsonb_build_object(
        'passport_id','EBP-44444444-55555555-66666666','schema_version','EVO-BATTERY-PASSPORT-V0',
        'model_id','EBM-11111111-22222222-33333333','unique_battery_identifier','BATTERY-UNIT-001',
        'issuer_wallet','0x1111111111111111111111111111111111111111','battery_status','ORIGINAL',
        'individual_data','{}'::jsonb,'data_hash',repeat('8',64),'signature','conflict-sig','signature_message','conflict-message','signed_at',now()
      ),
      jsonb_build_object(
        'passport_id','EBP-44444444-55555555-66666666','version_no',1,'snapshot','{}'::jsonb,
        'snapshot_hash',repeat('9',64),'actor_wallet','0x1111111111111111111111111111111111111111',
        'signature','conflict-sig','signature_message','conflict-message','signed_at',now()
      )
    );
    raise exception 'unique_battery_conflict_not_rejected';
  exception when others then
    if position('unique_battery_identifier_conflict' in sqlerrm)=0 then raise; end if;
  end;
end;
$$;

select 'EVO V3.3.14 Battery atomic registration tests passed' as result;
