-- EVO V3.3.15 · Atomic Document Lifecycle Authority
-- Issuer-authoritative document lifecycle events are validated and committed under
-- deterministic per-Seal locks. Supersede operations lock both source/replacement,
-- preventing concurrent A->B / B->A cycles and check-then-insert races.

create or replace function public.evo_register_document_lifecycle_authoritative(p_row jsonb)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_event_id text := upper(trim(coalesce(p_row ->> 'event_id','')));
  v_seal_id text := upper(trim(coalesce(p_row ->> 'seal_id','')));
  v_event_type text := upper(trim(coalesce(p_row ->> 'event_type','')));
  v_actor text := lower(trim(coalesce(p_row ->> 'actor_wallet','')));
  v_related text := upper(trim(coalesce(p_row ->> 'related_seal_id','')));
  v_reason text := trim(coalesce(p_row ->> 'reason',''));
  v_digest text := lower(trim(coalesce(p_row ->> 'event_digest','')));
  v_nonce text := lower(trim(coalesce(p_row ->> 'nonce','')));
  v_signature text := coalesce(p_row ->> 'signature','');
  v_message text := coalesce(p_row ->> 'signature_message','');
  v_created_at timestamptz;
  v_existing public.evo_document_events%rowtype;
  v_inserted public.evo_document_events%rowtype;
  v_lock_first text;
  v_lock_second text;
begin
  if p_row is null or pg_catalog.jsonb_typeof(p_row)<>'object' then raise exception 'invalid_event_row'; end if;
  if coalesce(p_row ->> 'version','')<>'EVO-DOCUMENT-LIFECYCLE-V1' then raise exception 'invalid_version'; end if;
  if v_event_id !~ '^EVD-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_event_id'; end if;
  if v_seal_id !~ '^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_seal_id'; end if;
  if v_event_type not in ('DOCUMENT_REVOKED','DOCUMENT_SUPERSEDED','DOCUMENT_NOTE') then raise exception 'invalid_event_type'; end if;
  if v_actor !~ '^0x[0-9a-f]{40}$' then raise exception 'invalid_actor_wallet'; end if;
  if v_digest !~ '^[0-9a-f]{64}$' or v_nonce !~ '^[0-9a-f]{32}$' then raise exception 'invalid_hash'; end if;
  if length(v_reason)>1200 then raise exception 'reason_too_long'; end if;
  if v_event_type<>'DOCUMENT_NOTE' and length(v_reason)<3 then raise exception 'reason_required'; end if;
  if length(v_signature)<1 or length(v_signature)>512 or length(v_message)<1 or length(v_message)>2048 then raise exception 'invalid_signature_evidence'; end if;

  if v_event_type='DOCUMENT_SUPERSEDED' then
    if v_related !~ '^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'related_seal_required'; end if;
    if v_related=v_seal_id then raise exception 'cannot_supersede_with_self'; end if;
  elsif v_related<>'' then
    raise exception 'related_seal_only_for_supersede';
  end if;

  begin v_created_at := (p_row ->> 'created_at')::timestamptz;
  exception when others then raise exception 'invalid_created_at'; end;
  if v_created_at < pg_catalog.now()-interval '10 minutes' or v_created_at > pg_catalog.now()+interval '1 minute' then raise exception 'stale_or_future_timestamp'; end if;

  if v_related<>'' and v_related<v_seal_id then
    v_lock_first:=v_related; v_lock_second:=v_seal_id;
  else
    v_lock_first:=v_seal_id; v_lock_second:=nullif(v_related,'');
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evo-document-lifecycle|'||v_lock_first,0));
  if v_lock_second is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evo-document-lifecycle|'||v_lock_second,0));
  end if;

  select e.* into v_existing from public.evo_document_events e where e.event_id=v_event_id;
  if found then
    if v_existing.seal_id<>v_seal_id or lower(v_existing.actor_wallet)<>v_actor or v_existing.event_digest<>v_digest then
      raise exception 'event_id_conflict';
    end if;
    return pg_catalog.jsonb_build_object(
      'ok',true,'idempotent',true,'eventId',v_existing.event_id,'sealId',v_existing.seal_id,
      'eventType',v_existing.event_type,'relatedSealId',v_existing.related_seal_id,
      'registeredAt',v_existing.registered_at,'status',v_existing.status
    );
  end if;

  if not exists(
    select 1 from public.evo_seals s
    where s.seal_id=v_seal_id and s.status='ACTIVE'
      and lower(s.asset_type)='documento' and lower(s.issuer_wallet)=v_actor
  ) then
    if not exists(select 1 from public.evo_seals s where s.seal_id=v_seal_id and s.status='ACTIVE') then raise exception 'seal_not_found'; end if;
    if not exists(select 1 from public.evo_seals s where s.seal_id=v_seal_id and lower(s.asset_type)='documento') then raise exception 'not_a_document_proof'; end if;
    raise exception 'issuer_signature_required';
  end if;

  if exists(
    select 1 from public.evo_document_events e
    where e.seal_id=v_seal_id and e.status='ACTIVE'
      and e.event_type in ('DOCUMENT_REVOKED','DOCUMENT_SUPERSEDED')
  ) then raise exception 'document_lifecycle_already_terminal'; end if;

  if v_event_type='DOCUMENT_SUPERSEDED' then
    if not exists(
      select 1 from public.evo_seals s
      where s.seal_id=v_related and s.status='ACTIVE'
        and lower(s.asset_type)='documento' and lower(s.issuer_wallet)=v_actor
    ) then
      if not exists(select 1 from public.evo_seals s where s.seal_id=v_related and s.status='ACTIVE') then raise exception 'replacement_not_found'; end if;
      if not exists(select 1 from public.evo_seals s where s.seal_id=v_related and lower(s.asset_type)='documento') then raise exception 'replacement_not_document'; end if;
      raise exception 'replacement_issuer_mismatch';
    end if;
    if exists(
      select 1 from public.evo_document_events e
      where e.seal_id=v_related and e.status='ACTIVE'
        and e.event_type in ('DOCUMENT_REVOKED','DOCUMENT_SUPERSEDED')
    ) then raise exception 'replacement_is_not_current'; end if;
  end if;

  insert into public.evo_document_events as e(
    event_id,seal_id,version,event_type,actor_wallet,related_seal_id,reason,event_digest,
    nonce,signature,signature_message,created_at,status
  ) values (
    v_event_id,v_seal_id,'EVO-DOCUMENT-LIFECYCLE-V1',v_event_type,v_actor,v_related,v_reason,
    v_digest,v_nonce,v_signature,v_message,v_created_at,'ACTIVE'
  ) returning e.* into v_inserted;

  return pg_catalog.jsonb_build_object(
    'ok',true,'idempotent',false,'eventId',v_inserted.event_id,'sealId',v_inserted.seal_id,
    'eventType',v_inserted.event_type,'relatedSealId',v_inserted.related_seal_id,
    'registeredAt',v_inserted.registered_at,'status',v_inserted.status
  );
end;
$$;

revoke all on function public.evo_register_document_lifecycle_authoritative(jsonb) from public;
revoke all on function public.evo_register_document_lifecycle_authoritative(jsonb) from anon;
revoke all on function public.evo_register_document_lifecycle_authoritative(jsonb) from authenticated;
grant execute on function public.evo_register_document_lifecycle_authoritative(jsonb) to postgres;
grant execute on function public.evo_register_document_lifecycle_authoritative(jsonb) to service_role;
