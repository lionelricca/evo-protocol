alter table public.evo_service_proofs
  drop constraint if exists evo_service_provider_distinct_owner;

alter table public.evo_service_proofs
  add constraint evo_service_provider_distinct_owner
  check (provider_wallet = '' or provider_wallet <> owner_wallet);

comment on constraint evo_service_provider_distinct_owner on public.evo_service_proofs is
  'A designated service provider must use a wallet different from the owner; otherwise a provider countersignature would not add independent evidence.';
