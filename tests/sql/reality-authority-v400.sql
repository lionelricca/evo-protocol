\set ON_ERROR_STOP on

DO $$
BEGIN
  IF pg_catalog.has_function_privilege('anon','public.evo_register_reality_checkpoint_authoritative(jsonb)','EXECUTE') THEN RAISE EXCEPTION 'anon_can_execute_reality_rpc'; END IF;
  IF pg_catalog.has_function_privilege('authenticated','public.evo_register_reality_checkpoint_authoritative(jsonb)','EXECUTE') THEN RAISE EXCEPTION 'authenticated_can_execute_reality_rpc'; END IF;
  IF NOT pg_catalog.has_function_privilege('service_role','public.evo_register_reality_checkpoint_authoritative(jsonb)','EXECUTE') THEN RAISE EXCEPTION 'service_role_missing_reality_rpc'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='evo_register_reality_checkpoint_authoritative'
      AND p.prosecdef AND coalesce(p.proconfig,array[]::text[]) @> array['search_path=""']::text[]
  ) THEN RAISE EXCEPTION 'reality_rpc_not_hardened_security_definer'; END IF;
END $$;

TRUNCATE TABLE public.evo_reality_snapshots, public.evo_challenges, public.evo_pulses, public.evo_issuer_profiles, public.evo_passport_events, public.evo_seals;

INSERT INTO public.evo_seals(seal_id,digest,status,issuer_wallet)
VALUES ('EVO-11111111-22222222-33333333',repeat('a',64),'ACTIVE','0x1111111111111111111111111111111111111111');

-- Genesis checkpoint and exact retry.
DO $$
DECLARE
  v_seal text := 'EVO-11111111-22222222-33333333';
  v_owner text := '0x1111111111111111111111111111111111111111';
  v_signed text := to_char(pg_catalog.clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_state jsonb;
  v_state_canonical text;
  v_evidence text;
  v_continuity_canonical text;
  v_continuity text;
  v_snapshot text;
  v_row jsonb;
  r record;
BEGIN
  v_state := pg_catalog.jsonb_build_object(
    'version','EVO-REALITY-EVIDENCE-V0','sealId',v_seal,'sealDigest',repeat('a',64),'sealStatus','ACTIVE',
    'issuerWallet',v_owner,'issuerTrust','SELF_DECLARED','issuerProfileHash','none','currentOwner',v_owner,
    'passportHead','none','pulseHead','none','challengeHead','NONE','physicalProofHead','NONE'
  );
  v_state_canonical := '{"challengeHead":"NONE","currentOwner":"'||v_owner||'","issuerProfileHash":"none","issuerTrust":"SELF_DECLARED","issuerWallet":"'||v_owner||'","passportHead":"none","physicalProofHead":"NONE","pulseHead":"none","sealDigest":"'||repeat('a',64)||'","sealId":"'||v_seal||'","sealStatus":"ACTIVE","version":"EVO-REALITY-EVIDENCE-V0"}';
  v_evidence := pg_catalog.encode(extensions.digest(v_state_canonical,'sha256'),'hex');
  v_continuity_canonical := '{"evidenceRoot":"'||v_evidence||'","previousContinuityRoot":"GENESIS","sealId":"'||v_seal||'","signedAt":"'||v_signed||'","signerWallet":"'||v_owner||'","version":"EVO-CONTINUITY-V0"}';
  v_continuity := pg_catalog.encode(extensions.digest(v_continuity_canonical,'sha256'),'hex');
  v_snapshot := 'EVR-'||upper(substr(v_continuity,1,8))||'-'||upper(substr(v_continuity,9,8))||'-'||upper(substr(v_continuity,17,8));
  v_row := pg_catalog.jsonb_build_object(
    'snapshot_id',v_snapshot,'seal_id',v_seal,'version','EVO-CONTINUITY-V0','evidence_root',v_evidence,
    'continuity_root',v_continuity,'previous_continuity_root','GENESIS','evidence_state',v_state,
    'signer_wallet',v_owner,'signature','0xgenesis','signature_message','genesis message','signed_at',v_signed,'status','ACTIVE'
  );
  SELECT * INTO r FROM public.evo_register_reality_checkpoint_authoritative(v_row);
  IF r.idempotent OR r.status <> 'ACTIVE' THEN RAISE EXCEPTION 'genesis_checkpoint_failed'; END IF;
  SELECT * INTO r FROM public.evo_register_reality_checkpoint_authoritative(v_row);
  IF NOT r.idempotent THEN RAISE EXCEPTION 'genesis_retry_not_idempotent'; END IF;
END $$;

-- Ownership transfer makes the former owner invalid for the next checkpoint.
INSERT INTO public.evo_passport_events(event_id,seal_id,event_type,new_owner_wallet,event_digest,registered_at,status)
VALUES ('EVP-AAAAAAAA-BBBBBBBB-CCCCCCCC','EVO-11111111-22222222-33333333','TRANSFERRED','0x3333333333333333333333333333333333333333',repeat('b',64),now(),'ACTIVE');

DO $$
DECLARE
  v_seal text := 'EVO-11111111-22222222-33333333';
  v_old text := '0x1111111111111111111111111111111111111111';
  v_new text := '0x3333333333333333333333333333333333333333';
  v_signed text := to_char(pg_catalog.clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_previous text;
  v_state jsonb;
  v_state_canonical text;
  v_evidence text;
  v_continuity_canonical text;
  v_continuity text;
  v_snapshot text;
  v_old_row jsonb;
  v_new_row jsonb;
  raised boolean := false;
  r record;
BEGIN
  SELECT continuity_root INTO v_previous FROM public.evo_reality_snapshots WHERE seal_id=v_seal ORDER BY registered_at DESC LIMIT 1;
  v_state := pg_catalog.jsonb_build_object(
    'version','EVO-REALITY-EVIDENCE-V0','sealId',v_seal,'sealDigest',repeat('a',64),'sealStatus','ACTIVE',
    'issuerWallet',v_old,'issuerTrust','SELF_DECLARED','issuerProfileHash','none','currentOwner',v_new,
    'passportHead',repeat('b',64),'pulseHead','none','challengeHead','NONE','physicalProofHead','NONE'
  );
  v_state_canonical := '{"challengeHead":"NONE","currentOwner":"'||v_new||'","issuerProfileHash":"none","issuerTrust":"SELF_DECLARED","issuerWallet":"'||v_old||'","passportHead":"'||repeat('b',64)||'","physicalProofHead":"NONE","pulseHead":"none","sealDigest":"'||repeat('a',64)||'","sealId":"'||v_seal||'","sealStatus":"ACTIVE","version":"EVO-REALITY-EVIDENCE-V0"}';
  v_evidence := pg_catalog.encode(extensions.digest(v_state_canonical,'sha256'),'hex');

  -- A stale signer cannot pass even with the new state/root.
  v_continuity_canonical := '{"evidenceRoot":"'||v_evidence||'","previousContinuityRoot":"'||v_previous||'","sealId":"'||v_seal||'","signedAt":"'||v_signed||'","signerWallet":"'||v_old||'","version":"EVO-CONTINUITY-V0"}';
  v_continuity := pg_catalog.encode(extensions.digest(v_continuity_canonical,'sha256'),'hex');
  v_snapshot := 'EVR-'||upper(substr(v_continuity,1,8))||'-'||upper(substr(v_continuity,9,8))||'-'||upper(substr(v_continuity,17,8));
  v_old_row := pg_catalog.jsonb_build_object('snapshot_id',v_snapshot,'seal_id',v_seal,'version','EVO-CONTINUITY-V0','evidence_root',v_evidence,'continuity_root',v_continuity,'previous_continuity_root',v_previous,'evidence_state',v_state,'signer_wallet',v_old,'signature','0xold','signature_message','old message','signed_at',v_signed,'status','ACTIVE');
  BEGIN
    PERFORM * FROM public.evo_register_reality_checkpoint_authoritative(v_old_row);
  EXCEPTION WHEN OTHERS THEN
    raised := position('signer_is_not_current_owner' in sqlerrm) > 0;
  END;
  IF NOT raised THEN RAISE EXCEPTION 'former_owner_checkpoint_not_rejected'; END IF;

  -- Current owner extends the chain.
  v_continuity_canonical := '{"evidenceRoot":"'||v_evidence||'","previousContinuityRoot":"'||v_previous||'","sealId":"'||v_seal||'","signedAt":"'||v_signed||'","signerWallet":"'||v_new||'","version":"EVO-CONTINUITY-V0"}';
  v_continuity := pg_catalog.encode(extensions.digest(v_continuity_canonical,'sha256'),'hex');
  v_snapshot := 'EVR-'||upper(substr(v_continuity,1,8))||'-'||upper(substr(v_continuity,9,8))||'-'||upper(substr(v_continuity,17,8));
  v_new_row := pg_catalog.jsonb_build_object('snapshot_id',v_snapshot,'seal_id',v_seal,'version','EVO-CONTINUITY-V0','evidence_root',v_evidence,'continuity_root',v_continuity,'previous_continuity_root',v_previous,'evidence_state',v_state,'signer_wallet',v_new,'signature','0xnew','signature_message','new message','signed_at',v_signed,'status','ACTIVE');
  SELECT * INTO r FROM public.evo_register_reality_checkpoint_authoritative(v_new_row);
  IF r.idempotent OR r.signer_wallet <> v_new THEN RAISE EXCEPTION 'new_owner_checkpoint_failed'; END IF;
END $$;

-- Submitted evidence state/root cannot drift from live state.
DO $$
DECLARE
  v_row jsonb;
  raised boolean := false;
BEGIN
  v_row := pg_catalog.jsonb_build_object(
    'snapshot_id','EVR-AAAAAAAA-BBBBBBBB-CCCCCCCC','seal_id','EVO-11111111-22222222-33333333','version','EVO-CONTINUITY-V0',
    'evidence_root',repeat('c',64),'continuity_root',repeat('d',64),'previous_continuity_root',(select continuity_root from public.evo_reality_snapshots order by registered_at desc limit 1),
    'evidence_state',pg_catalog.jsonb_build_object('version','EVO-REALITY-EVIDENCE-V0'),'signer_wallet','0x3333333333333333333333333333333333333333',
    'signature','0xstale','signature_message','stale','signed_at',to_char(pg_catalog.clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'status','ACTIVE'
  );
  BEGIN
    PERFORM * FROM public.evo_register_reality_checkpoint_authoritative(v_row);
  EXCEPTION WHEN OTHERS THEN
    raised := position('stale_evidence_root' in sqlerrm) > 0 OR position('stale_evidence_state' in sqlerrm) > 0;
  END;
  IF NOT raised THEN RAISE EXCEPTION 'stale_reality_evidence_not_rejected'; END IF;
END $$;

select 'EVO V4.0 Reality Continuity Authority SQL tests passed' as result;
