\set ON_ERROR_STOP on

create role anon nologin;
create role authenticated nologin;
create role service_role nologin;

create table public.evo_seals (
  seal_id text primary key,
  status text not null default 'ACTIVE'
);
insert into public.evo_seals(seal_id,status)
values ('EVO-DD403D40-069F9CB8-4E8FDE52','ACTIVE'),('EVO-460C9274-39725594-215E874B','ACTIVE');

\ir ../supabase/migrations/20260824154458_nfc_replay_authority_v450.sql
\ir ../supabase/migrations/20260824154519_nfc_explicit_deny_v450.sql
\ir ../supabase/migrations/20260824154708_nfc_seal_binding_authority_v450.sql

insert into public.evo_nfc_tags(tag_id,seal_id,expected_uid)
values ('NFC-TESTVECTOR01','EVO-DD403D40-069F9CB8-4E8FDE52','04DE5F1EACC040');

do $$
declare
  r jsonb;
  v_rls boolean;
  v_search_path text[];
begin
  select relrowsecurity into v_rls from pg_class where oid='public.evo_nfc_tags'::regclass;
  if v_rls is not true then raise exception 'RLS not enabled'; end if;

  if has_table_privilege('anon','public.evo_nfc_tags','SELECT') then raise exception 'anon unexpectedly has SELECT'; end if;
  if has_table_privilege('authenticated','public.evo_nfc_tags','SELECT') then raise exception 'authenticated unexpectedly has SELECT'; end if;
  if has_function_privilege('anon','public.evo_accept_nfc_counter(text,text,text,bigint,timestamp with time zone)','EXECUTE') then raise exception 'anon unexpectedly has RPC EXECUTE'; end if;
  if has_function_privilege('authenticated','public.evo_accept_nfc_counter(text,text,text,bigint,timestamp with time zone)','EXECUTE') then raise exception 'authenticated unexpectedly has RPC EXECUTE'; end if;
  if not has_function_privilege('service_role','public.evo_accept_nfc_counter(text,text,text,bigint,timestamp with time zone)','EXECUTE') then raise exception 'service_role lacks RPC EXECUTE'; end if;

  select proconfig into v_search_path from pg_proc where oid='public.evo_accept_nfc_counter(text,text,text,bigint,timestamp with time zone)'::regprocedure;
  if v_search_path is null or not exists (
    select 1 from unnest(v_search_path) as cfg
    where cfg in ('search_path=', 'search_path=""')
  ) then raise exception 'RPC search_path is not empty: %', v_search_path; end if;

  r := public.evo_accept_nfc_counter('NFC-TESTVECTOR01','04DE5F1EACC040','EVO-460C9274-39725594-215E874B',5,now());
  if r->>'reason' <> 'TAG_BINDING_NOT_ACTIVE_OR_MISMATCH' then raise exception 'wrong Seal binding was not rejected: %', r; end if;

  r := public.evo_accept_nfc_counter('NFC-TESTVECTOR01','04DE5F1EACC041','EVO-DD403D40-069F9CB8-4E8FDE52',5,now());
  if r->>'reason' <> 'TAG_BINDING_NOT_ACTIVE_OR_MISMATCH' then raise exception 'wrong UID was not rejected: %', r; end if;

  r := public.evo_accept_nfc_counter('NFC-TESTVECTOR01','04DE5F1EACC040','EVO-DD403D40-069F9CB8-4E8FDE52',5,now());
  if coalesce((r->>'accepted')::boolean,false) is not true then raise exception 'fresh counter was not accepted: %', r; end if;

  r := public.evo_accept_nfc_counter('NFC-TESTVECTOR01','04DE5F1EACC040','EVO-DD403D40-069F9CB8-4E8FDE52',5,now());
  if r->>'reason' <> 'REPLAY_OR_STALE_COUNTER' then raise exception 'same counter replay was not rejected: %', r; end if;

  r := public.evo_accept_nfc_counter('NFC-TESTVECTOR01','04DE5F1EACC040','EVO-DD403D40-069F9CB8-4E8FDE52',4,now());
  if r->>'reason' <> 'REPLAY_OR_STALE_COUNTER' then raise exception 'lower counter was not rejected: %', r; end if;

  r := public.evo_accept_nfc_counter('NFC-TESTVECTOR01','04DE5F1EACC040','EVO-DD403D40-069F9CB8-4E8FDE52',6,now());
  if coalesce((r->>'accepted')::boolean,false) is not true then raise exception 'higher fresh counter was not accepted: %', r; end if;

  update public.evo_nfc_tags set status='REVOKED' where tag_id='NFC-TESTVECTOR01';
  r := public.evo_accept_nfc_counter('NFC-TESTVECTOR01','04DE5F1EACC040','EVO-DD403D40-069F9CB8-4E8FDE52',7,now());
  if r->>'reason' <> 'TAG_BINDING_NOT_ACTIVE_OR_MISMATCH' then raise exception 'revoked tag was not rejected: %', r; end if;

  if to_regprocedure('public.evo_accept_nfc_counter(text,text,bigint,timestamp with time zone)') is not null then raise exception 'obsolete unbound RPC signature still exists'; end if;
end $$;

select 'EVO V4.5 NFC replay authority PostgreSQL checks passed' as result;
