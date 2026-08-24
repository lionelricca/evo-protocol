\set ON_ERROR_STOP on

-- Privilege and RLS boundary.
do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='evo_checkout_verification_limits' and c.relrowsecurity
  ) then raise exception 'checkout_rate_table_rls_not_enabled'; end if;
  if pg_catalog.has_table_privilege('anon','public.evo_checkout_verification_limits','SELECT') then raise exception 'anon_can_read_checkout_rate_state'; end if;
  if pg_catalog.has_table_privilege('authenticated','public.evo_checkout_verification_limits','SELECT') then raise exception 'authenticated_can_read_checkout_rate_state'; end if;
  if pg_catalog.has_function_privilege('anon','public.evo_checkout_take_verification_slot(text,text)','EXECUTE') then raise exception 'anon_can_execute_checkout_rate_rpc'; end if;
  if pg_catalog.has_function_privilege('authenticated','public.evo_checkout_take_verification_slot(text,text)','EXECUTE') then raise exception 'authenticated_can_execute_checkout_rate_rpc'; end if;
  if not pg_catalog.has_function_privilege('service_role','public.evo_checkout_take_verification_slot(text,text)','EXECUTE') then raise exception 'service_role_missing_checkout_rate_rpc'; end if;
end;
$$;

-- One transaction hash may be polled up to 20 times per minute. The 21st is denied.
do $$
declare
  w constant text := '0x7777777777777777777777777777777777777777';
  tx constant text := '0x' || repeat('7',64);
  r record;
  i integer;
begin
  delete from public.evo_checkout_verification_limits;
  for i in 1..20 loop
    select * into r from public.evo_checkout_take_verification_slot(w,tx);
    if not r.allowed then raise exception 'tx_limit_rejected_too_early_%',i; end if;
  end loop;
  select * into r from public.evo_checkout_take_verification_slot(w,tx);
  if r.allowed or r.tx_attempts <> 21 then raise exception 'tx_limit_not_enforced'; end if;
  if r.retry_after_seconds < 1 or r.retry_after_seconds > 60 then raise exception 'invalid_retry_after'; end if;
end;
$$;

-- One payer may initiate at most 60 verification attempts per minute.
do $$
declare
  w constant text := '0x8888888888888888888888888888888888888888';
  r record;
  i integer;
  tx text;
begin
  delete from public.evo_checkout_verification_limits;
  for i in 1..60 loop
    tx := '0x' || pg_catalog.lpad(pg_catalog.to_hex(i::bigint),64,'0');
    select * into r from public.evo_checkout_take_verification_slot(w,tx);
    if not r.allowed then raise exception 'payer_limit_rejected_too_early_%',i; end if;
  end loop;
  tx := '0x' || pg_catalog.lpad(pg_catalog.to_hex(61::bigint),64,'0');
  select * into r from public.evo_checkout_take_verification_slot(w,tx);
  if r.allowed or r.payer_attempts <> 61 then raise exception 'payer_limit_not_enforced'; end if;
end;
$$;

-- Global cost ceiling is 240 expensive verification attempts per minute.
do $$
declare
  r record;
  i integer;
  w text;
  tx text;
begin
  delete from public.evo_checkout_verification_limits;
  for i in 1..240 loop
    w := '0x' || pg_catalog.lpad(pg_catalog.to_hex(i::bigint),40,'0');
    tx := '0x' || pg_catalog.lpad(pg_catalog.to_hex(i::bigint),64,'0');
    select * into r from public.evo_checkout_take_verification_slot(w,tx);
    if not r.allowed then raise exception 'global_limit_rejected_too_early_%',i; end if;
  end loop;
  w := '0x' || pg_catalog.lpad(pg_catalog.to_hex(241::bigint),40,'0');
  tx := '0x' || pg_catalog.lpad(pg_catalog.to_hex(241::bigint),64,'0');
  select * into r from public.evo_checkout_take_verification_slot(w,tx);
  if r.allowed or r.global_attempts <> 241 then raise exception 'global_limit_not_enforced'; end if;
end;
$$;

select 'EVO V3.3.4 checkout verification rate-limit tests passed' as result;
