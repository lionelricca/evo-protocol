-- EVO V3.3.8
-- Serialize and bound public DNS verification checks before outbound DNS work.

create or replace function public.evo_domain_take_check_slot(p_challenge_id text)
returns table(
  allowed boolean,
  reason text,
  issuer_wallet text,
  domain text,
  token text,
  challenge_status text,
  expires_at timestamptz,
  check_count integer,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_row public.evo_domain_challenges%rowtype;
  v_retry integer := 0;
begin
  if p_challenge_id !~ '^EVD-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$' then
    raise exception 'invalid_challenge_id';
  end if;

  select c.* into v_row
  from public.evo_domain_challenges c
  where c.challenge_id = p_challenge_id
  for update;

  if not found then
    return query select false, 'not_found'::text, null::text, null::text, null::text, null::text, null::timestamptz, 0, 0;
    return;
  end if;

  if v_row.status = 'VERIFIED' then
    return query select false, 'verified'::text, v_row.issuer_wallet, v_row.domain, null::text, v_row.status, v_row.expires_at, v_row.check_count, 0;
    return;
  end if;

  if v_row.status <> 'PENDING' then
    return query select false, lower(v_row.status)::text, v_row.issuer_wallet, v_row.domain, null::text, v_row.status, v_row.expires_at, v_row.check_count, 0;
    return;
  end if;

  if v_row.expires_at <= v_now then
    update public.evo_domain_challenges c
      set status = 'EXPIRED',
          last_checked_at = v_now,
          check_count = c.check_count + 1
      where c.challenge_id = p_challenge_id;
    return query select false, 'expired'::text, v_row.issuer_wallet, v_row.domain, null::text, 'EXPIRED'::text, v_row.expires_at, v_row.check_count + 1, 0;
    return;
  end if;

  if v_row.check_count >= 30 then
    return query select false, 'rate_limited'::text, v_row.issuer_wallet, v_row.domain, null::text, v_row.status, v_row.expires_at, v_row.check_count, 0;
    return;
  end if;

  if v_row.last_checked_at is not null and v_row.last_checked_at > v_now - interval '2 seconds' then
    v_retry := greatest(1, ceil(extract(epoch from (v_row.last_checked_at + interval '2 seconds' - v_now)))::integer);
    return query select false, 'too_fast'::text, v_row.issuer_wallet, v_row.domain, null::text, v_row.status, v_row.expires_at, v_row.check_count, v_retry;
    return;
  end if;

  update public.evo_domain_challenges c
    set check_count = c.check_count + 1,
        last_checked_at = v_now
    where c.challenge_id = p_challenge_id
    returning c.check_count into v_row.check_count;

  return query select true, 'ok'::text, v_row.issuer_wallet, v_row.domain, v_row.token, v_row.status, v_row.expires_at, v_row.check_count, 0;
end;
$$;

revoke all on function public.evo_domain_take_check_slot(text) from public;
revoke all on function public.evo_domain_take_check_slot(text) from anon;
revoke all on function public.evo_domain_take_check_slot(text) from authenticated;
grant execute on function public.evo_domain_take_check_slot(text) to postgres;
grant execute on function public.evo_domain_take_check_slot(text) to service_role;
