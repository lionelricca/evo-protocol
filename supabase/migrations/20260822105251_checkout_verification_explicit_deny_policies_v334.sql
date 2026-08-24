-- EVO V3.3.4 · Production migration-history alignment
-- This follow-up migration was applied in production to make the private
-- checkout verification-rate state explicitly deny browser roles. The canonical
-- V3.3.4 migration also carries the same policies so fresh installs remain
-- self-contained; reapplying these statements is intentionally idempotent.

drop policy if exists evo_checkout_verification_limits_deny_anon
  on public.evo_checkout_verification_limits;
create policy evo_checkout_verification_limits_deny_anon
  on public.evo_checkout_verification_limits
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists evo_checkout_verification_limits_deny_authenticated
  on public.evo_checkout_verification_limits;
create policy evo_checkout_verification_limits_deny_authenticated
  on public.evo_checkout_verification_limits
  for all
  to authenticated
  using (false)
  with check (false);
