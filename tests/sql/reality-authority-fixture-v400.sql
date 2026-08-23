\set ON_ERROR_STOP on

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF;
END $$;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

DROP TABLE IF EXISTS public.evo_reality_snapshots CASCADE;
DROP TABLE IF EXISTS public.evo_challenges CASCADE;
DROP TABLE IF EXISTS public.evo_pulses CASCADE;
DROP TABLE IF EXISTS public.evo_issuer_profiles CASCADE;
DROP TABLE IF EXISTS public.evo_passport_events CASCADE;
DROP TABLE IF EXISTS public.evo_seals CASCADE;

create table public.evo_seals(
  seal_id text primary key,
  digest text not null,
  status text not null default 'ACTIVE',
  issuer_wallet text not null
);

create table public.evo_passport_events(
  event_id text primary key,
  seal_id text not null,
  event_type text not null,
  new_owner_wallet text not null default '',
  event_digest text not null,
  registered_at timestamptz not null default now(),
  status text not null default 'ACTIVE'
);

create table public.evo_issuer_profiles(
  issuer_wallet text primary key,
  profile_hash text not null,
  status text not null
);

create table public.evo_pulses(
  pulse_hash text primary key,
  seal_id text not null,
  observed_ms bigint not null,
  status text not null default 'ACTIVE'
);

create table public.evo_challenges(
  challenge_id text primary key,
  seal_id text not null,
  completed_at timestamptz,
  status text not null
);

create table public.evo_reality_snapshots(
  snapshot_id text primary key,
  seal_id text not null,
  version text not null default 'EVO-CONTINUITY-V0',
  evidence_root text not null,
  continuity_root text not null,
  previous_continuity_root text not null,
  evidence_state jsonb not null,
  signer_wallet text not null,
  signature text not null,
  signature_message text not null,
  signed_at timestamptz not null,
  registered_at timestamptz not null default now(),
  status text not null default 'ACTIVE',
  unique(seal_id,evidence_root),
  unique(seal_id,continuity_root)
);
create unique index evo_reality_one_child_per_parent on public.evo_reality_snapshots(seal_id,previous_continuity_root) where status='ACTIVE';
