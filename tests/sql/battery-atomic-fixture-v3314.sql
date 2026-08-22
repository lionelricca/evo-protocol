\set ON_ERROR_STOP on

drop table if exists public.evo_battery_passport_versions cascade;
drop table if exists public.evo_battery_passports cascade;
drop table if exists public.evo_battery_models cascade;

create table public.evo_battery_models (
  model_id text primary key,
  schema_version text not null default 'EVO-BATTERY-MODEL-V0',
  issuer_wallet text not null,
  unique_model_identifier text not null,
  model_name text not null,
  battery_category text not null,
  nominal_energy_kwh numeric,
  public_data jsonb not null default '{}'::jsonb,
  legitimate_interest_data jsonb not null default '{}'::jsonb,
  authority_data jsonb not null default '{}'::jsonb,
  data_hash text not null,
  signature text not null,
  signature_message text not null,
  signed_at timestamptz not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(issuer_wallet,unique_model_identifier),
  check(model_id ~ '^EBM-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$'),
  check(schema_version='EVO-BATTERY-MODEL-V0'),
  check(issuer_wallet ~ '^0x[0-9a-f]{40}$'),
  check(battery_category in ('LMT','INDUSTRIAL','EV','OTHER')),
  check(data_hash ~ '^[0-9a-f]{64}$'),
  check(status in ('DRAFT','ACTIVE','ARCHIVED','REVOKED'))
);

create table public.evo_battery_passports (
  passport_id text primary key,
  schema_version text not null default 'EVO-BATTERY-PASSPORT-V0',
  model_id text not null references public.evo_battery_models(model_id) on delete restrict,
  unique_battery_identifier text not null,
  battery_serial text,
  seal_id text references public.evo_seals(seal_id) on delete restrict,
  issuer_wallet text not null,
  battery_status text not null default 'ORIGINAL',
  individual_data jsonb not null default '{}'::jsonb,
  data_hash text not null,
  signature text not null,
  signature_message text not null,
  signed_at timestamptz not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(issuer_wallet,unique_battery_identifier),
  check(passport_id ~ '^EBP-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$'),
  check(schema_version='EVO-BATTERY-PASSPORT-V0'),
  check(issuer_wallet ~ '^0x[0-9a-f]{40}$'),
  check(data_hash ~ '^[0-9a-f]{64}$'),
  check(battery_status in ('ORIGINAL','REPURPOSED','REUSED','REMANUFACTURED','WASTE')),
  check(status in ('ACTIVE','CEASED','REVOKED'))
);

create table public.evo_battery_passport_versions (
  version_id bigserial primary key,
  passport_id text not null references public.evo_battery_passports(passport_id) on delete restrict,
  version_no integer not null check(version_no>0),
  snapshot jsonb not null,
  snapshot_hash text not null check(snapshot_hash ~ '^[0-9a-f]{64}$'),
  actor_wallet text not null check(actor_wallet ~ '^0x[0-9a-f]{40}$'),
  signature text not null,
  signature_message text not null,
  signed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(passport_id,version_no),
  unique(passport_id,snapshot_hash)
);
