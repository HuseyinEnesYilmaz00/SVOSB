create or replace function private.responsible_attendance_window_open(lesson_id uuid, attendance_date date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.dersler d
    join public.ders_sorumlulari ds on ds.ders_id = d.id
    join public.ogrenciler o on o.id = ds.ogrenci_id
    where d.id = lesson_id
      and o.kullanici_id = (select auth.uid())
      and o.aktif
      and d.aktif
      and d.gun = (array['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'])[extract(isodow from attendance_date)::integer]
      and (d.baslangic_tarihi is null or attendance_date >= d.baslangic_tarihi)
      and (
        d.baslangic_tarihi is null
        or mod(
          ((attendance_date - date_trunc('week', d.baslangic_tarihi::timestamp)::date) / 7)::integer,
          case d.periyot when '2haftada1' then 2 when '3haftada1' then 3 when 'ayda1' then 4 else 1 end
        ) = 0
      )
      and now() >= ((attendance_date::text || ' ' || coalesce(nullif(d.saat, ''), '23:59'))::timestamp at time zone 'Europe/Istanbul')
      and now() <= ((attendance_date::text || ' ' || coalesce(nullif(d.saat, ''), '23:59'))::timestamp at time zone 'Europe/Istanbul') + interval '24 hours'
  );
$$;

revoke all on function private.responsible_attendance_window_open(uuid, date) from public, anon;
grant execute on function private.responsible_attendance_window_open(uuid, date) to authenticated;

drop policy if exists scoped_insert on public.yoklamalar;
create policy scoped_insert on public.yoklamalar
for insert to authenticated
with check (
  private.student_matches_lesson(ogrenci_id, ders_id)
  and (
    ders_id in (select private.lesson_ids(true, false))
    or private.responsible_attendance_window_open(ders_id, tarih)
  )
);
