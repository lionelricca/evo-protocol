-- EVO V4.0
-- Explicit browser-role deny policy for the server-only Free Proof anti-Sybil grant table.

alter table public.evo_free_proof_grants enable row level security;

drop policy if exists evo_free_proof_grants_browser_deny on public.evo_free_proof_grants;
create policy evo_free_proof_grants_browser_deny
on public.evo_free_proof_grants
for all
to anon, authenticated
using (false)
with check (false);

revoke all on table public.evo_free_proof_grants from public, anon, authenticated;
grant select, insert, update on table public.evo_free_proof_grants to service_role;
