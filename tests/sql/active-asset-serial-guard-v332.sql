\set ON_ERROR_STOP on

do $$
declare
  w constant text := '0x6666666666666666666666666666666666666666';
  first_row jsonb := public.evo_test_seal_row(
    'EVO-66666666-66666666-66666666', w, repeat('6',64), repeat('b',64), repeat('b',32), repeat('f',64), 'DUP-001'
  );
  duplicate_row jsonb := public.evo_test_seal_row(
    'EVO-77777777-77777777-77777777', w, repeat('7',64), repeat('c',64), repeat('c',32), repeat('f',64), 'DUP-001'
  );
  r record;
  before_count integer;
  after_count integer;
  raised boolean := false;
begin
  insert into public.evo_wallet_credits(wallet,purchased_credits,consumed_credits) values (w,1,0);
  select * into r from public.evo_register_seal_with_credit(first_row);
  if r.credit_source <> 'DEMO' then raise exception 'duplicate_guard_fixture_demo_failed'; end if;

  select consumed_credits into before_count from public.evo_wallet_credits where wallet=w;
  begin
    perform * from public.evo_register_seal_with_credit(duplicate_row);
  exception when unique_violation then
    raised := position('duplicate_asset_serial' in sqlerrm) > 0;
  end;
  if not raised then raise exception 'duplicate_asset_serial_not_blocked'; end if;
  select consumed_credits into after_count from public.evo_wallet_credits where wallet=w;
  if after_count <> before_count then raise exception 'duplicate_asset_serial_consumed_credit'; end if;
  if exists (select 1 from public.evo_seals where seal_id='EVO-77777777-77777777-77777777') then raise exception 'duplicate_asset_serial_left_seal'; end if;
  if exists (select 1 from public.evo_credit_consumptions where seal_id='EVO-77777777-77777777-77777777') then raise exception 'duplicate_asset_serial_left_credit_record'; end if;
end;
$$;

select 'EVO V3.3.2 active asset/serial guard test passed' as result;
