create or replace function public.evo_get_passport_entitlement(p_wallet text)
returns table(demo_available boolean, purchased_credits integer, consumed_credits integer, remaining_credits integer)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_wallet text := lower(trim(p_wallet));
  v_purchased integer := 0;
  v_consumed integer := 0;
begin
  if v_wallet !~ '^0x[0-9a-f]{40}$' then
    raise exception 'invalid_wallet';
  end if;

  select coalesce(c.purchased_credits, 0), coalesce(c.consumed_credits, 0)
    into v_purchased, v_consumed
    from public.evo_wallet_credits c
    where c.wallet = v_wallet;

  return query
  select
    not exists (
      select 1 from public.evo_credit_consumptions x
      where x.wallet = v_wallet and x.source = 'DEMO'
    ),
    v_purchased,
    v_consumed,
    greatest(v_purchased - v_consumed, 0);
end;
$function$;

revoke all on function public.evo_get_passport_entitlement(text) from public, anon, authenticated;
grant execute on function public.evo_get_passport_entitlement(text) to service_role;
