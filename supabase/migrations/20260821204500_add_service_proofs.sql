create table if not exists public.evo_service_proofs (
  proof_id text primary key,
  seal_id text not null references public.evo_seals(seal_id) on delete cascade,
  version text not null,
  service_type text not null,
  owner_wallet text not null,
  provider_wallet text not null default '',
  provider_label text not null default '',
  technician_label text not null default '',
  performed_at timestamptz not null,
  summary text not null,
  meter jsonb not null default '{}'::jsonb,
  parts jsonb not null default '[]'::jsonb,
  next_service jsonb not null default '{}'::jsonb,
  evidence_digests jsonb not null default '[]'::jsonb,
  service_digest text not null,
  owner_nonce text not null,
  owner_signature text not null,
  owner_message text not null,
  provider_digest text not null default '',
  provider_nonce text not null default '',
  provider_signature text not null default '',
  provider_message text not null default '',
  created_at timestamptz not null,
  registered_at timestamptz not null default now(),
  countersigned_at timestamptz,
  evidence_level text not null default 'OWNER_DECLARED',
  status text not null default 'ACTIVE',
  constraint evo_service_proof_id_format check (proof_id ~ '^EVS-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$'),
  constraint evo_service_type check (service_type in ('INSPECTED','SERVICED','REPAIRED','COMMISSIONED','WARRANTY','COMPONENT_REPLACED','METER_READING','NOTE')),
  constraint evo_service_owner_wallet check (owner_wallet ~ '^0x[0-9a-f]{40}$'),
  constraint evo_service_provider_wallet check (provider_wallet = '' or provider_wallet ~ '^0x[0-9a-f]{40}$'),
  constraint evo_service_digest_format check (service_digest ~ '^[0-9a-f]{64}$'),
  constraint evo_service_owner_nonce_format check (owner_nonce ~ '^[0-9a-f]{32}$'),
  constraint evo_service_evidence_level check (evidence_level in ('OWNER_DECLARED','PROVIDER_COUNTERSIGNED')),
  constraint evo_service_status check (status in ('ACTIVE','VOID'))
);

create index if not exists evo_service_proofs_seal_registered_idx
  on public.evo_service_proofs(seal_id, registered_at desc);
create index if not exists evo_service_proofs_provider_idx
  on public.evo_service_proofs(provider_wallet, registered_at desc)
  where provider_wallet <> '';

alter table public.evo_service_proofs enable row level security;
revoke all on table public.evo_service_proofs from anon, authenticated;
grant select on table public.evo_service_proofs to anon, authenticated;

drop policy if exists "public can read active service proofs" on public.evo_service_proofs;
create policy "public can read active service proofs"
  on public.evo_service_proofs
  for select
  to anon, authenticated
  using (status = 'ACTIVE');

comment on table public.evo_service_proofs is
  'Portable signed service evidence. OWNER_DECLARED means owner-only evidence; PROVIDER_COUNTERSIGNED adds a second service-provider signature.';
