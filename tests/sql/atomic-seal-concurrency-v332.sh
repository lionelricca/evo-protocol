#!/usr/bin/env bash
set -euo pipefail

PSQL=(psql -X -v ON_ERROR_STOP=1)
WALLET='0x4444444444444444444444444444444444444444'

"${PSQL[@]}" -c "insert into public.evo_wallet_credits(wallet,purchased_credits,consumed_credits) values ('$WALLET',1,0);"

SQL_A="select * from public.evo_register_seal_with_credit(public.evo_test_seal_row('EVO-44444444-44444444-44444444','$WALLET',repeat('4',64),repeat('9',64),repeat('9',32),'','RACE-A'));"
SQL_B="select * from public.evo_register_seal_with_credit(public.evo_test_seal_row('EVO-55555555-55555555-55555555','$WALLET',repeat('5',64),repeat('a',64),repeat('a',32),'','RACE-B'));"

"${PSQL[@]}" -c "$SQL_A" >/tmp/evo-race-a.log 2>&1 &
PID_A=$!
"${PSQL[@]}" -c "$SQL_B" >/tmp/evo-race-b.log 2>&1 &
PID_B=$!

wait "$PID_A"
wait "$PID_B"

"${PSQL[@]}" <<'SQL'
do $$
declare
  w constant text := '0x4444444444444444444444444444444444444444';
begin
  if (select count(*) from public.evo_seals where issuer_wallet=w) <> 2 then
    raise exception 'concurrent_registration_lost_seal';
  end if;
  if (select count(*) from public.evo_credit_consumptions where wallet=w) <> 2 then
    raise exception 'concurrent_registration_credit_count_invalid';
  end if;
  if (select count(*) from public.evo_credit_consumptions where wallet=w and source='DEMO') <> 1 then
    raise exception 'concurrent_registration_created_multiple_demos';
  end if;
  if (select count(*) from public.evo_credit_consumptions where wallet=w and source='PAID') <> 1 then
    raise exception 'concurrent_registration_paid_count_invalid';
  end if;
  if (select consumed_credits from public.evo_wallet_credits where wallet=w) <> 1 then
    raise exception 'concurrent_registration_paid_credit_not_exactly_once';
  end if;
end;
$$;
SQL

echo 'EVO V3.3.2 concurrent entitlement test passed'
