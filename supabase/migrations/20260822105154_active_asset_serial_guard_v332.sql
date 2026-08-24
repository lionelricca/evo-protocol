-- EVO V3.3.2
-- Database-level guard for the business identity tuple used by EVO Seal.
-- A legacy test duplicate exists in production, so a UNIQUE index cannot be
-- introduced safely until that historical data is reviewed. This trigger blocks
-- NEW duplicates immediately without rewriting or deleting existing records.

create or replace function public.evo_guard_active_asset_serial()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if new.status = 'ACTIVE'
    and coalesce(new.asset_hash, '') <> ''
    and coalesce(new.serial, '') <> ''
    and exists (
      select 1
      from public.evo_seals s
      where s.seal_id <> new.seal_id
        and lower(s.issuer_wallet) = lower(new.issuer_wallet)
        and s.asset_hash = new.asset_hash
        and s.serial = new.serial
        and s.status = 'ACTIVE'
    ) then
    raise exception 'duplicate_asset_serial' using errcode = '23505';
  end if;
  return new;
end;
$$;

drop trigger if exists evo_guard_active_asset_serial_trigger on public.evo_seals;
create trigger evo_guard_active_asset_serial_trigger
before insert or update of issuer_wallet, asset_hash, serial, status
on public.evo_seals
for each row
execute function public.evo_guard_active_asset_serial();

revoke all on function public.evo_guard_active_asset_serial() from public;
revoke all on function public.evo_guard_active_asset_serial() from anon;
revoke all on function public.evo_guard_active_asset_serial() from authenticated;
