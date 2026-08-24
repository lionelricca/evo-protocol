create policy evo_nfc_tags_explicit_deny_all
on public.evo_nfc_tags
for all
to public
using (false)
with check (false);
