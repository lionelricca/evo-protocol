-- EVO V3.3.4
-- Durable cost-control boundary for blockchain payment verification.
-- The public Edge Function may be called without Supabase JWT, but only the
-- service-role backend can consume these verification slots.

create table if not exists public.evo_checkout_verification_limits (
  bucket_key text primary key,
  window_start timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  updated_at timestamptz not null default now()
);

alter table public.evo_checkout_verification_limits enable row level security;
revoke all on table public.evo_checkout_verification_limits from public;
revoke all on table public.evo_checkout_verification_limits from anon;
revoke all on table public.evo_checkout_verification_limits from authenticated;

create index if not exists evo_checkout_verification_limits_window_idx
  on public.evo_checkout_verification_limits(window_start);

create or replace function public.evo_checkout_take_verification_slot(
  p_payer_wallet text,
  p_tx_hash text
)
returns table(
  allowed boolean,
  global_attempts integer,
  payer_attempts integer,
  tx_attempts integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_wallet text := lower(trim(p_payer_wallet));
  v_tx text := lower(trim(p_tx_hash));
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_window timestamptz := pg_catalog.date_trunc('minute', v_now);
  v_global integer := 0;
  v_payer integer := 0;
  v_tx_count integer := 0;
  v_retry integer := 1;
begin
  if v_wallet !~ '^0x[0-9a-f]{40}$' then raise exception 'invalid_wallet'; end if;
  if v_tx !~ '^0x[0-9a-f]{64}$' then raise exception 'invalid_tx_hash'; end if;

  -- Keep the state table bounded. At most 100 stale entity buckets are pruned
  -- on a request; the fixed global bucket is overwritten each minute.
  delete from public.evo_checkout_verification_limits r
  where r.bucket_key in (
    select old.bucket_key
    from public.evo_checkout_verification_limits old
    where old.bucket_key <> 'global'
      and old.window_start < v_window - interval '1 day'
    order by old.window_start asc
    limit 100
  );

  insert into public.evo_checkout_verification_limits as r(bucket_key,window_start,attempts,updated_at)
  values ('global',v_window,1,v_now)
  on conflict(bucket_key) do update
    set attempts = case when r.window_start = excluded.window_start then r.attempts + 1 else 1 end,
        window_start = excluded.window_start,
        updated_at = excluded.updated_at
  returning r.attempts into v_global;

  insert into public.evo_checkout_verification_limits as r(bucket_key,window_start,attempts,updated_at)
  values ('payer:' || v_wallet,v_window,1,v_now)
  on conflict(bucket_key) do update
    set attempts = case when r.window_start = excluded.window_start then r.attempts + 1 else 1 end,
        window_start = excluded.window_start,
        updated_at = excluded.updated_at
  returning r.attempts into v_payer;

  insert into public.evo_checkout_verification_limits as r(bucket_key,window_start,attempts,updated_at)
  values ('tx:' || v_tx,v_window,1,v_now)
  on conflict(bucket_key) do update
    set attempts = case when r.window_start = excluded.window_start then r.attempts + 1 else 1 end,
        window_start = excluded.window_start,
        updated_at = excluded.updated_at
  returning r.attempts into v_tx_count;

  v_retry := greatest(
    1,
    ceil(extract(epoch from (v_window + interval '1 minute' - v_now)))::integer
  );

  return query select
    (v_global <= 240 and v_payer <= 60 and v_tx_count <= 20),
    v_global,
    v_payer,
    v_tx_count,
    v_retry;
end;
$$;

revoke all on function public.evo_checkout_take_verification_slot(text,text) from public;
revoke all on function public.evo_checkout_take_verification_slot(text,text) from anon;
revoke all on function public.evo_checkout_take_verification_slot(text,text) from authenticated;
grant execute on function public.evo_checkout_take_verification_slot(text,text) to postgres;
grant execute on function public.evo_checkout_take_verification_slot(text,text) to service_role;
