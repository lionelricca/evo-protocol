-- EVO V3.3.2
-- Atomic economic boundary: an EVO Passport credit must never be consumed
-- unless the corresponding Seal is inserted in the same database transaction.

create or replace function public.evo_claim_passport_credit(p_wallet text, p_seal_id text)
returns table(credit_source text, remaining_credits integer)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_wallet text := lower(trim(p_wallet));
  v_existing public.evo_credit_consumptions%rowtype;
  v_remaining integer;
begin
  if v_wallet !~ '^0x[0-9a-f]{40}$' then raise exception 'invalid_wallet'; end if;
  if p_seal_id !~ '^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_seal_id'; end if;

  -- Wallet-wide lock serializes DEMO/PAID entitlement decisions across different Seal IDs.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evo-credit|' || v_wallet, 0));

  select c.* into v_existing
  from public.evo_credit_consumptions c
  where c.seal_id = p_seal_id;

  if found then
    if v_existing.wallet <> v_wallet then raise exception 'seal_credit_owner_mismatch'; end if;
    select greatest(c.purchased_credits - c.consumed_credits, 0)
      into v_remaining
      from public.evo_wallet_credits c
      where c.wallet = v_wallet;
    return query select v_existing.source, coalesce(v_remaining, 0);
    return;
  end if;

  if not exists (
    select 1 from public.evo_credit_consumptions c
    where c.wallet = v_wallet and c.source = 'DEMO'
  ) then
    insert into public.evo_credit_consumptions(seal_id, wallet, source)
    values (p_seal_id, v_wallet, 'DEMO');

    return query
    select 'DEMO'::text,
      coalesce((
        select greatest(c.purchased_credits - c.consumed_credits, 0)
        from public.evo_wallet_credits c
        where c.wallet = v_wallet
      ), 0);
    return;
  end if;

  update public.evo_wallet_credits c
    set consumed_credits = c.consumed_credits + 1,
        updated_at = pg_catalog.now()
    where c.wallet = v_wallet
      and c.purchased_credits > c.consumed_credits
    returning c.purchased_credits - c.consumed_credits into v_remaining;

  if not found then raise exception 'insufficient_passport_credits'; end if;

  insert into public.evo_credit_consumptions(seal_id, wallet, source)
  values (p_seal_id, v_wallet, 'PAID');

  return query select 'PAID'::text, v_remaining;
end;
$$;

create or replace function public.evo_register_seal_with_credit(p_row jsonb)
returns table(
  seal_id text,
  registered_at timestamptz,
  status text,
  credit_source text,
  remaining_credits integer
)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_wallet text := lower(trim(coalesce(p_row ->> 'issuer_wallet', '')));
  v_seal_id text := trim(coalesce(p_row ->> 'seal_id', ''));
  v_asset_hash text := lower(trim(coalesce(p_row ->> 'asset_hash', '')));
  v_serial text := trim(coalesce(p_row ->> 'serial', ''));
  v_source text;
  v_remaining integer := 0;
  v_registered_at timestamptz;
  v_status text;
  v_file_size bigint;
begin
  if p_row is null or pg_catalog.jsonb_typeof(p_row) <> 'object' then
    raise exception 'invalid_seal_row';
  end if;
  if v_wallet !~ '^0x[0-9a-f]{40}$' then raise exception 'invalid_wallet'; end if;
  if v_seal_id !~ '^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_seal_id'; end if;
  if coalesce(p_row ->> 'version', '') <> 'EVO-SEAL-V1' then raise exception 'invalid_version'; end if;
  if coalesce(p_row ->> 'metadata_hash', '') !~ '^[0-9a-f]{64}$' then raise exception 'invalid_metadata_hash'; end if;
  if coalesce(p_row ->> 'digest', '') !~ '^[0-9a-f]{64}$' then raise exception 'invalid_digest'; end if;
  if coalesce(p_row ->> 'nonce', '') !~ '^[0-9a-f]{32}$' then raise exception 'invalid_nonce'; end if;
  if v_asset_hash <> '' and v_asset_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_asset_hash'; end if;

  begin
    v_file_size := coalesce((p_row ->> 'file_size')::bigint, 0);
  exception when others then
    raise exception 'invalid_file_size';
  end;
  if v_file_size < 0 then raise exception 'invalid_file_size'; end if;

  -- Same lock key as evo_claim_passport_credit keeps a rolling deployment safe.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evo-credit|' || v_wallet, 0));

  if exists (select 1 from public.evo_seals s where s.seal_id = v_seal_id) then
    raise exception 'seal_already_exists';
  end if;

  -- Re-check the duplicate business rule inside the transaction to close the race
  -- between the Edge preflight check and final insertion.
  if v_asset_hash <> '' and v_serial <> '' and exists (
    select 1
    from public.evo_seals s
    where lower(s.issuer_wallet) = v_wallet
      and s.asset_hash = v_asset_hash
      and s.serial = v_serial
      and s.status = 'ACTIVE'
  ) then
    raise exception 'duplicate_asset_serial';
  end if;

  if not exists (
    select 1
    from public.evo_credit_consumptions c
    where c.wallet = v_wallet and c.source = 'DEMO'
  ) then
    v_source := 'DEMO';
    select coalesce(greatest(c.purchased_credits - c.consumed_credits, 0), 0)
      into v_remaining
      from public.evo_wallet_credits c
      where c.wallet = v_wallet;
    v_remaining := coalesce(v_remaining, 0);
  else
    update public.evo_wallet_credits c
      set consumed_credits = c.consumed_credits + 1,
          updated_at = pg_catalog.now()
      where c.wallet = v_wallet
        and c.purchased_credits > c.consumed_credits
      returning c.purchased_credits - c.consumed_credits into v_remaining;

    if not found then raise exception 'insufficient_passport_credits'; end if;
    v_source := 'PAID';
  end if;

  insert into public.evo_seals as s (
    seal_id, version, asset_type, title, issuer_wallet, issuer_label, serial,
    description, file_name, file_size, file_type, asset_hash, metadata_hash,
    digest, nonce, signature, signature_message, created_at, status, metadata
  ) values (
    v_seal_id,
    p_row ->> 'version',
    p_row ->> 'asset_type',
    p_row ->> 'title',
    v_wallet,
    coalesce(p_row ->> 'issuer_label', ''),
    v_serial,
    coalesce(p_row ->> 'description', ''),
    coalesce(p_row ->> 'file_name', ''),
    v_file_size,
    coalesce(p_row ->> 'file_type', ''),
    v_asset_hash,
    p_row ->> 'metadata_hash',
    p_row ->> 'digest',
    p_row ->> 'nonce',
    p_row ->> 'signature',
    p_row ->> 'signature_message',
    (p_row ->> 'created_at')::timestamptz,
    coalesce(p_row ->> 'status', 'ACTIVE'),
    coalesce(p_row -> 'metadata', '{}'::jsonb)
  )
  returning s.registered_at, s.status into v_registered_at, v_status;

  insert into public.evo_credit_consumptions(seal_id, wallet, source)
  values (v_seal_id, v_wallet, v_source);

  return query
  select v_seal_id, v_registered_at, v_status, v_source, v_remaining;
end;
$$;

revoke all on function public.evo_register_seal_with_credit(jsonb) from public;
revoke all on function public.evo_register_seal_with_credit(jsonb) from anon;
revoke all on function public.evo_register_seal_with_credit(jsonb) from authenticated;
grant execute on function public.evo_register_seal_with_credit(jsonb) to postgres;
grant execute on function public.evo_register_seal_with_credit(jsonb) to service_role;

-- Compatibility RPC remains service-role only.
revoke all on function public.evo_claim_passport_credit(text,text) from public;
revoke all on function public.evo_claim_passport_credit(text,text) from anon;
revoke all on function public.evo_claim_passport_credit(text,text) from authenticated;
grant execute on function public.evo_claim_passport_credit(text,text) to postgres;
grant execute on function public.evo_claim_passport_credit(text,text) to service_role;
