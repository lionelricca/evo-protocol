\set ON_ERROR_STOP on

-- Security boundary: browser roles cannot execute privileged Service Proof RPCs.
do $$
begin
  if pg_catalog.has_function_privilege('anon','public.evo_register_service_proof_authoritative(jsonb)','EXECUTE') then
    raise exception 'anon_can_execute_service_registration';
  end if;
  if pg_catalog.has_function_privilege('authenticated','public.evo_register_service_proof_authoritative(jsonb)','EXECUTE') then
    raise exception 'authenticated_can_execute_service_registration';
  end if;
  if pg_catalog.has_function_privilege('anon','public.evo_countersign_service_proof_authoritative(jsonb)','EXECUTE') then
    raise exception 'anon_can_execute_service_countersign';
  end if;
  if not pg_catalog.has_function_privilege('service_role','public.evo_register_service_proof_authoritative(jsonb)','EXECUTE') then
    raise exception 'service_role_missing_service_registration_execute';
  end if;
  if not pg_catalog.has_function_privilege('service_role','public.evo_countersign_service_proof_authoritative(jsonb)','EXECUTE') then
    raise exception 'service_role_missing_service_countersign_execute';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='evo_register_service_proof_authoritative'
      and p.prosecdef
      and coalesce(p.proconfig, array[]::text[]) @> array['search_path=""']::text[]
  ) then raise exception 'service_registration_not_hardened_security_definer'; end if;
end;
$$;

truncate table public.evo_service_proofs;
truncate table public.evo_passport_events;
truncate table public.evo_passport_transfers;
truncate table public.evo_seals;

insert into public.evo_seals(seal_id,issuer_wallet,status)
values ('EVO-11111111-22222222-33333333','0x1111111111111111111111111111111111111111','ACTIVE');

-- Current owner can register once; exact retry is idempotent.
do $$
declare
  p jsonb := pg_catalog.jsonb_build_object(
    'proof_id','EVS-11111111-22222222-33333333',
    'seal_id','EVO-11111111-22222222-33333333',
    'version','EVO-SERVICE-PROOF-V1',
    'service_type','NOTE',
    'owner_wallet','0x1111111111111111111111111111111111111111',
    'provider_wallet','0x2222222222222222222222222222222222222222',
    'provider_label','Provider',
    'technician_label','Tech',
    'performed_at',pg_catalog.now()::text,
    'summary','Atomic service proof test',
    'meter','{}'::jsonb,
    'parts','[]'::jsonb,
    'next_service','{}'::jsonb,
    'evidence_digests','[]'::jsonb,
    'service_digest','111111112222222233333333aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'owner_nonce',repeat('a',32),
    'owner_signature','0xowner-signature',
    'owner_message','owner message',
    'created_at',pg_catalog.now()::text
  );
  r record;
begin
  select * into r from public.evo_register_service_proof_authoritative(p);
  if r.idempotent or r.current_owner <> '0x1111111111111111111111111111111111111111' then raise exception 'service_registration_result_invalid'; end if;
  if r.evidence_level <> 'OWNER_DECLARED' or r.status <> 'ACTIVE' then raise exception 'service_registration_authority_invalid'; end if;

  select * into r from public.evo_register_service_proof_authoritative(p);
  if not r.idempotent then raise exception 'service_registration_retry_not_idempotent'; end if;
  if (select count(*) from public.evo_service_proofs where proof_id='EVS-11111111-22222222-33333333') <> 1 then raise exception 'service_registration_retry_duplicated'; end if;
end;
$$;

-- Same Proof ID cannot be reused for conflicting service content.
do $$
declare
  p jsonb := pg_catalog.jsonb_build_object(
    'proof_id','EVS-11111111-22222222-33333333',
    'seal_id','EVO-11111111-22222222-33333333',
    'version','EVO-SERVICE-PROOF-V1',
    'service_type','NOTE',
    'owner_wallet','0x1111111111111111111111111111111111111111',
    'provider_wallet','0x2222222222222222222222222222222222222222',
    'performed_at',pg_catalog.now()::text,
    'summary','Conflicting content',
    'service_digest',repeat('b',64),
    'owner_nonce',repeat('b',32),
    'owner_signature','0xowner-signature-2',
    'owner_message','owner message 2',
    'created_at',pg_catalog.now()::text
  );
  raised boolean := false;
begin
  begin
    perform * from public.evo_register_service_proof_authoritative(p);
  exception when others then
    raised := position('proof_id_conflict' in sqlerrm) > 0;
  end;
  if not raised then raise exception 'service_proof_id_conflict_not_rejected'; end if;
end;
$$;

-- Simulate an authoritative ownership transfer, then prove the former owner is rejected.
insert into public.evo_passport_events(
  event_id,seal_id,version,event_type,actor_wallet,new_owner_wallet,note,event_digest,nonce,
  signature,signature_message,created_at,status
) values (
  'EVP-AAAAAAAA-BBBBBBBB-CCCCCCCC','EVO-11111111-22222222-33333333','EVO-PASSPORT-V1','TRANSFERRED',
  '0x1111111111111111111111111111111111111111','0x3333333333333333333333333333333333333333','transfer',repeat('c',64),repeat('c',32),
  '0xtransfer','transfer message',pg_catalog.now(),'ACTIVE'
);

do $$
declare
  old_owner jsonb := pg_catalog.jsonb_build_object(
    'proof_id','EVS-44444444-55555555-66666666','seal_id','EVO-11111111-22222222-33333333','version','EVO-SERVICE-PROOF-V1','service_type','NOTE',
    'owner_wallet','0x1111111111111111111111111111111111111111','provider_wallet','','performed_at',pg_catalog.now()::text,'summary','Former owner must fail',
    'service_digest','444444445555555566666666aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','owner_nonce',repeat('d',32),'owner_signature','0xold','owner_message','old',
    'created_at',pg_catalog.now()::text
  );
  new_owner jsonb := pg_catalog.jsonb_build_object(
    'proof_id','EVS-77777777-88888888-99999999','seal_id','EVO-11111111-22222222-33333333','version','EVO-SERVICE-PROOF-V1','service_type','NOTE',
    'owner_wallet','0x3333333333333333333333333333333333333333','provider_wallet','','performed_at',pg_catalog.now()::text,'summary','Current owner succeeds',
    'service_digest','777777778888888899999999aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','owner_nonce',repeat('e',32),'owner_signature','0xnew','owner_message','new',
    'created_at',pg_catalog.now()::text
  );
  raised boolean := false;
  r record;
begin
  begin
    perform * from public.evo_register_service_proof_authoritative(old_owner);
  exception when others then
    raised := position('actor_is_not_current_owner' in sqlerrm) > 0;
  end;
  if not raised then raise exception 'former_owner_service_proof_not_rejected'; end if;

  select * into r from public.evo_register_service_proof_authoritative(new_owner);
  if r.current_owner <> '0x3333333333333333333333333333333333333333' or r.idempotent then raise exception 'current_owner_service_proof_failed'; end if;
end;
$$;

-- Designated provider countersignature is one-time and exact retry is idempotent.
do $$
declare
  p jsonb := pg_catalog.jsonb_build_object(
    'proof_id','EVS-11111111-22222222-33333333',
    'actor_wallet','0x2222222222222222222222222222222222222222',
    'provider_digest',repeat('f',64),
    'provider_nonce',repeat('f',32),
    'provider_signature','0xprovider-signature',
    'provider_message','provider message',
    'countersigned_at',pg_catalog.now()::text
  );
  conflict jsonb;
  r record;
  raised boolean := false;
begin
  select * into r from public.evo_countersign_service_proof_authoritative(p);
  if r.evidence_level <> 'PROVIDER_COUNTERSIGNED' or r.idempotent then raise exception 'service_countersign_failed'; end if;

  select * into r from public.evo_countersign_service_proof_authoritative(p);
  if not r.idempotent then raise exception 'service_countersign_retry_not_idempotent'; end if;

  conflict := p || pg_catalog.jsonb_build_object('provider_digest',repeat('1',64));
  begin
    perform * from public.evo_countersign_service_proof_authoritative(conflict);
  exception when others then
    raised := position('already_countersigned' in sqlerrm) > 0;
  end;
  if not raised then raise exception 'second_service_countersign_not_rejected'; end if;
end;
$$;

select 'EVO V4.0 Service Proof Authority SQL tests passed' as result;
