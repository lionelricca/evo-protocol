-- EVO V4.0 RC · Reality Continuity Authority
-- Serializes authoritative continuity checkpoint creation with ownership changes
-- using the same per-Seal Asset Authority lock.

create or replace function public.evo_register_reality_checkpoint_authoritative(p_row jsonb)
returns table(
  snapshot_id text,
  seal_id text,
  evidence_root text,
  continuity_root text,
  previous_continuity_root text,
  signer_wallet text,
  signed_at timestamptz,
  registered_at timestamptz,
  status text,
  idempotent boolean
)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_snapshot_id text := upper(trim(coalesce(p_row ->> 'snapshot_id','')));
  v_seal_id text := upper(trim(coalesce(p_row ->> 'seal_id','')));
  v_evidence_root text := lower(trim(coalesce(p_row ->> 'evidence_root','')));
  v_continuity_root text := lower(trim(coalesce(p_row ->> 'continuity_root','')));
  v_previous_root text := trim(coalesce(p_row ->> 'previous_continuity_root',''));
  v_signer text := lower(trim(coalesce(p_row ->> 'signer_wallet','')));
  v_signature text := coalesce(p_row ->> 'signature','');
  v_signature_message text := coalesce(p_row ->> 'signature_message','');
  v_state jsonb := p_row -> 'evidence_state';
  v_signed_at timestamptz;
  v_issuer text;
  v_seal_digest text;
  v_seal_status text;
  v_current_owner text;
  v_issuer_trust text;
  v_issuer_profile_hash text;
  v_passport_head text;
  v_pulse_head text;
  v_challenge_head text;
  v_expected_previous text;
  v_expected_evidence_root text;
  v_expected_continuity_root text;
  v_expected_snapshot_id text;
  v_state_canonical text;
  v_continuity_canonical text;
  v_existing public.evo_reality_snapshots%rowtype;
  v_inserted public.evo_reality_snapshots%rowtype;
begin
  if p_row is null or pg_catalog.jsonb_typeof(p_row) <> 'object' then raise exception 'invalid_reality_row'; end if;
  if coalesce(p_row ->> 'version','') <> 'EVO-CONTINUITY-V0' then raise exception 'invalid_version'; end if;
  if v_snapshot_id !~ '^EVR-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_snapshot_id'; end if;
  if v_seal_id !~ '^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_seal_id'; end if;
  if v_evidence_root !~ '^[0-9a-f]{64}$' or v_continuity_root !~ '^[0-9a-f]{64}$' then raise exception 'invalid_root'; end if;
  if not (v_previous_root = 'GENESIS' or v_previous_root ~ '^[0-9a-f]{64}$') then raise exception 'invalid_previous_root'; end if;
  if v_signer !~ '^0x[0-9a-f]{40}$' then raise exception 'invalid_signer'; end if;
  if pg_catalog.jsonb_typeof(v_state) <> 'object' then raise exception 'invalid_evidence_state'; end if;
  if length(v_signature) < 1 or length(v_signature) > 512 or length(v_signature_message) < 1 or length(v_signature_message) > 2048 then raise exception 'invalid_signature_evidence'; end if;

  begin
    v_signed_at := (p_row ->> 'signed_at')::timestamptz;
  exception when others then
    raise exception 'invalid_signed_at';
  end;
  if v_signed_at is null or v_signed_at < pg_catalog.now() - interval '5 minutes' or v_signed_at > pg_catalog.now() + interval '1 minute' then
    raise exception 'stale_or_future_signature';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evo-asset-authority|' || v_seal_id, 0));

  select lower(s.issuer_wallet), lower(s.digest), upper(s.status)
    into v_issuer, v_seal_digest, v_seal_status
  from public.evo_seals s
  where s.seal_id = v_seal_id and s.status = 'ACTIVE';
  if not found then raise exception 'seal_not_found'; end if;

  select coalesce(
    (select lower(pe.new_owner_wallet)
       from public.evo_passport_events pe
      where pe.seal_id = v_seal_id and pe.event_type = 'TRANSFERRED' and pe.status = 'ACTIVE'
      order by pe.registered_at desc, pe.event_id desc limit 1),
    v_issuer
  ) into v_current_owner;

  if v_signer <> v_current_owner then raise exception 'signer_is_not_current_owner'; end if;

  select coalesce((select upper(ip.status) from public.evo_issuer_profiles ip where lower(ip.issuer_wallet) = v_issuer limit 1),'SELF_DECLARED') into v_issuer_trust;
  select coalesce((select lower(ip.profile_hash) from public.evo_issuer_profiles ip where lower(ip.issuer_wallet) = v_issuer limit 1),'none') into v_issuer_profile_hash;
  select coalesce((select lower(pe.event_digest) from public.evo_passport_events pe where pe.seal_id=v_seal_id and pe.status='ACTIVE' order by pe.registered_at desc, pe.event_id desc limit 1),'none') into v_passport_head;
  select coalesce((select lower(ep.pulse_hash) from public.evo_pulses ep where ep.seal_id=v_seal_id and ep.status='ACTIVE' order by ep.observed_ms desc, ep.pulse_hash desc limit 1),'none') into v_pulse_head;
  select coalesce((select upper(ec.challenge_id) from public.evo_challenges ec where ec.seal_id=v_seal_id and ec.status='CONSUMED' order by ec.completed_at desc nulls last, ec.challenge_id desc limit 1),'NONE') into v_challenge_head;

  v_state_canonical :=
    '{"challengeHead":' || pg_catalog.to_json(v_challenge_head)::text ||
    ',"currentOwner":' || pg_catalog.to_json(v_current_owner)::text ||
    ',"issuerProfileHash":' || pg_catalog.to_json(v_issuer_profile_hash)::text ||
    ',"issuerTrust":' || pg_catalog.to_json(v_issuer_trust)::text ||
    ',"issuerWallet":' || pg_catalog.to_json(v_issuer)::text ||
    ',"passportHead":' || pg_catalog.to_json(v_passport_head)::text ||
    ',"physicalProofHead":"NONE"' ||
    ',"pulseHead":' || pg_catalog.to_json(v_pulse_head)::text ||
    ',"sealDigest":' || pg_catalog.to_json(v_seal_digest)::text ||
    ',"sealId":' || pg_catalog.to_json(v_seal_id)::text ||
    ',"sealStatus":' || pg_catalog.to_json(v_seal_status)::text ||
    ',"version":"EVO-REALITY-EVIDENCE-V0"}';

  v_expected_evidence_root := pg_catalog.encode(extensions.digest(v_state_canonical,'sha256'),'hex');
  if v_evidence_root <> v_expected_evidence_root then raise exception 'stale_evidence_root'; end if;

  if coalesce(v_state ->> 'version','') <> 'EVO-REALITY-EVIDENCE-V0'
     or upper(coalesce(v_state ->> 'sealId','')) <> v_seal_id
     or lower(coalesce(v_state ->> 'sealDigest','')) <> v_seal_digest
     or upper(coalesce(v_state ->> 'sealStatus','')) <> v_seal_status
     or lower(coalesce(v_state ->> 'issuerWallet','')) <> v_issuer
     or upper(coalesce(v_state ->> 'issuerTrust','')) <> v_issuer_trust
     or lower(coalesce(v_state ->> 'issuerProfileHash','')) <> v_issuer_profile_hash
     or lower(coalesce(v_state ->> 'currentOwner','')) <> v_current_owner
     or lower(coalesce(v_state ->> 'passportHead','')) <> v_passport_head
     or lower(coalesce(v_state ->> 'pulseHead','')) <> v_pulse_head
     or upper(coalesce(v_state ->> 'challengeHead','')) <> v_challenge_head
     or upper(coalesce(v_state ->> 'physicalProofHead','')) <> 'NONE'
  then raise exception 'stale_evidence_state'; end if;

  select rs.* into v_existing from public.evo_reality_snapshots rs where rs.snapshot_id=v_snapshot_id;
  if found then
    if v_existing.seal_id <> v_seal_id
       or lower(v_existing.evidence_root) <> v_evidence_root
       or lower(v_existing.continuity_root) <> v_continuity_root
       or v_existing.previous_continuity_root <> v_previous_root
       or lower(v_existing.signer_wallet) <> v_signer
       or v_existing.evidence_state <> v_state
    then raise exception 'snapshot_id_conflict'; end if;
    return query select v_existing.snapshot_id,v_existing.seal_id,v_existing.evidence_root,v_existing.continuity_root,v_existing.previous_continuity_root,v_existing.signer_wallet,v_existing.signed_at,v_existing.registered_at,v_existing.status,true;
    return;
  end if;

  select coalesce((select lower(rs.continuity_root) from public.evo_reality_snapshots rs where rs.seal_id=v_seal_id and rs.status='ACTIVE' order by rs.registered_at desc, rs.snapshot_id desc limit 1),'GENESIS') into v_expected_previous;
  if v_previous_root <> v_expected_previous then raise exception 'stale_previous_root'; end if;
  if exists(select 1 from public.evo_reality_snapshots rs where rs.seal_id=v_seal_id and lower(rs.evidence_root)=v_evidence_root) then raise exception 'evidence_already_checkpointed'; end if;

  v_continuity_canonical :=
    '{"evidenceRoot":' || pg_catalog.to_json(v_evidence_root)::text ||
    ',"previousContinuityRoot":' || pg_catalog.to_json(v_previous_root)::text ||
    ',"sealId":' || pg_catalog.to_json(v_seal_id)::text ||
    ',"signedAt":' || pg_catalog.to_json(p_row ->> 'signed_at')::text ||
    ',"signerWallet":' || pg_catalog.to_json(v_signer)::text ||
    ',"version":"EVO-CONTINUITY-V0"}';
  v_expected_continuity_root := pg_catalog.encode(extensions.digest(v_continuity_canonical,'sha256'),'hex');
  if v_continuity_root <> v_expected_continuity_root then raise exception 'continuity_root_mismatch'; end if;

  v_expected_snapshot_id := 'EVR-' || upper(substr(v_continuity_root,1,8)) || '-' || upper(substr(v_continuity_root,9,8)) || '-' || upper(substr(v_continuity_root,17,8));
  if v_snapshot_id <> v_expected_snapshot_id then raise exception 'snapshot_id_mismatch'; end if;

  insert into public.evo_reality_snapshots as rs(snapshot_id,seal_id,version,evidence_root,continuity_root,previous_continuity_root,evidence_state,signer_wallet,signature,signature_message,signed_at,status)
  values(v_snapshot_id,v_seal_id,'EVO-CONTINUITY-V0',v_evidence_root,v_continuity_root,v_previous_root,v_state,v_signer,v_signature,v_signature_message,v_signed_at,'ACTIVE')
  returning rs.* into v_inserted;

  return query select v_inserted.snapshot_id,v_inserted.seal_id,v_inserted.evidence_root,v_inserted.continuity_root,v_inserted.previous_continuity_root,v_inserted.signer_wallet,v_inserted.signed_at,v_inserted.registered_at,v_inserted.status,false;
end;
$$;

revoke all on function public.evo_register_reality_checkpoint_authoritative(jsonb) from public;
revoke all on function public.evo_register_reality_checkpoint_authoritative(jsonb) from anon;
revoke all on function public.evo_register_reality_checkpoint_authoritative(jsonb) from authenticated;
grant execute on function public.evo_register_reality_checkpoint_authoritative(jsonb) to postgres;
grant execute on function public.evo_register_reality_checkpoint_authoritative(jsonb) to service_role;
