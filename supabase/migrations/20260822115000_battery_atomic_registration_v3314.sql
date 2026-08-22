-- EVO V3.3.14 · Battery Atomic Registration
-- Signed battery model and individual passport registrations are committed at the
-- database boundary. Passport + initial audit version are one transaction.

create or replace function public.evo_register_battery_model_authoritative(p_row jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_model_id text := upper(trim(coalesce(p_row ->> 'model_id','')));
  v_issuer text := lower(trim(coalesce(p_row ->> 'issuer_wallet','')));
  v_unique text := trim(coalesce(p_row ->> 'unique_model_identifier',''));
  v_name text := trim(coalesce(p_row ->> 'model_name',''));
  v_category text := upper(trim(coalesce(p_row ->> 'battery_category','')));
  v_hash text := lower(trim(coalesce(p_row ->> 'data_hash','')));
  v_signature text := coalesce(p_row ->> 'signature','');
  v_message text := coalesce(p_row ->> 'signature_message','');
  v_status text := upper(trim(coalesce(p_row ->> 'status','')));
  v_signed_at timestamptz;
  v_energy numeric;
  v_existing public.evo_battery_models%rowtype;
  v_inserted public.evo_battery_models%rowtype;
begin
  if p_row is null or pg_catalog.jsonb_typeof(p_row) <> 'object' then raise exception 'invalid_model_row'; end if;
  if coalesce(p_row ->> 'schema_version','') <> 'EVO-BATTERY-MODEL-V0' then raise exception 'invalid_schema_version'; end if;
  if v_model_id !~ '^EBM-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_model_id'; end if;
  if v_issuer !~ '^0x[0-9a-f]{40}$' then raise exception 'invalid_issuer_wallet'; end if;
  if length(v_unique) < 1 or length(v_unique) > 240 then raise exception 'invalid_unique_model_identifier'; end if;
  if length(v_name) < 1 or length(v_name) > 240 then raise exception 'invalid_model_name'; end if;
  if v_category not in ('LMT','INDUSTRIAL','EV','OTHER') then raise exception 'invalid_battery_category'; end if;
  if v_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_data_hash'; end if;
  if v_status not in ('DRAFT','ACTIVE') then raise exception 'invalid_model_status'; end if;
  if length(v_signature) < 1 or length(v_signature) > 512 or length(v_message) < 1 or length(v_message) > 2048 then raise exception 'invalid_signature_evidence'; end if;
  if pg_catalog.jsonb_typeof(coalesce(p_row -> 'public_data','{}'::jsonb)) <> 'object'
     or pg_catalog.jsonb_typeof(coalesce(p_row -> 'legitimate_interest_data','{}'::jsonb)) <> 'object'
     or pg_catalog.jsonb_typeof(coalesce(p_row -> 'authority_data','{}'::jsonb)) <> 'object' then
    raise exception 'invalid_access_data';
  end if;
  begin
    v_signed_at := (p_row ->> 'signed_at')::timestamptz;
    if p_row ? 'nominal_energy_kwh' and p_row ->> 'nominal_energy_kwh' <> '' then
      v_energy := (p_row ->> 'nominal_energy_kwh')::numeric;
    else
      v_energy := null;
    end if;
  exception when others then raise exception 'invalid_numeric_or_time'; end;
  if v_signed_at < pg_catalog.now()-interval '10 minutes' or v_signed_at > pg_catalog.now()+interval '1 minute' then raise exception 'stale_or_future_signature'; end if;
  if v_energy is not null and v_energy < 0 then raise exception 'invalid_nominal_energy'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evo-battery-model|'||v_issuer||'|'||lower(v_unique),0));

  select m.* into v_existing from public.evo_battery_models m where m.model_id=v_model_id;
  if found then
    if lower(v_existing.issuer_wallet)<>v_issuer or v_existing.data_hash<>v_hash or v_existing.unique_model_identifier<>v_unique then
      raise exception 'model_id_conflict';
    end if;
    return pg_catalog.jsonb_build_object(
      'ok',true,'idempotent',true,'modelId',v_existing.model_id,'status',v_existing.status,
      'createdAt',v_existing.created_at,'dataHash',v_existing.data_hash
    );
  end if;

  if exists(select 1 from public.evo_battery_models m where lower(m.issuer_wallet)=v_issuer and m.unique_model_identifier=v_unique) then
    raise exception 'unique_model_identifier_conflict';
  end if;

  insert into public.evo_battery_models as m(
    model_id,schema_version,issuer_wallet,unique_model_identifier,model_name,battery_category,
    nominal_energy_kwh,public_data,legitimate_interest_data,authority_data,data_hash,
    signature,signature_message,signed_at,status
  ) values (
    v_model_id,'EVO-BATTERY-MODEL-V0',v_issuer,v_unique,v_name,v_category,v_energy,
    coalesce(p_row -> 'public_data','{}'::jsonb),coalesce(p_row -> 'legitimate_interest_data','{}'::jsonb),
    coalesce(p_row -> 'authority_data','{}'::jsonb),v_hash,v_signature,v_message,v_signed_at,v_status
  ) returning m.* into v_inserted;

  return pg_catalog.jsonb_build_object(
    'ok',true,'idempotent',false,'modelId',v_inserted.model_id,'status',v_inserted.status,
    'createdAt',v_inserted.created_at,'dataHash',v_inserted.data_hash
  );
end;
$$;

create or replace function public.evo_register_battery_passport_atomic(p_passport jsonb,p_version jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_passport_id text := upper(trim(coalesce(p_passport ->> 'passport_id','')));
  v_model_id text := upper(trim(coalesce(p_passport ->> 'model_id','')));
  v_unique text := trim(coalesce(p_passport ->> 'unique_battery_identifier',''));
  v_issuer text := lower(trim(coalesce(p_passport ->> 'issuer_wallet','')));
  v_battery_status text := upper(trim(coalesce(p_passport ->> 'battery_status','')));
  v_hash text := lower(trim(coalesce(p_passport ->> 'data_hash','')));
  v_signature text := coalesce(p_passport ->> 'signature','');
  v_message text := coalesce(p_passport ->> 'signature_message','');
  v_signed_at timestamptz;
  v_seal_id text := nullif(upper(trim(coalesce(p_passport ->> 'seal_id',''))),'');
  v_version_no integer;
  v_snapshot_hash text := lower(trim(coalesce(p_version ->> 'snapshot_hash','')));
  v_actor text := lower(trim(coalesce(p_version ->> 'actor_wallet','')));
  v_version_signed_at timestamptz;
  v_version_signature text := coalesce(p_version ->> 'signature','');
  v_version_message text := coalesce(p_version ->> 'signature_message','');
  v_existing public.evo_battery_passports%rowtype;
  v_existing_version public.evo_battery_passport_versions%rowtype;
  v_inserted public.evo_battery_passports%rowtype;
  v_version_id bigint;
begin
  if p_passport is null or pg_catalog.jsonb_typeof(p_passport)<>'object' then raise exception 'invalid_passport_row'; end if;
  if p_version is null or pg_catalog.jsonb_typeof(p_version)<>'object' then raise exception 'invalid_version_row'; end if;
  if coalesce(p_passport ->> 'schema_version','')<>'EVO-BATTERY-PASSPORT-V0' then raise exception 'invalid_schema_version'; end if;
  if v_passport_id !~ '^EBP-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_passport_id'; end if;
  if v_model_id !~ '^EBM-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_model_id'; end if;
  if length(v_unique)<1 or length(v_unique)>320 then raise exception 'invalid_unique_battery_identifier'; end if;
  if v_issuer !~ '^0x[0-9a-f]{40}$' then raise exception 'invalid_issuer_wallet'; end if;
  if v_battery_status not in ('ORIGINAL','REPURPOSED','REUSED','REMANUFACTURED','WASTE') then raise exception 'invalid_battery_status'; end if;
  if v_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_data_hash'; end if;
  if v_seal_id is not null and v_seal_id !~ '^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_seal_id'; end if;
  if length(coalesce(p_passport ->> 'battery_serial',''))>240 then raise exception 'battery_serial_too_long'; end if;
  if pg_catalog.jsonb_typeof(coalesce(p_passport -> 'individual_data','{}'::jsonb))<>'object' then raise exception 'invalid_individual_data'; end if;
  if length(v_signature)<1 or length(v_signature)>512 or length(v_message)<1 or length(v_message)>2048 then raise exception 'invalid_signature_evidence'; end if;
  if lower(trim(coalesce(p_version ->> 'passport_id','')))<>lower(v_passport_id) then raise exception 'version_passport_mismatch'; end if;
  if v_snapshot_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_snapshot_hash'; end if;
  if v_actor<>v_issuer then raise exception 'version_actor_mismatch'; end if;
  if pg_catalog.jsonb_typeof(p_version -> 'snapshot')<>'object' then raise exception 'invalid_snapshot'; end if;
  if length(v_version_signature)<1 or length(v_version_signature)>512 or length(v_version_message)<1 or length(v_version_message)>2048 then raise exception 'invalid_version_signature_evidence'; end if;
  begin
    v_signed_at := (p_passport ->> 'signed_at')::timestamptz;
    v_version_signed_at := (p_version ->> 'signed_at')::timestamptz;
    v_version_no := (p_version ->> 'version_no')::integer;
  exception when others then raise exception 'invalid_time_or_version'; end;
  if v_version_no<>1 then raise exception 'initial_version_must_be_one'; end if;
  if v_signed_at < pg_catalog.now()-interval '10 minutes' or v_signed_at > pg_catalog.now()+interval '1 minute' then raise exception 'stale_or_future_signature'; end if;
  if v_version_signed_at<>v_signed_at then raise exception 'version_signed_at_mismatch'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evo-battery-passport|'||v_issuer||'|'||lower(v_unique),0));

  select p.* into v_existing from public.evo_battery_passports p where p.passport_id=v_passport_id;
  if found then
    if lower(v_existing.issuer_wallet)<>v_issuer or v_existing.data_hash<>v_hash or v_existing.unique_battery_identifier<>v_unique then
      raise exception 'passport_id_conflict';
    end if;
    select v.* into v_existing_version from public.evo_battery_passport_versions v
      where v.passport_id=v_passport_id and v.version_no=1;
    if not found then raise exception 'passport_version_state_missing'; end if;
    if v_existing_version.snapshot_hash<>v_snapshot_hash then raise exception 'passport_version_conflict'; end if;
    return pg_catalog.jsonb_build_object(
      'ok',true,'idempotent',true,'passportId',v_existing.passport_id,'modelId',v_existing.model_id,
      'status',v_existing.status,'version',1,'snapshotHash',v_existing_version.snapshot_hash,
      'createdAt',v_existing.created_at
    );
  end if;

  if exists(select 1 from public.evo_battery_passports p where lower(p.issuer_wallet)=v_issuer and p.unique_battery_identifier=v_unique) then
    raise exception 'unique_battery_identifier_conflict';
  end if;

  if not exists(select 1 from public.evo_battery_models m where m.model_id=v_model_id and lower(m.issuer_wallet)=v_issuer and m.status='ACTIVE') then
    raise exception 'issuer_does_not_control_ready_model';
  end if;
  if v_seal_id is not null and not exists(select 1 from public.evo_seals s where s.seal_id=v_seal_id and lower(s.issuer_wallet)=v_issuer and s.status='ACTIVE') then
    raise exception 'seal_not_owned_by_issuer';
  end if;

  insert into public.evo_battery_passports as p(
    passport_id,schema_version,model_id,unique_battery_identifier,battery_serial,seal_id,
    issuer_wallet,battery_status,individual_data,data_hash,signature,signature_message,signed_at,status
  ) values (
    v_passport_id,'EVO-BATTERY-PASSPORT-V0',v_model_id,v_unique,nullif(trim(coalesce(p_passport ->> 'battery_serial','')),''),
    v_seal_id,v_issuer,v_battery_status,coalesce(p_passport -> 'individual_data','{}'::jsonb),v_hash,
    v_signature,v_message,v_signed_at,'ACTIVE'
  ) returning p.* into v_inserted;

  insert into public.evo_battery_passport_versions(
    passport_id,version_no,snapshot,snapshot_hash,actor_wallet,signature,signature_message,signed_at
  ) values (
    v_passport_id,1,p_version -> 'snapshot',v_snapshot_hash,v_actor,v_version_signature,v_version_message,v_version_signed_at
  ) returning version_id into v_version_id;

  return pg_catalog.jsonb_build_object(
    'ok',true,'idempotent',false,'passportId',v_inserted.passport_id,'modelId',v_inserted.model_id,
    'status',v_inserted.status,'version',1,'versionId',v_version_id,'snapshotHash',v_snapshot_hash,
    'createdAt',v_inserted.created_at
  );
end;
$$;

revoke all on function public.evo_register_battery_model_authoritative(jsonb) from public;
revoke all on function public.evo_register_battery_model_authoritative(jsonb) from anon;
revoke all on function public.evo_register_battery_model_authoritative(jsonb) from authenticated;
grant execute on function public.evo_register_battery_model_authoritative(jsonb) to postgres;
grant execute on function public.evo_register_battery_model_authoritative(jsonb) to service_role;

revoke all on function public.evo_register_battery_passport_atomic(jsonb,jsonb) from public;
revoke all on function public.evo_register_battery_passport_atomic(jsonb,jsonb) from anon;
revoke all on function public.evo_register_battery_passport_atomic(jsonb,jsonb) from authenticated;
grant execute on function public.evo_register_battery_passport_atomic(jsonb,jsonb) to postgres;
grant execute on function public.evo_register_battery_passport_atomic(jsonb,jsonb) to service_role;
