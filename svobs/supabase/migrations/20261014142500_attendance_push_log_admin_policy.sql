grant select on table public.yoklama_push_hatirlatmalari to authenticated;

create policy admin_read on public.yoklama_push_hatirlatmalari
for select to authenticated
using (
  exists (
    select 1
    from public.dersler d
    join public.siniflar s on s.id = d.sinif_id
    where d.id = yoklama_push_hatirlatmalari.ders_id
      and s.program_id in (select private.program_ids(true))
  )
);
