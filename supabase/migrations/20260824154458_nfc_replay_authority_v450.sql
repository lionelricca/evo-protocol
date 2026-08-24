create table public.evo_nfc_tags (
  tag_id text primary key,
  seal_id text not null references public.evo_seals(seal_id) on delete restrict,
  tag_type text not null default 'NTAG_424_DNA' check (tag_type in ('NTAG_424_DNA','NTAG_424_DNA_TAGTAMPER')),
  expected_uid text not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','REVOKED','RETIRED')),
  last_counter bigint not null default -1 check (last_counter between -1 and 16777215),
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evo_nfc_tags_tag_id_format check (tag_id ~ '^NFC-[A-Z0-9]{12,40}$'),
  constraint evo_nfc_tags_uid_format check (expected_uid ~ '^[0-9A-F]{14}$'),
  constraint evo_nfc_tags_uid_unique unique (expected_uid)
);

alter table public.evo_nfc_tags enable row level security;
revoke all on table public.evo_nfc_tags from anon, authenticated;

create or replace function public.evo_accept_nfc_counter(
  p_tag_id text,
  p_uid text,
  p_counter bigint,
  p_verified_at timestamptz default now()
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.evo_nfc_tags%rowtype;
begin
  if p_tag_id is null or p_tag_id !~ '^NFC-[A-Z0-9]{12,40}$' then
    return jsonb_build_object('accepted', false, 'reason', 'TAG_ID_INVALID');
  end if;
  if p_uid is null or upper(p_uid) !~ '^[0-9A-F]{14}$' then
    return jsonb_build_object('accepted', false, 'reason', 'UID_INVALID');
  end if;
  if p_counter is null or p_counter < 0 or p_counter > 16777215 then
    return jsonb_build_object('accepted', false, 'reason', 'COUNTER_INVALID');
  end if;

  update public.evo_nfc_tags
     set last_counter = p_counter,
         last_verified_at = coalesce(p_verified_at, now()),
         updated_at = now()
   where tag_id = p_tag_id
     and status = 'ACTIVE'
     and expected_uid = upper(p_uid)
     and p_counter > last_counter
  returning * into v_row;

  if found then
    return jsonb_build_object(
      'accepted', true,
      'reason', 'FRESH_COUNTER_ACCEPTED',
      'tag_id', v_row.tag_id,
      'seal_id', v_row.seal_id,
      'counter', v_row.last_counter,
      'verified_at', v_row.last_verified_at
    );
  end if;

  if exists (
    select 1 from public.evo_nfc_tags
     where tag_id = p_tag_id and status = 'ACTIVE' and expected_uid = upper(p_uid)
  ) then
    return jsonb_build_object('accepted', false, 'reason', 'REPLAY_OR_STALE_COUNTER');
  end if;

  return jsonb_build_object('accepted', false, 'reason', 'TAG_NOT_ACTIVE_OR_UID_MISMATCH');
end;
$$;

revoke all on function public.evo_accept_nfc_counter(text,text,bigint,timestamptz) from public, anon, authenticated;
grant execute on function public.evo_accept_nfc_counter(text,text,bigint,timestamptz) to service_role;
