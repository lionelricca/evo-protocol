\set ON_ERROR_STOP on

-- Seal 2: normal offer + acceptance + stale old-owner offer rejection.
insert into public.evo_seals(seal_id,issuer_wallet,status)
values ('EVO-22222222-33333333-44444444','0x1111111111111111111111111111111111111111','ACTIVE');

select public.evo_create_passport_transfer_offer_authoritative(jsonb_build_object(
  'offer_id','EVX-22222222-33333333-44444444',
  'seal_id','EVO-22222222-33333333-44444444',
  'from_wallet','0x1111111111111111111111111111111111111111',
  'to_wallet','0x2222222222222222222222222222222222222222',
  'offer_digest',repeat('6',64),
  'offer_nonce',repeat('7',32),
  'offer_signature','offer-sig-2',
  'offer_message','offer-message-2',
  'created_at',now(),
  'expires_at',now()+interval '1 hour'
));

-- Exact offer retry must not duplicate.
select public.evo_create_passport_transfer_offer_authoritative(jsonb_build_object(
  'offer_id','EVX-22222222-33333333-44444444',
  'seal_id','EVO-22222222-33333333-44444444',
  'from_wallet','0x1111111111111111111111111111111111111111',
  'to_wallet','0x2222222222222222222222222222222222222222',
  'offer_digest',repeat('6',64),
  'offer_nonce',repeat('7',32),
  'offer_signature','offer-sig-2',
  'offer_message','offer-message-2',
  'created_at',now(),
  'expires_at',now()+interval '1 hour'
));

select public.evo_accept_passport_transfer_authoritative(
  'EVX-22222222-33333333-44444444',
  '0x2222222222222222222222222222222222222222',
  repeat('8',64),repeat('9',32),'accept-sig-2','accept-message-2',now(),
  'EVP-22222222-33333333-44444444',repeat('0',64)
);

-- Exact acceptance retry must remain accepted without another ownership event.
select public.evo_accept_passport_transfer_authoritative(
  'EVX-22222222-33333333-44444444',
  '0x2222222222222222222222222222222222222222',
  repeat('8',64),repeat('9',32),'accept-sig-2','accept-message-2',now(),
  'EVP-22222222-33333333-44444444',repeat('0',64)
);

do $$
declare n integer;
begin
  select count(*) into n from public.evo_passport_events
  where seal_id='EVO-22222222-33333333-44444444' and event_type='TRANSFERRED' and status='ACTIVE';
  if n<>1 then raise exception 'accept_retry_created_duplicate_transfer_event'; end if;

  begin
    perform public.evo_create_passport_transfer_offer_authoritative(jsonb_build_object(
      'offer_id','EVX-AAAA2222-BBBB3333-CCCC4444',
      'seal_id','EVO-22222222-33333333-44444444',
      'from_wallet','0x1111111111111111111111111111111111111111',
      'to_wallet','0x3333333333333333333333333333333333333333',
      'offer_digest',repeat('b',64),
      'offer_nonce',repeat('c',32),
      'offer_signature','stale-owner-offer-sig',
      'offer_message','stale-owner-offer-message',
      'created_at',now(),
      'expires_at',now()+interval '1 hour'
    ));
    raise exception 'old_owner_offer_was_not_rejected';
  exception when others then
    if position('actor_is_not_current_owner' in sqlerrm)=0 then raise; end if;
  end;
end;
$$;

-- Seal 3: a legacy pending offer that is already expired must persist EXPIRED.
insert into public.evo_seals(seal_id,issuer_wallet,status)
values ('EVO-33333333-44444444-55555555','0x1111111111111111111111111111111111111111','ACTIVE');
insert into public.evo_passport_transfers(
  offer_id,seal_id,from_wallet,to_wallet,offer_digest,offer_nonce,offer_signature,offer_message,created_at,expires_at,status
) values (
  'EVX-33333333-44444444-55555555','EVO-33333333-44444444-55555555',
  '0x1111111111111111111111111111111111111111','0x2222222222222222222222222222222222222222',
  repeat('d',64),repeat('e',32),'legacy-expired-sig','legacy-expired-message',
  now()-interval '2 hours',now()-interval '1 hour','PENDING'
);

select public.evo_accept_passport_transfer_authoritative(
  'EVX-33333333-44444444-55555555','0x2222222222222222222222222222222222222222',
  repeat('f',64),repeat('1',32),'expired-accept-sig','expired-accept-message',now(),
  'EVP-33333333-44444444-55555555',repeat('2',64)
);

do $$
declare s text;
begin
  select status into s from public.evo_passport_transfers where offer_id='EVX-33333333-44444444-55555555';
  if s<>'EXPIRED' then raise exception 'expired_offer_state_not_persisted'; end if;
end;
$$;

-- Seal 4: owner changed through another transfer before acceptance; stale offer becomes CANCELLED.
insert into public.evo_seals(seal_id,issuer_wallet,status)
values ('EVO-44444444-55555555-66666666','0x1111111111111111111111111111111111111111','ACTIVE');
insert into public.evo_passport_transfers(
  offer_id,seal_id,from_wallet,to_wallet,offer_digest,offer_nonce,offer_signature,offer_message,created_at,expires_at,status
) values (
  'EVX-44444444-55555555-66666666','EVO-44444444-55555555-66666666',
  '0x1111111111111111111111111111111111111111','0x2222222222222222222222222222222222222222',
  repeat('3',64),repeat('4',32),'stale-offer-sig','stale-offer-message',now(),now()+interval '1 hour','PENDING'
);
insert into public.evo_passport_events(
  event_id,seal_id,version,event_type,actor_wallet,new_owner_wallet,note,event_digest,nonce,
  signature,signature_message,counterparty_wallet,counter_signature,counter_signature_message,created_at,status
) values (
  'EVP-44444444-55555555-66666666','EVO-44444444-55555555-66666666','EVO-PASSPORT-V1','TRANSFERRED',
  '0x1111111111111111111111111111111111111111','0x3333333333333333333333333333333333333333',
  'Simulated prior accepted transfer',repeat('5',64),repeat('6',32),'prior-offer-sig','prior-offer-message',
  '0x3333333333333333333333333333333333333333','prior-accept-sig','prior-accept-message',now(),'ACTIVE'
);

select public.evo_accept_passport_transfer_authoritative(
  'EVX-44444444-55555555-66666666','0x2222222222222222222222222222222222222222',
  repeat('7',64),repeat('8',32),'stale-accept-sig','stale-accept-message',now(),
  'EVP-77777777-88888888-99999999',repeat('9',64)
);

do $$
declare s text;
begin
  select status into s from public.evo_passport_transfers where offer_id='EVX-44444444-55555555-66666666';
  if s<>'CANCELLED' then raise exception 'owner_changed_offer_state_not_persisted'; end if;
end;
$$;

-- Seal 5: cancel is atomic and exact retry is idempotent.
insert into public.evo_seals(seal_id,issuer_wallet,status)
values ('EVO-55555555-66666666-77777777','0x1111111111111111111111111111111111111111','ACTIVE');
select public.evo_create_passport_transfer_offer_authoritative(jsonb_build_object(
  'offer_id','EVX-55555555-66666666-77777777',
  'seal_id','EVO-55555555-66666666-77777777',
  'from_wallet','0x1111111111111111111111111111111111111111',
  'to_wallet','0x2222222222222222222222222222222222222222',
  'offer_digest',repeat('a',64),'offer_nonce',repeat('b',32),
  'offer_signature','cancel-offer-sig','offer_message','cancel-offer-message',
  'created_at',now(),'expires_at',now()+interval '1 hour'
));
select public.evo_cancel_passport_transfer_authoritative(
  'EVX-55555555-66666666-77777777','0x1111111111111111111111111111111111111111',
  repeat('c',64),repeat('d',32),'cancel-sig','cancel-message',now()
);
select public.evo_cancel_passport_transfer_authoritative(
  'EVX-55555555-66666666-77777777','0x1111111111111111111111111111111111111111',
  repeat('c',64),repeat('d',32),'cancel-sig','cancel-message',now()
);

do $$
declare n integer; s text;
begin
  select count(*),max(status) into n,s from public.evo_passport_transfers where offer_id='EVX-55555555-66666666-77777777';
  if n<>1 or s<>'CANCELLED' then raise exception 'cancel_idempotency_failed'; end if;
end;
$$;
