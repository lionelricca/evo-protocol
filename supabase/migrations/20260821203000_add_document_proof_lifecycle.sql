create table if not exists public.evo_document_events (
  event_id text primary key,
  seal_id text not null references public.evo_seals(seal_id) on delete cascade,
  version text not null,
  event_type text not null,
  actor_wallet text not null,
  related_seal_id text not null default '',
  reason text not null default '',
  event_digest text not null,
  nonce text not null,
  signature text not null,
  signature_message text not null,
  created_at timestamptz not null,
  registered_at timestamptz not null default now(),
  status text not null default 'ACTIVE',
  constraint evo_document_event_id_format check (event_id ~ '^EVD-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$'),
  constraint evo_document_event_type check (event_type in ('DOCUMENT_REVOKED','DOCUMENT_SUPERSEDED','DOCUMENT_NOTE')),
  constraint evo_document_event_wallet_format check (actor_wallet ~ '^0x[0-9a-f]{40}$'),
  constraint evo_document_event_digest_format check (event_digest ~ '^[0-9a-f]{64}$'),
  constraint evo_document_event_nonce_format check (nonce ~ '^[0-9a-f]{32}$'),
  constraint evo_document_event_status check (status in ('ACTIVE','VOID'))
);

create index if not exists evo_document_events_seal_registered_idx
  on public.evo_document_events(seal_id, registered_at desc);

create index if not exists evo_document_events_related_seal_idx
  on public.evo_document_events(related_seal_id)
  where related_seal_id <> '';

create unique index if not exists evo_document_events_one_terminal_idx
  on public.evo_document_events(seal_id)
  where status = 'ACTIVE'
    and event_type in ('DOCUMENT_REVOKED','DOCUMENT_SUPERSEDED');

alter table public.evo_document_events enable row level security;

revoke all on table public.evo_document_events from anon, authenticated;
grant select on table public.evo_document_events to anon, authenticated;

drop policy if exists "public can read active document events" on public.evo_document_events;
create policy "public can read active document events"
  on public.evo_document_events
  for select
  to anon, authenticated
  using (status = 'ACTIVE');

comment on table public.evo_document_events is
  'Signed lifecycle events for EVO Document Proof. Public may read active events; writes are performed only by validated service-role Edge Functions.';
