\set ON_ERROR_STOP on

do $$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname='service_role') then create role service_role nologin; end if;
end;
$$;

drop table if exists public.evo_passport_transfers cascade;
drop table if exists public.evo_passport_events cascade;
drop table if exists public.evo_seals cascade;

create table public.evo_seals (
  seal_id text primary key,
  issuer_wallet text not null,
  status text not null default 'ACTIVE'
);

create table public.evo_passport_events (
  event_id text primary key,
  seal_id text not null,
  version text not null,
  event_type text not null,
  actor_wallet text not null,
  new_owner_wallet text not null default '',
  note text not null default '',
  event_digest text not null unique,
  nonce text not null,
  signature text not null,
  signature_message text not null,
  created_at timestamptz not null,
  registered_at timestamptz not null default now(),
  status text not null default 'ACTIVE',
  counterparty_wallet text not null default '',
  counter_signature text not null default '',
  counter_signature_message text not null default ''
);

create table public.evo_passport_transfers (
  offer_id text primary key,
  seal_id text not null,
  from_wallet text not null,
  to_wallet text not null,
  offer_digest text not null unique,
  offer_nonce text not null,
  offer_signature text not null,
  offer_message text not null,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null default 'PENDING',
  accepted_at timestamptz,
  accept_digest text not null default '',
  accept_nonce text not null default '',
  accept_signature text not null default '',
  accept_message text not null default '',
  registered_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancel_digest text not null default '',
  cancel_nonce text not null default '',
  cancel_signature text not null default '',
  cancel_message text not null default ''
);

create unique index evo_passport_one_pending_transfer_per_seal
  on public.evo_passport_transfers(seal_id) where status='PENDING';
