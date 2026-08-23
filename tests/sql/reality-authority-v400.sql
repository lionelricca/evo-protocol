\set ON_ERROR_STOP on

DO $$
DECLARE
  v_seal text := 'EVO-11111111-22222222-33333333';
  v_issuer text := '0x1111111111111111111111111111111111111111';
  v_owner2 text := '0x2222222222222222222222222222222222222222';
  v_digest text := repeat('a',64);
  v_event_digest text := repeat('b',64);
  v_signed text;
  v_signed2 text;
  v_state jsonb;
  v_state2 jsonb;
  v_state_canonical text;
  v_state2_canonical text;
  v_evidence text;
  v_evidence2 text;
  v_continuity_canonical text;
  v_continuity2_canonical text;
  v_root text;
  v_root2 text;
  v_snapshot text;
  v_snapshot2 text;
  v_row jsonb;
  v_row2 jsonb;
  v_bad_row jsonb;
  v_return_id text;
  v_idempotent boolean;
  v_count integer;
BEGIN
  if pg_catalog.has_function_privilege('anon','public.evo_register_reality_checkpoint_authoritative(jsonb)','EXECUTE') then
    raise exception 'anon must not execute Reality authority RPC';
  end if;
  if pg_catalog.has_function_privilege('authenticated','public.evo_register_reality_checkpoint_authoritative(jsonb)','EXECUTE') then
    raise exception 'authenticated must not execute Reality authority RPC';
  end if;
  if not pg_catalog.has_function_privilege('service_role','public.evo_register_reality_checkpoint_authoritative(jsonb)','EXECUTE') then
    raise exception 'service_role must execute Reality authority RPC';
  end if;

  insert into public.evo_seals(seal_id,digest,status,issuer_wallet)
  values(v_seal,v_digest,'ACTIVE',v_issuer);

  v_signed := to_char(pg_catalog.clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_state := pg_catalog.jsonb_build_object(
    'version','EVO-REALITY-EVIDENCE-V0',
    'sealId',v_seal,
    'sealDigest',v_digest,
    'sealStatus','ACTIVE',
    'issuerWallet',v_issuer,
    'issuerTrust','SELF_DECLARED',
    'issuerProfileHash','none',
    'currentOwner',v_issuer,
    'passportHead','none',
    'pulseHead','none',
    'challengeHead','NONE',
    'physicalProofHead','NONE'
  );
  v_state_canonical :=
    '{"challengeHead":"NONE","currentOwner":"' || v_issuer ||
    '","issuerProfileHash":"none","issuerTrust":"SELF_DECLARED","issuerWallet":"' || v_issuer ||
    '","passportHead":"none","physicalProofHead":"NONE","pulseHead":"none","sealDigest":"' || v_digest ||
    '","sealId":"' || v_seal || '","sealStatus":"ACTIVE","version":"EVO-REALITY-EVIDENCE-V0"}';
  v_evidence := pg_catalog.encode(extensions.digest(v_state_canonical,'sha256'),'hex');
  v_continuity_canonical :=
    '{"evidenceRoot":"' || v_evidence || '","previousContinuityRoot":"GENESIS","sealId":"' || v_seal ||
    '","signedAt":"' || v_signed || '","signerWallet":"' || v_issuer || '","version":"EVO-CONTINUITY-V0"}';
  v_root := pg_catalog.encode(extensions.digest(v_continuity_canonical,'sha256'),'hex');
  v_snapshot := 'EVR-' || upper(substr(v_root,1,8)) || '-' || upper(substr(v_root,9,8)) || '-' || upper(substr(v_root,17,8));
  v_row := pg_catalog.jsonb_build_object(
    'snapshot_id',v_snapshot,
    'seal_id',v_seal,
    'version','EVO-CONTINUITY-V0',
    'evidence_root',v_evidence,
    'continuity_root',v_root,
    'previous_continuity_root','GENESIS',
    'evidence_state',v_state,
    'signer_wallet',v_issuer,
    'signature','0x01',
    'signature_message','fixture-signature-message-1',
    'signed_at',v_signed,
    'status','ACTIVE'
  );

  select r.snapshot_id,r.idempotent into v_return_id,v_idempotent
    from public.evo_register_reality_checkpoint_authoritative(v_row) r;
  if v_return_id <> v_snapshot or v_idempotent then
    raise exception 'first Reality checkpoint was not inserted authoritatively';
  end if;
  select count(*) into v_count from public.evo_reality_snapshots where seal_id=v_seal;
  if v_count <> 1 then raise exception 'first Reality checkpoint count mismatch'; end if;

  select r.snapshot_id,r.idempotent into v_return_id,v_idempotent
    from public.evo_register_reality_checkpoint_authoritative(v_row) r;
  if v_return_id <> v_snapshot or not v_idempotent then
    raise exception 'Reality checkpoint retry was not idempotent';
  end if;
  select count(*) into v_count from public.evo_reality_snapshots where seal_id=v_seal;
  if v_count <> 1 then raise exception 'idempotent retry created a duplicate checkpoint'; end if;

  insert into public.evo_passport_events(event_id,seal_id,event_type,new_owner_wallet,event_digest,status)
  values('EVP-AAAAAAAA-BBBBBBBB-CCCCCCCC',v_seal,'TRANSFERRED',v_owner2,v_event_digest,'ACTIVE');

  begin
    perform * from public.evo_register_reality_checkpoint_authoritative(v_row);
    raise exception 'stale owner unexpectedly retained Reality authority';
  exception when others then
    if position('signer_is_not_current_owner' in SQLERRM)=0 then raise; end if;
  end;

  v_signed2 := to_char(pg_catalog.clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_state2 := pg_catalog.jsonb_build_object(
    'version','EVO-REALITY-EVIDENCE-V0',
    'sealId',v_seal,
    'sealDigest',v_digest,
    'sealStatus','ACTIVE',
    'issuerWallet',v_issuer,
    'issuerTrust','SELF_DECLARED',
    'issuerProfileHash','none',
    'currentOwner',v_owner2,
    'passportHead',v_event_digest,
    'pulseHead','none',
    'challengeHead','NONE',
    'physicalProofHead','NONE'
  );
  v_state2_canonical :=
    '{"challengeHead":"NONE","currentOwner":"' || v_owner2 ||
    '","issuerProfileHash":"none","issuerTrust":"SELF_DECLARED","issuerWallet":"' || v_issuer ||
    '","passportHead":"' || v_event_digest || '","physicalProofHead":"NONE","pulseHead":"none","sealDigest":"' || v_digest ||
    '","sealId":"' || v_seal || '","sealStatus":"ACTIVE","version":"EVO-REALITY-EVIDENCE-V0"}';
  v_evidence2 := pg_catalog.encode(extensions.digest(v_state2_canonical,'sha256'),'hex');

  v_bad_row := pg_catalog.jsonb_build_object(
    'snapshot_id','EVR-CCCCCCCC-CCCCCCCC-CCCCCCCC',
    'seal_id',v_seal,
    'version','EVO-CONTINUITY-V0',
    'evidence_root',v_evidence2,
    'continuity_root',repeat('c',64),
    'previous_continuity_root','GENESIS',
    'evidence_state',v_state2,
    'signer_wallet',v_owner2,
    'signature','0x02',
    'signature_message','fixture-signature-message-2',
    'signed_at',v_signed2,
    'status','ACTIVE'
  );
  begin
    perform * from public.evo_register_reality_checkpoint_authoritative(v_bad_row);
    raise exception 'stale previous continuity root was accepted';
  exception when others then
    if position('stale_previous_root' in SQLERRM)=0 then raise; end if;
  end;

  v_bad_row := pg_catalog.jsonb_build_object(
    'snapshot_id','EVR-DDDDDDDD-DDDDDDDD-DDDDDDDD',
    'seal_id',v_seal,
    'version','EVO-CONTINUITY-V0',
    'evidence_root',repeat('d',64),
    'continuity_root',repeat('e',64),
    'previous_continuity_root',v_root,
    'evidence_state',pg_catalog.jsonb_build_object('version','EVO-REALITY-EVIDENCE-V0'),
    'signer_wallet',v_owner2,
    'signature','0x04',
    'signature_message','fixture-stale-evidence',
    'signed_at',v_signed2,
    'status','ACTIVE'
  );
  begin
    perform * from public.evo_register_reality_checkpoint_authoritative(v_bad_row);
    raise exception 'stale Reality evidence was accepted';
  exception when others then
    if position('stale_evidence_root' in SQLERRM)=0 and position('stale_evidence_state' in SQLERRM)=0 then raise; end if;
  end;

  v_continuity2_canonical :=
    '{"evidenceRoot":"' || v_evidence2 || '","previousContinuityRoot":"' || v_root || '","sealId":"' || v_seal ||
    '","signedAt":"' || v_signed2 || '","signerWallet":"' || v_owner2 || '","version":"EVO-CONTINUITY-V0"}';
  v_root2 := pg_catalog.encode(extensions.digest(v_continuity2_canonical,'sha256'),'hex');
  v_snapshot2 := 'EVR-' || upper(substr(v_root2,1,8)) || '-' || upper(substr(v_root2,9,8)) || '-' || upper(substr(v_root2,17,8));
  v_row2 := pg_catalog.jsonb_build_object(
    'snapshot_id',v_snapshot2,
    'seal_id',v_seal,
    'version','EVO-CONTINUITY-V0',
    'evidence_root',v_evidence2,
    'continuity_root',v_root2,
    'previous_continuity_root',v_root,
    'evidence_state',v_state2,
    'signer_wallet',v_owner2,
    'signature','0x03',
    'signature_message','fixture-signature-message-3',
    'signed_at',v_signed2,
    'status','ACTIVE'
  );
  select r.snapshot_id,r.idempotent into v_return_id,v_idempotent
    from public.evo_register_reality_checkpoint_authoritative(v_row2) r;
  if v_return_id <> v_snapshot2 or v_idempotent then
    raise exception 'new owner could not extend the Reality chain';
  end if;
  select count(*) into v_count from public.evo_reality_snapshots where seal_id=v_seal;
  if v_count <> 2 then raise exception 'Reality chain did not extend exactly once'; end if;
END $$;

DO $$
DECLARE
  v_config text[];
BEGIN
  select p.proconfig into v_config
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname='evo_register_reality_checkpoint_authoritative';
  if not ('search_path=""' = any(v_config)) and not ('search_path=' = any(v_config)) then
    raise exception 'Reality authority RPC search_path is not pinned empty: %',v_config;
  end if;
END $$;

select 'EVO V4.0 Reality Continuity Authority SQL tests passed' as result;
