-- EVO V3.3 · Supabase security audit
-- Read-only checks. A healthy production project should return zero rows from
-- the violation queries unless an item is explicitly documented as public.

-- 1) Every public table must have RLS enabled.
select n.nspname as schema_name, c.relname as table_name
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relkind='r'
  and not c.relrowsecurity
order by c.relname;

-- 2) SECURITY DEFINER routines must not be executable by PUBLIC/anon/authenticated.
select
  n.nspname as schema_name,
  p.proname,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as args,
  p.proacl
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.prosecdef
  and (
    pg_catalog.has_function_privilege('public',p.oid,'EXECUTE')
    or pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
    or pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
  )
order by p.proname;

-- 3) Direct write grants to browser roles are forbidden for EVO tables.
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and table_name like 'evo_%'
  and grantee in ('anon','authenticated','PUBLIC')
  and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER','REFERENCES')
order by table_name,grantee,privilege_type;

-- 4) Inventory browser-readable EVO tables for explicit review.
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and table_name like 'evo_%'
  and grantee in ('anon','authenticated','PUBLIC')
  and privilege_type='SELECT'
order by table_name,grantee;

-- 5) SECURITY DEFINER functions should have a deliberate search_path.
select
  n.nspname as schema_name,
  p.proname,
  p.proconfig
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.prosecdef
  and (p.proconfig is null or not exists (
    select 1 from unnest(p.proconfig) setting where setting like 'search_path=%'
  ))
order by p.proname;
