\set ON_ERROR_STOP on

insert into public.evo_seals(seal_id,issuer_wallet,status)
values ('EVO-11111111-22222222-33333333','0x1111111111111111111111111111111111111111','ACTIVE');

select * from public.evo_register_passport_event_authoritative(
  jsonb_build_object(
    'event_id','EVP-AAAAAAAA-BBBBBBBB-CCCCCCCC',
    'seal_id','EVO-11111111-22222222-33333333',
    'version','EVO-PASSPORT-V1',
    'event_type','INSPECTED',
    'actor_wallet','0x1111111111111111111111111111111111111111',
    'new_owner_wallet','',
    'note','Owner A inspection',
    'event_digest',repeat('a',64),
    'nonce',repeat('b',32),
    'signature','sig-a',
    'signature_message','message-a',
    'created_at',now()
  )
);

insert into public.evo_passport_transfers(
  offer_id,seal_id,from_wallet,to_wallet,offer_digest,offer_nonce,offer_signature,offer_message,created_at,expires_at,status
) values (
  'EVX-11111111-22222222-33333333',
  'EVO-11111111-22222222-33333333',
  '0x1111111111111111111111111111111111111111',
  '0x2222222222222222222222222222222222222222',
  repeat('c',64),repeat('d',32),'offer-sig','offer-message',now(),now()+interval '1 hour','PENDING'
);

select public.accept_evo_passport_transfer(
  'EVX-11111111-22222222-33333333',
  repeat('e',64),
  repeat('f',32),
  'accept-sig',
  'accept-message',
  now(),
  'EVP-DDDDDDDD-EEEEEEEE-FFFFFFFF',
  repeat('1',64)
);

do $$
begin
  begin
    perform * from public.evo_register_passport_event_authoritative(
      jsonb_build_object(
        'event_id','EVP-01010101-02020202-03030303',
        'seal_id','EVO-11111111-22222222-33333333',
        'version','EVO-PASSPORT-V1',
        'event_type','NOTE',
        'actor_wallet','0x1111111111111111111111111111111111111111',
        'new_owner_wallet','',
        'note','Old owner must fail',
        'event_digest',repeat('2',64),
        'nonce',repeat('3',32),
        'signature','sig-old',
        'signature_message','message-old',
        'created_at',now()
      )
    );
    raise exception 'old_owner_was_not_rejected';
  exception when others then
    if position('actor_is_not_current_owner' in sqlerrm)=0 then raise; end if;
  end;
end;
$$;

select * from public.evo_register_passport_event_authoritative(
  jsonb_build_object(
    'event_id','EVP-12121212-34343434-56565656',
    'seal_id','EVO-11111111-22222222-33333333',
    'version','EVO-PASSPORT-V1',
    'event_type','NOTE',
    'actor_wallet','0x2222222222222222222222222222222222222222',
    'new_owner_wallet','',
    'note','New owner B authorized',
    'event_digest',repeat('4',64),
    'nonce',repeat('5',32),
    'signature','sig-new',
    'signature_message','message-new',
    'created_at',now()
  )
);

-- Exact retry is idempotent and does not create a second row.
select * from public.evo_register_passport_event_authoritative(
  jsonb_build_object(
    'event_id','EVP-12121212-34343434-56565656',
    'seal_id','EVO-11111111-22222222-33333333',
    'version','EVO-PASSPORT-V1',
    'event_type','NOTE',
    'actor_wallet','0x2222222222222222222222222222222222222222',
    'new_owner_wallet','',
    'note','New owner B authorized',
    'event_digest',repeat('4',64),
    'nonce',repeat('5',32),
    'signature','sig-new',
    'signature_message','message-new',
    'created_at',now()
  )
);

do $$
declare n integer;
begin
  select count(*) into n from public.evo_passport_events where event_id='EVP-12121212-34343434-56565656';
  if n<>1 then raise exception 'event_retry_not_idempotent'; end if;
end;
$$;
