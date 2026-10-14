create table if not exists public.yoklama_uyarilari (
  id uuid primary key default gen_random_uuid(),
  ders_id uuid not null references public.dersler(id) on delete cascade,
  ders_tarihi date not null,
  sorumlu_ogrenci_id uuid references public.ogrenciler(id) on delete set null,
  duyuru_id uuid references public.duyurular(id) on delete set null,
  email_gonderildi boolean not null default false,
  olusturulma_tarihi timestamptz not null default now(),
  unique (ders_id, ders_tarihi)
);

alter table public.yoklama_uyarilari enable row level security;
revoke all on table public.yoklama_uyarilari from anon, authenticated;
grant select on table public.yoklama_uyarilari to authenticated;

create policy admin_read on public.yoklama_uyarilari
for select to authenticated
using (
  exists (
    select 1
    from public.dersler d
    join public.siniflar s on s.id = d.sinif_id
    where d.id = yoklama_uyarilari.ders_id
      and s.program_id in (select private.program_ids(true))
  )
);

create index if not exists idx_yoklama_uyarilari_ders_tarihi
  on public.yoklama_uyarilari (ders_id, ders_tarihi);
