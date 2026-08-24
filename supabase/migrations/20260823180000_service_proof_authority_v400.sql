-- EVO V4.0 RC · Service Proof Authority
-- Closes the owner-check / insert race by serializing Service Proof creation
-- with the same per-Seal Asset Authority lock used by ownership transitions.

create or replace function public.evo_register_service_proof_authoritative(p_row jsonb)
returns table(
  proof_id text,
  seal_id text,
  evidence_level text,
  registered_at timestamptz,
  status text,
  current_owner text,
  idempotent boolean
)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_proof_id text := upper(trim(coalesce(p_row ->> 'proof_id', '')));
  v_seal_id text := upper(trim(coalesce(p_row ->> 'seal_id', '')));
  v_owner text := lower(trim(coalesce(p_row ->> 'owner_wallet', '')));
  v_provider text := lower(trim(coalesce(p_row ->> 'provider_wallet', '')));
  v_service_digest text := lower(trim(coalesce(p_row ->> 'service_digest', '')));
  v_owner_nonce text := lower(trim(coalesce(p_row ->> 'owner_nonce', '')));
  v_created_at timestamptz;
  v_performed_at timestamptz;
  v_issuer text;
  v_current_owner text;
  v_existing public.evo_service_proofs%rowtype;
  v_inserted public.evo_service_proofs%rowtype;
begin
  if p_row is null or pg_catalog.jsonb_typeof(p_row) <> 'object' then raise exception 'invalid_service_proof_row'; end if;
  if coalesce(p_row ->> 'version','') <> 'EVO-SERVICE-PROOF-V1' then raise exception 'invalid_version'; end if;
  if v_proof_id !~ '^EVS-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_proof_id'; end if;
  if v_seal_id !~ '^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_seal_id'; end if;
  if v_owner !~ '^0x[0-9a-f]{40}$' then raise exception 'invalid_owner_wallet'; end if;
  if v_provider <> '' and v_provider !~ '^0x[0-9a-f]{40}$' then raise exception 'invalid_provider_wallet'; end if;
  if v_provider <> '' and v_provider = v_owner then raise exception 'provider_must_differ_from_owner'; end if;
  if v_service_digest !~ '^[0-9a-f]{64}$' or v_owner_nonce !~ '^[0-9a-f]{32}$' then raise exception 'invalid_hash'; end if;
  if length(coalesce(p_row ->> 'owner_signature','')) < 1 or length(coalesce(p_row ->> 'owner_signature','')) > 512 then raise exception 'invalid_signature_evidence'; end if;
  if length(coalesce(p_row ->> 'owner_message','')) < 1 or length(coalesce(p_row ->> 'owner_message','')) > 2048 then raise exception 'invalid_signature_evidence'; end if;

  begin
    v_created_at := (p_row ->> 'created_at')::timestamptz;
    v_performed_at := (p_row ->> 'performed_at')::timestamptz;
  exception when others then
    raise exception 'invalid_time';
  end;
  if v_created_at is null or v_created_at < pg_catalog.now() - interval '10 minutes' or v_created_at > pg_catalog.now() + interval '1 minute' then
    raise exception 'stale_or_future_timestamp';
  end if;
  if v_performed_at is null then raise exception 'invalid_time'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evo-asset-authority|' || v_seal_id, 0));

  select lower(s.issuer_wallet) into v_issuer
  from public.evo_seals s
  where s.seal_id = v_seal_id and s.status = 'ACTIVE';
  if not found then raise exception 'seal_not_found'; end if;

  select coalesce(
    (select lower(pe.new_owner_wallet)
     from public.evo_passport_events pe
     where pe.seal_id = v_seal_id
       and pe.event_type = 'TRANSFERRED'
       and pe.status = 'ACTIVE'
     order by pe.registered_at desc, pe.event_id desc
     limit 1),
    v_issuer
  ) into v_current_owner;

  select sp.* into v_existing
  from public.evo_service_proofs sp
  where sp.proof_id = v_proof_id;

  if found then
    if v_existing.seal_id <> v_seal_id
       or lower(v_existing.owner_wallet) <> v_owner
       or lower(v_existing.service_digest) <> v_service_digest then
      raise exception 'proof_id_conflict';
    end if;
    return query select
      v_existing.proof_id,
      v_existing.seal_id,
      v_existing.evidence_level,
      v_existing.registered_at,
      v_existing.status,
      v_current_owner,
      true;
    return;
  end if;

  if v_owner <> v_current_owner then raise exception 'actor_is_not_current_owner'; end if;

  insert into public.evo_service_proofs as sp(
    proof_id,seal_id,version,service_type,owner_wallet,provider_wallet,provider_label,technician_label,
    performed_at,summary,meter,parts,next_service,evidence_digests,service_digest,owner_nonce,
    owner_signature,owner_message,created_at,evidence_level,status
  ) values (
    v_proof_id,
    v_seal_id,
    'EVO-SERVICE-PROOF-V1',
    upper(trim(coalesce(p_row ->> 'service_type',''))),
    v_owner,
    v_provider,
    trim(coalesce(p_row ->> 'provider_label','')),
    trim(coalesce(p_row ->> 'technician_label','')),
    v_performed_at,
    trim(coalesce(p_row ->> 'summary','')),
    coalesce(p_row -> 'meter','{}'::jsonb),
    coalesce(p_row -> 'parts','[]'::jsonb),
    coalesce(p_row -> 'next_service','{}'::jsonb),
    coalesce(p_row -> 'evidence_digests','[]'::jsonb),
    v_service_digest,
    v_owner_nonce,
    coalesce(p_row ->> 'owner_signature',''),
    coalesce(p_row ->> 'owner_message',''),
    v_created_at,
    'OWNER_DECLARED',
    'ACTIVE'
  ) returning sp.* into v_inserted;

  return query select
    v_inserted.proof_id,
    v_inserted.seal_id,
    v_inserted.evidence_level,
    v_inserted.registered_at,
    v_inserted.status,
    v_current_owner,
    false;
end;
$$;

revoke all on function public.evo_register_service_proof_authoritative(jsonb) from public;
revoke all on function public.evo_register_service_proof_authoritative(jsonb) from anon;
revoke all on function public.evo_register_service_proof_authoritative(jsonb) from authenticated;
grant execute on function public.evo_register_service_proof_authoritative(jsonb) to postgres;
grant execute on function public.evo_register_service_proof_authoritative(jsonb) to service_role;

create or replace function public.evo_countersign_service_proof_authoritative(p_row jsonb)
returns table(
  proof_id text,
  seal_id text,
  evidence_level text,
  countersigned_at timestamptz,
  idempotent boolean
)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_proof_id text := upper(trim(coalesce(p_row ->> 'proof_id', '')));
  v_actor text := lower(trim(coalesce(p_row ->> 'actor_wallet', '')));
  v_provider_digest text := lower(trim(coalesce(p_row ->> 'provider_digest', '')));
  v_provider_nonce text := lower(trim(coalesce(p_row ->> 'provider_nonce', '')));
  v_signature text := coalesce(p_row ->> 'provider_signature','');
  v_message text := coalesce(p_row ->> 'provider_message','');
  v_countersigned_at timestamptz;
  v_proof public.evo_service_proofs%rowtype;
begin
  if p_row is null or pg_catalog.jsonb_typeof(p_row) <> 'object' then raise exception 'invalid_countersign_row'; end if;
  if v_proof_id !~ '^EVS-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_proof_id'; end if;
  if v_actor !~ '^0x[0-9a-f]{40}$' then raise exception 'invalid_actor_wallet'; end if;
  if v_provider_digest !~ '^[0-9a-f]{64}$' or v_provider_nonce !~ '^[0-9a-f]{32}$' then raise exception 'invalid_hash'; end if;
  if length(v_signature) < 1 or length(v_signature) > 512 or length(v_message) < 1 or length(v_message) > 2048 then raise exception 'invalid_signature_evidence'; end if;
  begin
    v_countersigned_at := (p_row ->> 'countersigned_at')::timestamptz;
  exception when others then
    raise exception 'invalid_time';
  end;
  if v_countersigned_at is null or v_countersigned_at < pg_catalog.now() - interval '10 minutes' or v_countersigned_at > pg_catalog.now() + interval '1 minute' then
    raise exception 'stale_or_future_timestamp';
  end if;

  select sp.* into v_proof
  from public.evo_service_proofs sp
  where sp.proof_id = v_proof_id and sp.status = 'ACTIVE'
  for update;
  if not found then raise exception 'proof_not_found'; end if;

  if coalesce(v_proof.provider_wallet,'') = '' then raise exception 'provider_not_designated'; end if;
  if lower(v_proof.provider_wallet) = lower(v_proof.owner_wallet) then raise exception 'invalid_provider_relation'; end if;
  if v_actor <> lower(v_proof.provider_wallet) then raise exception 'only_designated_provider_can_countersign'; end if;

  if v_proof.evidence_level = 'PROVIDER_COUNTERSIGNED' then
    if lower(v_proof.provider_digest) = v_provider_digest
       and v_proof.provider_signature = v_signature
       and v_proof.provider_message = v_message then
      return query select v_proof.proof_id,v_proof.seal_id,v_proof.evidence_level,v_proof.countersigned_at,true;
      return;
    end if;
    raise exception 'already_countersigned';
  end if;
  if v_proof.evidence_level <> 'OWNER_DECLARED' then raise exception 'invalid_evidence_level'; end if;

  update public.evo_service_proofs as sp
  set provider_digest = v_provider_digest,
      provider_nonce = v_provider_nonce,
      provider_signature = v_signature,
      provider_message = v_message,
      countersigned_at = v_countersigned_at,
      evidence_level = 'PROVIDER_COUNTERSIGNED'
  where sp.proof_id = v_proof_id
  returning sp.* into v_proof;

  return query select v_proof.proof_id,v_proof.seal_id,v_proof.evidence_level,v_proof.countersigned_at,false;
end;
$$;

revoke all on function public.evo_countersign_service_proof_authoritative(jsonb) from public;
revoke all on function public.evo_countersign_service_proof_authoritative(jsonb) from anon;
revoke all on function public.evo_countersign_service_proof_authoritative(jsonb) from authenticated;
grant execute on function public.evo_countersign_service_proof_authoritative(jsonb) to postgres;
grant execute on function public.evo_countersign_service_proof_authoritative(jsonb) to service_role;
