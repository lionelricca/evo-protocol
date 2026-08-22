\set ON_ERROR_STOP on

-- Minimal PostgreSQL 17 fixture for the economic boundary exercised by
-- evo_register_seal_with_credit. This is intentionally isolated from production.

do $$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_catalog.pg_roles where rolname='service_role') then create role service_role nologin; end if;
end;
$$;

drop table if exists public.evo_credit_consumptions cascade;
drop table if exists public.evo_wallet_credits cascade;
drop table if exists public.evo_seals cascade;

create table public.evo_wallet_credits (
  wallet text primary key,
  purchased_credits integer not null default 0,
  consumed_credits integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint evo_wallet_credit_nonnegative check (purchased_credits >= 0 and consumed_credits >= 0),
  constraint evo_wallet_credit_consumption_valid check (consumed_credits <= purchased_credits)
);

create table public.evo_credit_consumptions (
  seal_id text primary key,
  wallet text not null,
  source text not null,
  payment_tx_hash text,
  created_at timestamptz not null default now(),
  constraint evo_credit_source_valid check (source in ('DEMO','PAID'))
);
create unique index evo_one_demo_per_wallet_idx
  on public.evo_credit_consumptions(wallet)
  where source='DEMO';
create index evo_credit_consumptions_wallet_idx
  on public.evo_credit_consumptions(wallet, created_at desc);

create table public.evo_seals (
  seal_id text primary key,
  version text not null,
  asset_type text not null,
  title text not null,
  issuer_wallet text not null,
  issuer_label text not null default '',
  serial text not null default '',
  description text not null default '',
  file_name text not null default '',
  file_size bigint not null default 0,
  file_type text not null default '',
  asset_hash text not null default '',
  metadata_hash text not null,
  digest text not null unique,
  nonce text not null,
  signature text not null,
  signature_message text not null,
  created_at timestamptz not null,
  registered_at timestamptz not null default now(),
  status text not null default 'ACTIVE',
  metadata jsonb not null default '{}'::jsonb,
  revoked_at timestamptz,
  revoked_reason text,
  superseded_by text
);
create index evo_seals_issuer_wallet_idx on public.evo_seals(lower(issuer_wallet));
create index evo_seals_registered_at_idx on public.evo_seals(registered_at desc);
