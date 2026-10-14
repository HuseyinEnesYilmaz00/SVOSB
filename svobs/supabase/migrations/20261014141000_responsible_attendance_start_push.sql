create table if not exists public.yoklama_push_hatirlatmalari (
  id uuid primary key default gen_random_uuid(),
  ders_id uuid not null references public.dersler(id) on delete cascade,
  ders_tarihi date not null,
  sorumlu_ogrenci_id uuid not null references public.ogrenciler(id) on delete cascade,
  gonderildi boolean not null default false,
  gonderilme_tarihi timestamptz,
  deneme_sayisi integer not null default 0,
  son_hata text,
  olusturulma_tarihi timestamptz not null default now(),
  unique (ders_id, ders_tarihi, sorumlu_ogrenci_id)
);

alter table public.yoklama_push_hatirlatmalari enable row level security;
revoke all on table public.yoklama_push_hatirlatmalari from anon, authenticated;

create index if not exists idx_yoklama_push_hatirlatmalari_sorumlu
  on public.yoklama_push_hatirlatmalari (sorumlu_ogrenci_id, ders_tarihi desc);

select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'check-attendance-reminders-hourly'),
  schedule := '*/5 * * * *'
);
