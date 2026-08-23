-- EVO V4.0
-- Free Proof anti-Sybil authority.
-- Goal: a free entitlement is no longer granted solely because a wallet address is new.
-- The server must first reserve a trial using independent client + network signals.

create table if not exists public.evo_free_proof_grants (
  wallet text primary key,
  client_hash text not null unique,
  network_hash text not null,
  reserved_at timestamptz not null default pg_catalog.now(),
  expires_at timestamptz not null,
  consumed_seal_id text unique,
  consumed_at timestamptz,
  constraint evo_free_proof_wallet_chk check (wallet ~ '^0x[0-9a-f]{40}$'),
  constraint evo_free_proof_client_hash_chk check (client_hash ~ '^[0-9a-f]{64}$'),
  constraint evo_free_proof_network_hash_chk check (network_hash ~ '^[0-9a-f]{64}$'),
  constraint evo_free_proof_consumed_chk check ((consumed_seal_id is null and consumed_at is null) or (consumed_seal_id is not null and consumed_at is not null))
);

create index if not exists evo_free_proof_network_recent_idx
  on public.evo_free_proof_grants(network_hash, reserved_at desc);

alter table public.evo_free_proof_grants enable row level security;
revoke all on table public.evo_free_proof_grants from public, anon, authenticated;
grant select, insert, update on table public.evo_free_proof_grants to service_role;

create or replace function public.evo_free_proof_status(
  p_wallet text,
  p_client_hash text,
  p_network_hash text
)
returns table(
  eligible boolean,
  reason text,
  paid_available boolean,
  reserved boolean
)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_wallet text := lower(trim(p_wallet));
  v_client text := lower(trim(p_client_hash));
  v_network text := lower(trim(p_network_hash));
  v_paid boolean := false;
  v_grant public.evo_free_proof_grants%rowtype;
  v_network_count integer := 0;
begin
  if v_wallet !~ '^0x[0-9a-f]{40}$' then raise exception 'invalid_wallet'; end if;
  if v_client !~ '^[0-9a-f]{64}$' then raise exception 'invalid_client_hash'; end if;
  if v_network !~ '^[0-9a-f]{64}$' then raise exception 'invalid_network_hash'; end if;

  select coalesce(c.purchased_credits > c.consumed_credits, false)
    into v_paid
    from public.evo_wallet_credits c
    where c.wallet = v_wallet;
  v_paid := coalesce(v_paid, false);

  if exists (
    select 1 from public.evo_credit_consumptions x
    where x.wallet = v_wallet and x.source = 'DEMO'
  ) then
    return query select false, 'free_proof_already_used'::text, v_paid, false;
    return;
  end if;

  select g.* into v_grant
  from public.evo_free_proof_grants g
  where g.wallet = v_wallet;

  if found then
    if v_grant.consumed_seal_id is not null then
      return query select false, 'free_proof_already_used'::text, v_paid, true;
      return;
    end if;
    if v_grant.client_hash <> v_client then
      return query select false, 'wallet_bound_to_other_client'::text, v_paid, true;
      return;
    end if;
    return query select true, 'reserved'::text, v_paid, true;
    return;
  end if;

  if exists (
    select 1 from public.evo_free_proof_grants g
    where g.client_hash = v_client and g.wallet <> v_wallet
  ) then
    return query select false, 'client_free_proof_already_claimed'::text, v_paid, false;
    return;
  end if;

  select count(*)::integer into v_network_count
  from public.evo_free_proof_grants g
  where g.network_hash = v_network
    and g.reserved_at >= pg_catalog.now() - interval '30 days';

  if v_network_count >= 3 then
    return query select false, 'network_trial_limit'::text, v_paid, false;
    return;
  end if;

  return query select true, 'eligible'::text, v_paid, false;
end;
$$;

create or replace function public.evo_reserve_free_proof(
  p_wallet text,
  p_client_hash text,
  p_network_hash text
)
returns table(eligible boolean, reason text, expires_at timestamptz)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_wallet text := lower(trim(p_wallet));
  v_client text := lower(trim(p_client_hash));
  v_network text := lower(trim(p_network_hash));
  v_status record;
  v_expiry timestamptz := pg_catalog.now() + interval '30 minutes';
  v_existing public.evo_free_proof_grants%rowtype;
begin
  if v_wallet !~ '^0x[0-9a-f]{40}$' then raise exception 'invalid_wallet'; end if;
  if v_client !~ '^[0-9a-f]{64}$' then raise exception 'invalid_client_hash'; end if;
  if v_network !~ '^[0-9a-f]{64}$' then raise exception 'invalid_network_hash'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evo-free-wallet|' || v_wallet, 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evo-free-client|' || v_client, 0));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evo-free-network|' || v_network, 0));

  select * into v_status
  from public.evo_free_proof_status(v_wallet, v_client, v_network);

  if not coalesce(v_status.eligible, false) then
    return query select false, coalesce(v_status.reason, 'not_eligible')::text, null::timestamptz;
    return;
  end if;

  select g.* into v_existing
  from public.evo_free_proof_grants g
  where g.wallet = v_wallet
  for update;

  if found then
    if v_existing.client_hash <> v_client or v_existing.consumed_seal_id is not null then
      return query select false, 'not_eligible'::text, null::timestamptz;
      return;
    end if;
    update public.evo_free_proof_grants g
      set network_hash = v_network,
          expires_at = v_expiry
      where g.wallet = v_wallet;
    return query select true, 'reserved'::text, v_expiry;
    return;
  end if;

  insert into public.evo_free_proof_grants(wallet, client_hash, network_hash, expires_at)
  values (v_wallet, v_client, v_network, v_expiry);

  return query select true, 'reserved'::text, v_expiry;
end;
$$;

-- Replace the compatibility credit claimant so DEMO requires a server-reserved grant.
create or replace function public.evo_claim_passport_credit(p_wallet text, p_seal_id text)
returns table(credit_source text, remaining_credits integer)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_wallet text := lower(trim(p_wallet));
  v_existing public.evo_credit_consumptions%rowtype;
  v_grant public.evo_free_proof_grants%rowtype;
  v_remaining integer;
begin
  if v_wallet !~ '^0x[0-9a-f]{40}$' then raise exception 'invalid_wallet'; end if;
  if p_seal_id !~ '^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_seal_id'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evo-credit|' || v_wallet, 0));

  select c.* into v_existing from public.evo_credit_consumptions c where c.seal_id = p_seal_id;
  if found then
    if v_existing.wallet <> v_wallet then raise exception 'seal_credit_owner_mismatch'; end if;
    select greatest(c.purchased_credits - c.consumed_credits, 0) into v_remaining
      from public.evo_wallet_credits c where c.wallet = v_wallet;
    return query select v_existing.source, coalesce(v_remaining, 0);
    return;
  end if;

  select g.* into v_grant
  from public.evo_free_proof_grants g
  where g.wallet = v_wallet
    and g.consumed_seal_id is null
    and g.expires_at >= pg_catalog.now()
  for update;

  if found and not exists (
    select 1 from public.evo_credit_consumptions c
    where c.wallet = v_wallet and c.source = 'DEMO'
  ) then
    insert into public.evo_credit_consumptions(seal_id, wallet, source)
    values (p_seal_id, v_wallet, 'DEMO');
    update public.evo_free_proof_grants
      set consumed_seal_id = p_seal_id, consumed_at = pg_catalog.now()
      where wallet = v_wallet;
    select greatest(c.purchased_credits - c.consumed_credits, 0) into v_remaining
      from public.evo_wallet_credits c where c.wallet = v_wallet;
    return query select 'DEMO'::text, coalesce(v_remaining, 0);
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

-- Atomic Seal registration with anti-Sybil DEMO gate.
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
  v_created_at timestamptz;
  v_existing_seal public.evo_seals%rowtype;
  v_existing_consumption public.evo_credit_consumptions%rowtype;
  v_grant public.evo_free_proof_grants%rowtype;
  v_reuse_consumption boolean := false;
begin
  if p_row is null or pg_catalog.jsonb_typeof(p_row) <> 'object' then raise exception 'invalid_seal_row'; end if;
  if v_wallet !~ '^0x[0-9a-f]{40}$' then raise exception 'invalid_wallet'; end if;
  if v_seal_id !~ '^EVO-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then raise exception 'invalid_seal_id'; end if;
  if coalesce(p_row ->> 'version', '') <> 'EVO-SEAL-V1' then raise exception 'invalid_version'; end if;
  if coalesce(p_row ->> 'metadata_hash', '') !~ '^[0-9a-f]{64}$' then raise exception 'invalid_metadata_hash'; end if;
  if coalesce(p_row ->> 'digest', '') !~ '^[0-9a-f]{64}$' then raise exception 'invalid_digest'; end if;
  if coalesce(p_row ->> 'nonce', '') !~ '^[0-9a-f]{32}$' then raise exception 'invalid_nonce'; end if;
  if v_asset_hash <> '' and v_asset_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid_asset_hash'; end if;
  if length(coalesce(p_row ->> 'asset_type', '')) < 1 or length(coalesce(p_row ->> 'asset_type', '')) > 80 then raise exception 'invalid_asset_type'; end if;
  if length(coalesce(p_row ->> 'title', '')) < 1 or length(coalesce(p_row ->> 'title', '')) > 160 then raise exception 'invalid_title'; end if;
  if length(coalesce(p_row ->> 'issuer_label', '')) > 160 then raise exception 'issuer_label_too_long'; end if;
  if length(v_serial) > 160 then raise exception 'serial_too_long'; end if;
  if length(coalesce(p_row ->> 'description', '')) > 2000 then raise exception 'description_too_long'; end if;
  if length(coalesce(p_row ->> 'file_name', '')) > 255 then raise exception 'file_name_too_long'; end if;
  if length(coalesce(p_row ->> 'file_type', '')) > 160 then raise exception 'file_type_too_long'; end if;
  if coalesce(p_row ->> 'signature', '') = '' or coalesce(p_row ->> 'signature_message', '') = '' then raise exception 'missing_signature_evidence'; end if;
  if pg_catalog.jsonb_typeof(coalesce(p_row -> 'metadata', '{}'::jsonb)) <> 'object' then raise exception 'invalid_metadata'; end if;

  begin v_file_size := coalesce((p_row ->> 'file_size')::bigint, 0); exception when others then raise exception 'invalid_file_size'; end;
  if v_file_size < 0 then raise exception 'invalid_file_size'; end if;
  begin v_created_at := (p_row ->> 'created_at')::timestamptz; exception when others then raise exception 'invalid_created_at'; end;
  if v_created_at is null then raise exception 'invalid_created_at'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('evo-credit|' || v_wallet, 0));

  select s.* into v_existing_seal from public.evo_seals s where s.seal_id = v_seal_id;
  if found then
    if lower(v_existing_seal.issuer_wallet) <> v_wallet
      or v_existing_seal.digest <> (p_row ->> 'digest')
      or v_existing_seal.metadata_hash <> (p_row ->> 'metadata_hash') then raise exception 'seal_id_conflict'; end if;
    select c.* into v_existing_consumption from public.evo_credit_consumptions c where c.seal_id = v_seal_id;
    if not found then raise exception 'seal_credit_state_missing'; end if;
    if v_existing_consumption.wallet <> v_wallet then raise exception 'seal_credit_owner_mismatch'; end if;
    select greatest(c.purchased_credits - c.consumed_credits, 0) into v_remaining
      from public.evo_wallet_credits c where c.wallet = v_wallet;
    return query select v_existing_seal.seal_id, v_existing_seal.registered_at, v_existing_seal.status, v_existing_consumption.source, coalesce(v_remaining,0);
    return;
  end if;

  select c.* into v_existing_consumption from public.evo_credit_consumptions c where c.seal_id = v_seal_id;
  if found then
    if v_existing_consumption.wallet <> v_wallet then raise exception 'seal_credit_owner_mismatch'; end if;
    if v_existing_consumption.source not in ('DEMO','PAID') then raise exception 'invalid_credit_source'; end if;
    v_source := v_existing_consumption.source;
    v_reuse_consumption := true;
    select greatest(c.purchased_credits - c.consumed_credits, 0) into v_remaining
      from public.evo_wallet_credits c where c.wallet = v_wallet;
    v_remaining := coalesce(v_remaining,0);
  else
    select g.* into v_grant
    from public.evo_free_proof_grants g
    where g.wallet = v_wallet
      and g.consumed_seal_id is null
      and g.expires_at >= pg_catalog.now()
    for update;

    if found and not exists (
      select 1 from public.evo_credit_consumptions c
      where c.wallet = v_wallet and c.source = 'DEMO'
    ) then
      v_source := 'DEMO';
      select coalesce(greatest(c.purchased_credits-c.consumed_credits,0),0) into v_remaining
        from public.evo_wallet_credits c where c.wallet=v_wallet;
      v_remaining := coalesce(v_remaining,0);
    else
      update public.evo_wallet_credits c
        set consumed_credits=c.consumed_credits+1, updated_at=pg_catalog.now()
        where c.wallet=v_wallet and c.purchased_credits>c.consumed_credits
        returning c.purchased_credits-c.consumed_credits into v_remaining;
      if not found then raise exception 'insufficient_passport_credits'; end if;
      v_source := 'PAID';
    end if;
  end if;

  insert into public.evo_seals as s (
    seal_id,version,asset_type,title,issuer_wallet,issuer_label,serial,description,file_name,file_size,file_type,
    asset_hash,metadata_hash,digest,nonce,signature,signature_message,created_at,status,metadata
  ) values (
    v_seal_id,p_row->>'version',p_row->>'asset_type',p_row->>'title',v_wallet,coalesce(p_row->>'issuer_label',''),v_serial,
    coalesce(p_row->>'description',''),coalesce(p_row->>'file_name',''),v_file_size,coalesce(p_row->>'file_type',''),v_asset_hash,
    p_row->>'metadata_hash',p_row->>'digest',p_row->>'nonce',p_row->>'signature',p_row->>'signature_message',v_created_at,'ACTIVE',
    coalesce(p_row->'metadata','{}'::jsonb)
  ) returning s.registered_at,s.status into v_registered_at,v_status;

  if not v_reuse_consumption then
    insert into public.evo_credit_consumptions(seal_id,wallet,source) values(v_seal_id,v_wallet,v_source);
    if v_source='DEMO' then
      update public.evo_free_proof_grants
        set consumed_seal_id=v_seal_id, consumed_at=pg_catalog.now()
        where wallet=v_wallet and consumed_seal_id is null;
      if not found then raise exception 'free_proof_grant_missing'; end if;
    end if;
  end if;

  return query select v_seal_id,v_registered_at,v_status,v_source,v_remaining;
end;
$$;

revoke all on function public.evo_free_proof_status(text,text,text) from public, anon, authenticated;
revoke all on function public.evo_reserve_free_proof(text,text,text) from public, anon, authenticated;
revoke all on function public.evo_register_seal_with_credit(jsonb) from public, anon, authenticated;
revoke all on function public.evo_claim_passport_credit(text,text) from public, anon, authenticated;
grant execute on function public.evo_free_proof_status(text,text,text) to postgres, service_role;
grant execute on function public.evo_reserve_free_proof(text,text,text) to postgres, service_role;
grant execute on function public.evo_register_seal_with_credit(jsonb) to postgres, service_role;
grant execute on function public.evo_claim_passport_credit(text,text) to postgres, service_role;
