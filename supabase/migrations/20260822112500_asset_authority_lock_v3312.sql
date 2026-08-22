-- EVO V3.3.12 · Asset Authority Lock
-- Serializes authoritative ownership-sensitive mutations per Seal.

create or replace function public.evo_register_passport_event_authoritative(p_row jsonb)
returns table(
  event_id text,
  seal_id text,
  event_type text,
  registered_at timestamptz,
  status text,
  current_owner text
)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_event_id text := upper(trim(coalesce(p_row ->> 'event_id', '')));
  v_seal_id text := upper(trim(coalesce(p_row ->> 'seal_id', '')));
  v_event_type text := upper(trim(coalesce(p_row ->> 'event_type', '')));
  v_actor text := lower(trim(coalesce(p_row ->> 'actor_wallet', '')));
  v_digest text := lower(trim(coalesce(p_row ->> 'event_digest', '')));
  v_nonce text := lower(trim(coalesce(p_row ->> 'nonce', '')));
  v_note text := trim(coalesce(p_row ->> 'note', ''));
  v_signature text := coalesce(p_row ->> 'signature', '');
  v_message text := coalesce(p_row ->> 'signature_message', '');
  v_created_at timestamptz;
  v_issuer text;
  v_owner text;
  v_registered_at timestamptz;
  v_status text;
  v_existing public.evo_passport_events%rowtype;
begin
  if p_row is null or pg_catalog.jsonb_typeof(p_row) <> 'object' then raise exception 'invalid_event_row'; end if;
  if coalesce(p_row ->> 'version','') <> 'EVO-PASSPORT-V1' then raise exception 'invalid_version'; end if;
  if v_event_id !~ '^EVP-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_event_id'; end if;
  if v_seal_id !~ '^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_seal_id'; end if;
  if v_event_type not in ('SOLD','REPAIRED','WARRANTY','INSPECTED','NOTE') then raise exception 'invalid_event_type'; end if;
  if v_actor !~ '^0x[0-9a-f]{40}$' then raise exception 'invalid_actor_wallet'; end if;
  if v_digest !~ '^[0-9a-f]{64}$' or v_nonce !~ '^[0-9a-f]{32}$' then raise exception 'invalid_hash'; end if;
  if length(v_note) < 1 or length(v_note) > 1000 then raise exception 'invalid_note'; end if;
  if length(v_signature) < 1 or length(v_signature) > 512 then raise exception 'invalid_signature_evidence'; end if;
  if length(v_message) < 1 or length(v_message) > 2048 then raise exception 'invalid_signature_evidence'; end if;
  if coalesce(p_row ->> 'new_owner_wallet','') <> '' then raise exception 'new_owner_only_via_two_party_transfer'; end if;

  begin
    v_created_at := (p_row ->> 'created_at')::timestamptz;
  exception when others then
    raise exception 'invalid_created_at';
  end;
  if v_created_at is null or v_created_at < pg_catalog.now() - interval '10 minutes' or v_created_at > pg_catalog.now() + interval '1 minute' then
    raise exception 'stale_or_future_timestamp';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evo-asset-authority|' || v_seal_id, 0));

  select e.* into v_existing
  from public.evo_passport_events e
  where e.event_id = v_event_id;

  if found then
    if v_existing.seal_id <> v_seal_id or lower(v_existing.actor_wallet) <> v_actor or v_existing.event_digest <> v_digest then
      raise exception 'event_id_conflict';
    end if;
    select coalesce(
      (select lower(pe.new_owner_wallet) from public.evo_passport_events pe
       where pe.seal_id=v_seal_id and pe.event_type='TRANSFERRED' and pe.status='ACTIVE'
       order by pe.registered_at desc, pe.event_id desc limit 1),
      lower(s.issuer_wallet)
    ) into v_owner
    from public.evo_seals s
    where s.seal_id=v_seal_id and s.status='ACTIVE';
    if v_owner is null then raise exception 'seal_not_found'; end if;
    return query select v_existing.event_id,v_existing.seal_id,v_existing.event_type,v_existing.registered_at,v_existing.status,v_owner;
    return;
  end if;

  select lower(s.issuer_wallet) into v_issuer
  from public.evo_seals s
  where s.seal_id=v_seal_id and s.status='ACTIVE';
  if not found then raise exception 'seal_not_found'; end if;

  select coalesce(
    (select lower(pe.new_owner_wallet) from public.evo_passport_events pe
     where pe.seal_id=v_seal_id and pe.event_type='TRANSFERRED' and pe.status='ACTIVE'
     order by pe.registered_at desc, pe.event_id desc limit 1),
    v_issuer
  ) into v_owner;

  if v_actor <> v_owner then raise exception 'actor_is_not_current_owner'; end if;

  insert into public.evo_passport_events as e(
    event_id,seal_id,version,event_type,actor_wallet,new_owner_wallet,note,event_digest,nonce,
    signature,signature_message,created_at,status
  ) values (
    v_event_id,v_seal_id,'EVO-PASSPORT-V1',v_event_type,v_actor,'',v_note,v_digest,v_nonce,
    v_signature,v_message,v_created_at,'ACTIVE'
  ) returning e.registered_at,e.status into v_registered_at,v_status;

  return query select v_event_id,v_seal_id,v_event_type,v_registered_at,v_status,v_owner;
end;
$$;

revoke all on function public.evo_register_passport_event_authoritative(jsonb) from public;
revoke all on function public.evo_register_passport_event_authoritative(jsonb) from anon;
revoke all on function public.evo_register_passport_event_authoritative(jsonb) from authenticated;
grant execute on function public.evo_register_passport_event_authoritative(jsonb) to postgres;
grant execute on function public.evo_register_passport_event_authoritative(jsonb) to service_role;

create or replace function public.accept_evo_passport_transfer(
  p_offer_id text,
  p_accept_digest text,
  p_accept_nonce text,
  p_accept_signature text,
  p_accept_message text,
  p_accepted_at timestamptz,
  p_event_id text,
  p_event_digest text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  o public.evo_passport_transfers%rowtype;
  current_owner text;
  issuer text;
begin
  select * into o
  from public.evo_passport_transfers
  where offer_id=p_offer_id
  for update;
  if not found then raise exception 'offer_not_found'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evo-asset-authority|' || o.seal_id, 0));

  if o.status <> 'PENDING' then raise exception 'offer_not_pending'; end if;
  if o.expires_at <= pg_catalog.now() then raise exception 'offer_expired'; end if;
  if p_event_id !~ '^EVP-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_event_id'; end if;
  if lower(trim(p_accept_digest)) !~ '^[0-9a-f]{64}$' or lower(trim(p_event_digest)) !~ '^[0-9a-f]{64}$' then raise exception 'invalid_digest'; end if;
  if lower(trim(p_accept_nonce)) !~ '^[0-9a-f]{32}$' then raise exception 'invalid_nonce'; end if;
  if length(coalesce(p_accept_signature,'')) < 1 or length(p_accept_signature) > 512 then raise exception 'invalid_signature_evidence'; end if;
  if length(coalesce(p_accept_message,'')) < 1 or length(p_accept_message) > 2048 then raise exception 'invalid_signature_evidence'; end if;
  if p_accepted_at < pg_catalog.now() - interval '10 minutes' or p_accepted_at > pg_catalog.now() + interval '1 minute' then raise exception 'stale_or_future_timestamp'; end if;

  select lower(s.issuer_wallet) into issuer
  from public.evo_seals s
  where s.seal_id=o.seal_id and s.status='ACTIVE';
  if not found then raise exception 'seal_not_found'; end if;

  select coalesce(
    (select lower(pe.new_owner_wallet) from public.evo_passport_events pe
     where pe.seal_id=o.seal_id and pe.event_type='TRANSFERRED' and pe.status='ACTIVE'
     order by pe.registered_at desc, pe.event_id desc limit 1),
    issuer
  ) into current_owner;

  if current_owner <> lower(o.from_wallet) then raise exception 'owner_changed'; end if;

  update public.evo_passport_transfers
  set status='ACCEPTED',accepted_at=p_accepted_at,accept_digest=lower(p_accept_digest),
      accept_nonce=lower(p_accept_nonce),accept_signature=p_accept_signature,accept_message=p_accept_message
  where offer_id=o.offer_id;

  insert into public.evo_passport_events(
    event_id,seal_id,version,event_type,actor_wallet,new_owner_wallet,note,event_digest,nonce,
    signature,signature_message,counterparty_wallet,counter_signature,counter_signature_message,
    created_at,status
  ) values (
    p_event_id,o.seal_id,'EVO-PASSPORT-V1','TRANSFERRED',lower(o.from_wallet),lower(o.to_wallet),
    'Two-party transfer accepted',lower(p_event_digest),lower(p_accept_nonce),o.offer_signature,o.offer_message,
    lower(o.to_wallet),p_accept_signature,p_accept_message,p_accepted_at,'ACTIVE'
  );

  return pg_catalog.jsonb_build_object('ok',true,'offerId',o.offer_id,'sealId',o.seal_id,'newOwner',lower(o.to_wallet),'eventId',p_event_id);
end;
$$;

revoke all on function public.accept_evo_passport_transfer(text,text,text,text,text,timestamptz,text,text) from public;
revoke all on function public.accept_evo_passport_transfer(text,text,text,text,text,timestamptz,text,text) from anon;
revoke all on function public.accept_evo_passport_transfer(text,text,text,text,text,timestamptz,text,text) from authenticated;
grant execute on function public.accept_evo_passport_transfer(text,text,text,text,text,timestamptz,text,text) to postgres;
grant execute on function public.accept_evo_passport_transfer(text,text,text,text,text,timestamptz,text,text) to service_role;
