-- EVO V3.3.13 · Atomic Transfer State Machine
-- Offer creation, acceptance and cancellation share the per-Seal Asset Authority Lock.
-- Terminal stale states are committed and returned as data rather than rolled back by exceptions.

create or replace function public.evo_create_passport_transfer_offer_authoritative(p_row jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_offer_id text := upper(trim(coalesce(p_row ->> 'offer_id','')));
  v_seal_id text := upper(trim(coalesce(p_row ->> 'seal_id','')));
  v_from text := lower(trim(coalesce(p_row ->> 'from_wallet','')));
  v_to text := lower(trim(coalesce(p_row ->> 'to_wallet','')));
  v_digest text := lower(trim(coalesce(p_row ->> 'offer_digest','')));
  v_nonce text := lower(trim(coalesce(p_row ->> 'offer_nonce','')));
  v_signature text := coalesce(p_row ->> 'offer_signature','');
  v_message text := coalesce(p_row ->> 'offer_message','');
  v_created_at timestamptz;
  v_expires_at timestamptz;
  v_issuer text;
  v_owner text;
  v_existing public.evo_passport_transfers%rowtype;
  v_inserted public.evo_passport_transfers%rowtype;
begin
  if p_row is null or pg_catalog.jsonb_typeof(p_row) <> 'object' then raise exception 'invalid_offer_row'; end if;
  if v_offer_id !~ '^EVX-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_offer_id'; end if;
  if v_seal_id !~ '^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_seal_id'; end if;
  if v_from !~ '^0x[0-9a-f]{40}$' or v_to !~ '^0x[0-9a-f]{40}$' then raise exception 'invalid_wallet'; end if;
  if v_from = v_to then raise exception 'same_wallet'; end if;
  if v_digest !~ '^[0-9a-f]{64}$' or v_nonce !~ '^[0-9a-f]{32}$' then raise exception 'invalid_hash'; end if;
  if length(v_signature) < 1 or length(v_signature) > 512 then raise exception 'invalid_signature_evidence'; end if;
  if length(v_message) < 1 or length(v_message) > 2048 then raise exception 'invalid_signature_evidence'; end if;
  begin
    v_created_at := (p_row ->> 'created_at')::timestamptz;
    v_expires_at := (p_row ->> 'expires_at')::timestamptz;
  exception when others then
    raise exception 'invalid_time';
  end;
  if v_created_at < pg_catalog.now() - interval '10 minutes' or v_created_at > pg_catalog.now() + interval '1 minute' then raise exception 'stale_or_future_timestamp'; end if;
  if v_expires_at <= v_created_at + interval '5 minutes' or v_expires_at > v_created_at + interval '24 hours' then raise exception 'invalid_expiry'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evo-asset-authority|' || v_seal_id,0));

  select t.* into v_existing from public.evo_passport_transfers t where t.offer_id=v_offer_id;
  if found then
    if v_existing.seal_id<>v_seal_id or lower(v_existing.from_wallet)<>v_from or lower(v_existing.to_wallet)<>v_to or v_existing.offer_digest<>v_digest then
      raise exception 'offer_id_conflict';
    end if;
    return pg_catalog.jsonb_build_object(
      'ok',true,'idempotent',true,'offerId',v_existing.offer_id,'sealId',v_existing.seal_id,
      'fromWallet',lower(v_existing.from_wallet),'toWallet',lower(v_existing.to_wallet),
      'status',v_existing.status,'createdAt',v_existing.created_at,'expiresAt',v_existing.expires_at
    );
  end if;

  update public.evo_passport_transfers
     set status='EXPIRED'
   where seal_id=v_seal_id and status='PENDING' and expires_at<=pg_catalog.now();

  select lower(s.issuer_wallet) into v_issuer
  from public.evo_seals s where s.seal_id=v_seal_id and s.status='ACTIVE';
  if not found then raise exception 'seal_not_found'; end if;

  select coalesce(
    (select lower(e.new_owner_wallet) from public.evo_passport_events e
      where e.seal_id=v_seal_id and e.event_type='TRANSFERRED' and e.status='ACTIVE'
      order by e.registered_at desc,e.event_id desc limit 1),
    v_issuer
  ) into v_owner;
  if v_from<>v_owner then raise exception 'actor_is_not_current_owner'; end if;

  insert into public.evo_passport_transfers as t(
    offer_id,seal_id,from_wallet,to_wallet,offer_digest,offer_nonce,offer_signature,offer_message,
    created_at,expires_at,status
  ) values (
    v_offer_id,v_seal_id,v_from,v_to,v_digest,v_nonce,v_signature,v_message,v_created_at,v_expires_at,'PENDING'
  ) returning t.* into v_inserted;

  return pg_catalog.jsonb_build_object(
    'ok',true,'idempotent',false,'offerId',v_inserted.offer_id,'sealId',v_inserted.seal_id,
    'fromWallet',lower(v_inserted.from_wallet),'toWallet',lower(v_inserted.to_wallet),
    'status',v_inserted.status,'createdAt',v_inserted.created_at,'expiresAt',v_inserted.expires_at
  );
end;
$$;

create or replace function public.evo_accept_passport_transfer_authoritative(
  p_offer_id text,
  p_actor_wallet text,
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
  v_actor text := lower(trim(p_actor_wallet));
  v_owner text;
  v_issuer text;
begin
  if upper(trim(p_offer_id)) !~ '^EVX-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_offer_id'; end if;
  if v_actor !~ '^0x[0-9a-f]{40}$' then raise exception 'invalid_actor_wallet'; end if;
  if lower(trim(p_accept_digest)) !~ '^[0-9a-f]{64}$' or lower(trim(p_event_digest)) !~ '^[0-9a-f]{64}$' then raise exception 'invalid_digest'; end if;
  if lower(trim(p_accept_nonce)) !~ '^[0-9a-f]{32}$' then raise exception 'invalid_nonce'; end if;
  if p_event_id !~ '^EVP-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_event_id'; end if;
  if length(coalesce(p_accept_signature,''))<1 or length(p_accept_signature)>512 then raise exception 'invalid_signature_evidence'; end if;
  if length(coalesce(p_accept_message,''))<1 or length(p_accept_message)>2048 then raise exception 'invalid_signature_evidence'; end if;
  if p_accepted_at < pg_catalog.now()-interval '10 minutes' or p_accepted_at > pg_catalog.now()+interval '1 minute' then raise exception 'stale_or_future_timestamp'; end if;

  select t.* into o from public.evo_passport_transfers t where t.offer_id=upper(trim(p_offer_id)) for update;
  if not found then raise exception 'offer_not_found'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evo-asset-authority|'||o.seal_id,0));

  if v_actor<>lower(o.to_wallet) then raise exception 'only_recipient_can_accept'; end if;

  if o.status='ACCEPTED' then
    if o.accept_digest=lower(trim(p_accept_digest)) and o.accept_nonce=lower(trim(p_accept_nonce)) then
      return pg_catalog.jsonb_build_object('ok',true,'idempotent',true,'status','ACCEPTED','offerId',o.offer_id,'sealId',o.seal_id,'newOwner',lower(o.to_wallet));
    end if;
    return pg_catalog.jsonb_build_object('ok',false,'error','offer_already_accepted','status','ACCEPTED','offerId',o.offer_id);
  end if;
  if o.status='CANCELLED' then return pg_catalog.jsonb_build_object('ok',false,'error','offer_cancelled','status','CANCELLED','offerId',o.offer_id); end if;
  if o.status='EXPIRED' then return pg_catalog.jsonb_build_object('ok',false,'error','offer_expired','status','EXPIRED','offerId',o.offer_id); end if;

  if o.expires_at<=pg_catalog.now() then
    update public.evo_passport_transfers set status='EXPIRED' where offer_id=o.offer_id;
    return pg_catalog.jsonb_build_object('ok',false,'error','offer_expired','status','EXPIRED','offerId',o.offer_id);
  end if;

  select lower(s.issuer_wallet) into v_issuer from public.evo_seals s where s.seal_id=o.seal_id and s.status='ACTIVE';
  if not found then raise exception 'seal_not_found'; end if;
  select coalesce(
    (select lower(e.new_owner_wallet) from public.evo_passport_events e
      where e.seal_id=o.seal_id and e.event_type='TRANSFERRED' and e.status='ACTIVE'
      order by e.registered_at desc,e.event_id desc limit 1),
    v_issuer
  ) into v_owner;

  if v_owner<>lower(o.from_wallet) then
    update public.evo_passport_transfers set status='CANCELLED' where offer_id=o.offer_id;
    return pg_catalog.jsonb_build_object('ok',false,'error','owner_changed','status','CANCELLED','offerId',o.offer_id,'currentOwner',v_owner);
  end if;

  update public.evo_passport_transfers
     set status='ACCEPTED',accepted_at=p_accepted_at,accept_digest=lower(trim(p_accept_digest)),
         accept_nonce=lower(trim(p_accept_nonce)),accept_signature=p_accept_signature,accept_message=p_accept_message
   where offer_id=o.offer_id;

  insert into public.evo_passport_events(
    event_id,seal_id,version,event_type,actor_wallet,new_owner_wallet,note,event_digest,nonce,
    signature,signature_message,counterparty_wallet,counter_signature,counter_signature_message,
    created_at,status
  ) values (
    p_event_id,o.seal_id,'EVO-PASSPORT-V1','TRANSFERRED',lower(o.from_wallet),lower(o.to_wallet),
    'Two-party transfer accepted',lower(trim(p_event_digest)),lower(trim(p_accept_nonce)),o.offer_signature,o.offer_message,
    lower(o.to_wallet),p_accept_signature,p_accept_message,p_accepted_at,'ACTIVE'
  );

  return pg_catalog.jsonb_build_object('ok',true,'idempotent',false,'status','ACCEPTED','offerId',o.offer_id,'sealId',o.seal_id,'newOwner',lower(o.to_wallet),'eventId',p_event_id);
end;
$$;

create or replace function public.evo_cancel_passport_transfer_authoritative(
  p_offer_id text,
  p_actor_wallet text,
  p_cancel_digest text,
  p_cancel_nonce text,
  p_cancel_signature text,
  p_cancel_message text,
  p_cancelled_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  o public.evo_passport_transfers%rowtype;
  v_actor text := lower(trim(p_actor_wallet));
  v_owner text;
  v_issuer text;
begin
  if upper(trim(p_offer_id)) !~ '^EVX-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_offer_id'; end if;
  if v_actor !~ '^0x[0-9a-f]{40}$' then raise exception 'invalid_actor_wallet'; end if;
  if lower(trim(p_cancel_digest)) !~ '^[0-9a-f]{64}$' or lower(trim(p_cancel_nonce)) !~ '^[0-9a-f]{32}$' then raise exception 'invalid_cancellation'; end if;
  if length(coalesce(p_cancel_signature,''))<1 or length(p_cancel_signature)>512 then raise exception 'invalid_signature_evidence'; end if;
  if length(coalesce(p_cancel_message,''))<1 or length(p_cancel_message)>2048 then raise exception 'invalid_signature_evidence'; end if;
  if p_cancelled_at < pg_catalog.now()-interval '10 minutes' or p_cancelled_at > pg_catalog.now()+interval '1 minute' then raise exception 'stale_or_future_timestamp'; end if;

  select t.* into o from public.evo_passport_transfers t where t.offer_id=upper(trim(p_offer_id)) for update;
  if not found then raise exception 'offer_not_found'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evo-asset-authority|'||o.seal_id,0));

  if v_actor<>lower(o.from_wallet) then raise exception 'only_sender_can_cancel'; end if;
  if o.status='CANCELLED' then
    if o.cancel_digest=lower(trim(p_cancel_digest)) and o.cancel_nonce=lower(trim(p_cancel_nonce)) then
      return pg_catalog.jsonb_build_object('ok',true,'idempotent',true,'status','CANCELLED','offerId',o.offer_id);
    end if;
    return pg_catalog.jsonb_build_object('ok',false,'error','offer_cancelled','status','CANCELLED','offerId',o.offer_id);
  end if;
  if o.status='ACCEPTED' then return pg_catalog.jsonb_build_object('ok',false,'error','offer_already_accepted','status','ACCEPTED','offerId',o.offer_id); end if;
  if o.status='EXPIRED' then return pg_catalog.jsonb_build_object('ok',false,'error','offer_expired','status','EXPIRED','offerId',o.offer_id); end if;

  if o.expires_at<=pg_catalog.now() then
    update public.evo_passport_transfers set status='EXPIRED' where offer_id=o.offer_id;
    return pg_catalog.jsonb_build_object('ok',false,'error','offer_expired','status','EXPIRED','offerId',o.offer_id);
  end if;

  select lower(s.issuer_wallet) into v_issuer from public.evo_seals s where s.seal_id=o.seal_id and s.status='ACTIVE';
  if not found then raise exception 'seal_not_found'; end if;
  select coalesce(
    (select lower(e.new_owner_wallet) from public.evo_passport_events e
      where e.seal_id=o.seal_id and e.event_type='TRANSFERRED' and e.status='ACTIVE'
      order by e.registered_at desc,e.event_id desc limit 1),
    v_issuer
  ) into v_owner;
  if v_owner<>lower(o.from_wallet) then
    update public.evo_passport_transfers set status='CANCELLED' where offer_id=o.offer_id;
    return pg_catalog.jsonb_build_object('ok',false,'error','owner_changed','status','CANCELLED','offerId',o.offer_id,'currentOwner',v_owner);
  end if;

  update public.evo_passport_transfers
     set status='CANCELLED',cancelled_at=p_cancelled_at,cancel_digest=lower(trim(p_cancel_digest)),
         cancel_nonce=lower(trim(p_cancel_nonce)),cancel_signature=p_cancel_signature,cancel_message=p_cancel_message
   where offer_id=o.offer_id;

  return pg_catalog.jsonb_build_object('ok',true,'idempotent',false,'status','CANCELLED','offerId',o.offer_id);
end;
$$;

revoke all on function public.evo_create_passport_transfer_offer_authoritative(jsonb) from public;
revoke all on function public.evo_create_passport_transfer_offer_authoritative(jsonb) from anon;
revoke all on function public.evo_create_passport_transfer_offer_authoritative(jsonb) from authenticated;
grant execute on function public.evo_create_passport_transfer_offer_authoritative(jsonb) to postgres;
grant execute on function public.evo_create_passport_transfer_offer_authoritative(jsonb) to service_role;

revoke all on function public.evo_accept_passport_transfer_authoritative(text,text,text,text,text,text,timestamptz,text,text) from public;
revoke all on function public.evo_accept_passport_transfer_authoritative(text,text,text,text,text,text,timestamptz,text,text) from anon;
revoke all on function public.evo_accept_passport_transfer_authoritative(text,text,text,text,text,text,timestamptz,text,text) from authenticated;
grant execute on function public.evo_accept_passport_transfer_authoritative(text,text,text,text,text,text,timestamptz,text,text) to postgres;
grant execute on function public.evo_accept_passport_transfer_authoritative(text,text,text,text,text,text,timestamptz,text,text) to service_role;

revoke all on function public.evo_cancel_passport_transfer_authoritative(text,text,text,text,text,text,timestamptz) from public;
revoke all on function public.evo_cancel_passport_transfer_authoritative(text,text,text,text,text,text,timestamptz) from anon;
revoke all on function public.evo_cancel_passport_transfer_authoritative(text,text,text,text,text,text,timestamptz) from authenticated;
grant execute on function public.evo_cancel_passport_transfer_authoritative(text,text,text,text,text,text,timestamptz) to postgres;
grant execute on function public.evo_cancel_passport_transfer_authoritative(text,text,text,text,text,text,timestamptz) to service_role;
