create table if not exists public.duyuru_okumalari (
  duyuru_id uuid not null references public.duyurular(id) on delete cascade,
  kullanici_id uuid not null references public.kullanicilar(id) on delete cascade,
  okundu_tarihi timestamptz not null default now(),
  primary key (duyuru_id, kullanici_id)
);

alter table public.duyuru_okumalari enable row level security;
revoke all on table public.duyuru_okumalari from anon;
grant select, insert, update on table public.duyuru_okumalari to authenticated;

create policy own_or_admin_read on public.duyuru_okumalari
for select to authenticated
using (
  kullanici_id = (select auth.uid())
  or exists (
    select 1
    from public.duyurular d
    where d.id = duyuru_okumalari.duyuru_id
      and d.program_id in (select private.program_ids(true))
  )
);

create policy own_visible_insert on public.duyuru_okumalari
for insert to authenticated
with check (
  kullanici_id = (select auth.uid())
  and exists (
    select 1
    from public.duyurular d
    where d.id = duyuru_okumalari.duyuru_id
      and d.program_id in (select private.program_ids(false))
      and (
        d.hedef_tipi = 'tumu'
        or d.hedef_kullanici_id = (select auth.uid())
        or d.hedef_sinif_id in (
          select o.sinif_id
          from public.ogrenciler o
          where o.kullanici_id = (select auth.uid()) and o.aktif
        )
      )
  )
);

create policy own_visible_update on public.duyuru_okumalari
for update to authenticated
using (kullanici_id = (select auth.uid()))
with check (kullanici_id = (select auth.uid()));

create index if not exists idx_duyuru_okumalari_kullanici
  on public.duyuru_okumalari (kullanici_id, okundu_tarihi desc);

alter table public.push_abonelikleri
  add column if not exists guncellenme_tarihi timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'duyurular'
  ) then
    alter publication supabase_realtime add table public.duyurular;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'duyuru_okumalari'
  ) then
    alter publication supabase_realtime add table public.duyuru_okumalari;
  end if;
end
$$;

select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'check-attendance-reminders-hourly'),
  command := $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'attendance_project_url') || '/functions/v1/check-yoklama-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'attendance_cron_secret')
      ),
      body := jsonb_build_object('source', 'cron'),
      timeout_milliseconds := 15000
    );
  $job$
);
