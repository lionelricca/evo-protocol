-- EVO V3.3.10
-- Prevent concurrent signed submissions from leaving multiple PENDING rows
-- for the same issuer wallet.

create unique index if not exists evo_organization_one_pending_per_wallet_idx
on public.evo_organization_submissions(issuer_wallet)
where status = 'PENDING';
