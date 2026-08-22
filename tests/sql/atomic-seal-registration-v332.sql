\set ON_ERROR_STOP on

create or replace function public.evo_test_seal_row(
  p_seal_id text,
  p_wallet text,
  p_digest text,
  p_metadata_hash text,
  p_nonce text,
  p_asset_hash text default '',
  p_serial text default '',
  p_status text default 'ACTIVE'
) returns jsonb
language sql
as $$
  select jsonb_build_object(
    'seal_id', p_seal_id,
    'version', 'EVO-SEAL-V1',
    'asset_type', 'Documento',
    'title', 'EVO atomic test',
    'issuer_wallet', lower(p_wallet),
    'issuer_label', 'EVO Test',
    'serial', p_serial,
    'description', 'isolated CI fixture',
    'file_name', '',
    'file_size', 0,
    'file_type', '',
    'asset_hash', p_asset_hash,
    'metadata_hash', p_metadata_hash,
    'digest', p_digest,
    'nonce', p_nonce,
    'signature', '0xtest-signature',
    'signature_message', 'EVO TEST SIGNATURE MESSAGE',
    'created_at', pg_catalog.now()::text,
    'status', p_status,
    'metadata', jsonb_build_object('fixture', true)
  );
$$;

-- Security boundary: browser roles cannot execute the privileged RPC.
do $$
begin
  if pg_catalog.has_function_privilege('anon','public.evo_register_seal_with_credit(jsonb)','EXECUTE') then
    raise exception 'anon_can_execute_atomic_registration';
  end if;
  if pg_catalog.has_function_privilege('authenticated','public.evo_register_seal_with_credit(jsonb)','EXECUTE') then
    raise exception 'authenticated_can_execute_atomic_registration';
  end if;
  if not pg_catalog.has_function_privilege('service_role','public.evo_register_seal_with_credit(jsonb)','EXECUTE') then
    raise exception 'service_role_missing_atomic_registration_execute';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='evo_register_seal_with_credit'
      and p.prosecdef
      and coalesce(p.proconfig, array[]::text[]) @> array['search_path=""']::text[]
  ) then
    raise exception 'atomic_registration_not_hardened_security_definer';
  end if;
end;
$$;

-- Wallet 1: first request uses DEMO; exact retry is idempotent; second distinct Seal uses PAID.
do $$
declare
  w constant text := '0x1111111111111111111111111111111111111111';
  a jsonb := public.evo_test_seal_row(
    'EVO-AAAAAAAA-AAAAAAAA-AAAAAAAA', w, repeat('a',64), repeat('1',64), repeat('1',32), repeat('9',64), 'A-001'
  );
  b jsonb := public.evo_test_seal_row(
    'EVO-BBBBBBBB-BBBBBBBB-BBBBBBBB', w, repeat('b',64), repeat('2',64), repeat('2',32), repeat('8',64), 'B-001'
  );
  r record;
begin
  insert into public.evo_wallet_credits(wallet,purchased_credits,consumed_credits) values (w,2,0);

  select * into r from public.evo_register_seal_with_credit(a);
  if r.credit_source <> 'DEMO' or r.remaining_credits <> 2 then raise exception 'demo_registration_failed'; end if;
  if (select count(*) from public.evo_seals where issuer_wallet=w) <> 1 then raise exception 'demo_seal_count_invalid'; end if;
  if (select count(*) from public.evo_credit_consumptions where wallet=w and source='DEMO') <> 1 then raise exception 'demo_consumption_count_invalid'; end if;
  if (select consumed_credits from public.evo_wallet_credits where wallet=w) <> 0 then raise exception 'demo_consumed_paid_credit'; end if;

  -- Same request again must return the original economic record and never charge twice.
  select * into r from public.evo_register_seal_with_credit(a);
  if r.credit_source <> 'DEMO' or r.remaining_credits <> 2 then raise exception 'idempotent_retry_result_invalid'; end if;
  if (select count(*) from public.evo_seals where seal_id='EVO-AAAAAAAA-AAAAAAAA-AAAAAAAA') <> 1 then raise exception 'idempotent_retry_duplicated_seal'; end if;
  if (select count(*) from public.evo_credit_consumptions where seal_id='EVO-AAAAAAAA-AAAAAAAA-AAAAAAAA') <> 1 then raise exception 'idempotent_retry_duplicated_credit'; end if;
  if (select consumed_credits from public.evo_wallet_credits where wallet=w) <> 0 then raise exception 'idempotent_retry_charged_credit'; end if;

  select * into r from public.evo_register_seal_with_credit(b);
  if r.credit_source <> 'PAID' or r.remaining_credits <> 1 then raise exception 'paid_registration_failed'; end if;
  if (select consumed_credits from public.evo_wallet_credits where wallet=w) <> 1 then raise exception 'paid_credit_not_consumed_once'; end if;
end;
$$;

-- Conflicting content cannot reuse an existing Seal ID.
do $$
declare
  w constant text := '0x1111111111111111111111111111111111111111';
  conflicting jsonb := public.evo_test_seal_row(
    'EVO-AAAAAAAA-AAAAAAAA-AAAAAAAA', w, repeat('c',64), repeat('3',64), repeat('3',32), '', ''
  );
  raised boolean := false;
begin
  begin
    perform * from public.evo_register_seal_with_credit(conflicting);
  exception when others then
    raised := position('seal_id_conflict' in sqlerrm) > 0;
  end;
  if not raised then raise exception 'seal_id_conflict_not_rejected'; end if;
  if (select consumed_credits from public.evo_wallet_credits where wallet=w) <> 1 then raise exception 'conflict_changed_credit_state'; end if;
end;
$$;

-- A failed Seal insert must roll back a PAID credit update in the same transaction.
do $$
declare
  w constant text := '0x1111111111111111111111111111111111111111';
  failed jsonb := public.evo_test_seal_row(
    'EVO-CCCCCCCC-CCCCCCCC-CCCCCCCC', w, repeat('b',64), repeat('4',64), repeat('4',32), '', ''
  );
  before_count integer;
  after_count integer;
  raised boolean := false;
begin
  select consumed_credits into before_count from public.evo_wallet_credits where wallet=w;
  begin
    perform * from public.evo_register_seal_with_credit(failed);
  exception when unique_violation then
    raised := true;
  end;
  if not raised then raise exception 'duplicate_digest_failure_not_triggered'; end if;
  select consumed_credits into after_count from public.evo_wallet_credits where wallet=w;
  if after_count <> before_count then raise exception 'failed_insert_consumed_credit'; end if;
  if exists (select 1 from public.evo_credit_consumptions where seal_id='EVO-CCCCCCCC-CCCCCCCC-CCCCCCCC') then raise exception 'failed_insert_left_credit_record'; end if;
  if exists (select 1 from public.evo_seals where seal_id='EVO-CCCCCCCC-CCCCCCCC-CCCCCCCC') then raise exception 'failed_insert_left_seal'; end if;
end;
$$;

-- Consume the final paid credit, then prove insufficient entitlement creates no partial rows.
do $$
declare
  w constant text := '0x1111111111111111111111111111111111111111';
  d jsonb := public.evo_test_seal_row('EVO-DDDDDDDD-DDDDDDDD-DDDDDDDD', w, repeat('d',64), repeat('5',64), repeat('5',32), '', 'D-001');
  e jsonb := public.evo_test_seal_row('EVO-EEEEEEEE-EEEEEEEE-EEEEEEEE', w, repeat('e',64), repeat('6',64), repeat('6',32), '', 'E-001');
  r record;
  raised boolean := false;
begin
  select * into r from public.evo_register_seal_with_credit(d);
  if r.credit_source <> 'PAID' or r.remaining_credits <> 0 then raise exception 'final_paid_credit_result_invalid'; end if;

  begin
    perform * from public.evo_register_seal_with_credit(e);
  exception when others then
    raised := position('insufficient_passport_credits' in sqlerrm) > 0;
  end;
  if not raised then raise exception 'insufficient_credit_not_rejected'; end if;
  if exists (select 1 from public.evo_seals where seal_id='EVO-EEEEEEEE-EEEEEEEE-EEEEEEEE') then raise exception 'insufficient_credit_left_seal'; end if;
  if exists (select 1 from public.evo_credit_consumptions where seal_id='EVO-EEEEEEEE-EEEEEEEE-EEEEEEEE') then raise exception 'insufficient_credit_left_consumption'; end if;
  if (select consumed_credits from public.evo_wallet_credits where wallet=w) <> 2 then raise exception 'insufficient_credit_changed_balance'; end if;
end;
$$;

-- DB boundary fixes new registrations to ACTIVE even if a privileged caller submits another status.
do $$
declare
  w constant text := '0x2222222222222222222222222222222222222222';
  row_data jsonb := public.evo_test_seal_row('EVO-22222222-22222222-22222222', w, repeat('2',64), repeat('7',64), repeat('7',32), '', '', 'REVOKED');
  r record;
begin
  select * into r from public.evo_register_seal_with_credit(row_data);
  if r.status <> 'ACTIVE' then raise exception 'caller_controlled_initial_status'; end if;
  if (select status from public.evo_seals where seal_id='EVO-22222222-22222222-22222222') <> 'ACTIVE' then raise exception 'stored_status_not_active'; end if;
end;
$$;

-- Legacy orphan recovery: reuse an entitlement consumed by the historical two-step path.
do $$
declare
  w constant text := '0x3333333333333333333333333333333333333333';
  sid constant text := 'EVO-33333333-33333333-33333333';
  row_data jsonb := public.evo_test_seal_row(sid, w, repeat('3',64), repeat('8',64), repeat('8',32), '', 'LEGACY-001');
  r record;
begin
  insert into public.evo_credit_consumptions(seal_id,wallet,source) values (sid,w,'DEMO');
  select * into r from public.evo_register_seal_with_credit(row_data);
  if r.credit_source <> 'DEMO' then raise exception 'legacy_orphan_source_not_reused'; end if;
  if not exists (select 1 from public.evo_seals where seal_id=sid) then raise exception 'legacy_orphan_seal_not_repaired'; end if;
  if (select count(*) from public.evo_credit_consumptions where seal_id=sid) <> 1 then raise exception 'legacy_orphan_consumption_duplicated'; end if;
end;
$$;

select 'EVO V3.3.2 atomic Seal SQL tests passed' as result;
