-- Policies and indexes only. No existing application rows are updated or deleted.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- Harden the existing recursion-safe role lookups without changing their result.
alter function public.get_rol() set search_path = public, pg_temp;
alter function public.get_program_idleri() set search_path = public, pg_temp;
revoke execute on function public.get_rol() from public, anon;
revoke execute on function public.get_program_idleri() from public, anon;
grant execute on function public.get_rol() to authenticated;
grant execute on function public.get_program_idleri() to authenticated;

-- A profile owner must never be able to promote their own role.
revoke insert, update on public.kullanicilar from authenticated;
grant update (ad, soyad, telefon, avatar_url) on public.kullanicilar to authenticated;

-- Private helpers avoid circular RLS joins. All derive authority from auth.uid(),
-- use a fixed search path, and are unavailable through the public REST schema.
create or replace function private.program_ids(manage_only boolean default false)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select p.id from public.programlar p
  where (select auth.uid()) is not null and (
    (select public.get_rol()) = 'super_admin'
    or exists (select 1 from public.kullanici_programlar kp
      where kp.kullanici_id = (select auth.uid()) and kp.program_id = p.id
      and (not manage_only or (select public.get_rol()) = 'program_admin'))
    or (not manage_only and (
      exists (select 1 from public.ogrenciler o join public.siniflar s on s.id=o.sinif_id
        where o.kullanici_id=(select auth.uid()) and o.aktif and s.program_id=p.id)
      or exists (select 1 from public.ogretmen_dersleri od join public.dersler d on d.id=od.ders_id
        join public.siniflar s on s.id=d.sinif_id where od.ogretmen_id=(select auth.uid()) and s.program_id=p.id)
    ))
  );
$$;
create or replace function private.lesson_ids(teachers boolean default true, responsible boolean default false)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select d.id from public.dersler d join public.siniflar s on s.id=d.sinif_id
  where (select auth.uid()) is not null and (
    s.program_id in (select private.program_ids(true))
    or (teachers and (select public.get_rol())='ogretmen' and exists (
      select 1 from public.ogretmen_dersleri od where od.ders_id=d.id and od.ogretmen_id=(select auth.uid())))
    or (responsible and exists (select 1 from public.ders_sorumlulari ds join public.ogrenciler o on o.id=ds.ogrenci_id
      where ds.ders_id=d.id and o.kullanici_id=(select auth.uid()) and o.aktif))
  );
$$;
create or replace function private.student_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select o.id from public.ogrenciler o where o.kullanici_id=(select auth.uid()) and o.aktif;
$$;
create or replace function private.class_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select s.id from public.siniflar s where s.program_id in (select private.program_ids(true))
  union select d.sinif_id from public.dersler d where d.id in (select private.lesson_ids(true,true));
$$;
create or replace function private.student_matches_lesson(student uuid, lesson uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.ogrenciler o join public.dersler d on d.sinif_id=o.sinif_id
    where o.id=student and d.id=lesson
  );
$$;
create or replace function private.visible_user_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) where (select auth.uid()) is not null
  union select o.kullanici_id from public.ogrenciler o where o.sinif_id in (select private.class_ids())
  union select kp.kullanici_id from public.kullanici_programlar kp where kp.program_id in (select private.program_ids(false))
  union select od.ogretmen_id from public.ogretmen_dersleri od join public.dersler d on d.id=od.ders_id
    join public.siniflar s on s.id=d.sinif_id where s.program_id in (select private.program_ids(false))
  union select k.id from public.kullanicilar k where (select public.get_rol())='super_admin';
$$;
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

revoke all on public.kullanicilar from anon;
revoke all on public.kullanici_programlar from anon;
revoke all on public.programlar from anon;
revoke all on public.siniflar from anon;
revoke all on public.dersler from anon;
revoke all on public.ogrenciler from anon;
revoke all on public.ogretmen_dersleri from anon;
revoke all on public.ders_sorumlulari from anon;
revoke all on public.yoklamalar from anon;
revoke all on public.notlar from anon;
revoke all on public.sinavlar from anon;
revoke all on public.odevler from anon;
revoke all on public.odev_teslimleri from anon;
revoke all on public.duyurular from anon;
revoke all on public.ders_oturumlari from anon;
revoke all on public.push_abonelikleri from anon;

create policy qa_scoped_read on public.kullanicilar as restrictive for select to authenticated using (id in (select private.visible_user_ids()));

create policy qa_scoped_read on public.kullanici_programlar as restrictive for select to authenticated using (kullanici_id = (select auth.uid()) or program_id in (select private.program_ids(true)));

create policy qa_scoped_read on public.programlar as restrictive for select to authenticated using (id in (select private.program_ids(false)));

create policy qa_scoped_read on public.siniflar as restrictive for select to authenticated using (program_id in (select private.program_ids(false)));

create policy qa_scoped_read on public.dersler as restrictive for select to authenticated using (sinif_id in (select id from public.siniflar));

create policy qa_scoped_read on public.ogrenciler as restrictive for select to authenticated using (kullanici_id = (select auth.uid()) or sinif_id in (select private.class_ids()));

create policy qa_scoped_read on public.ogretmen_dersleri as restrictive for select to authenticated using (ogretmen_id = (select auth.uid()) or ders_id in (select private.lesson_ids(false,false)));

create policy qa_scoped_read on public.ders_sorumlulari as restrictive for select to authenticated using (ogrenci_id in (select private.student_ids()) or ders_id in (select private.lesson_ids(false,false)));

create policy qa_scoped_read on public.notlar as restrictive for select to authenticated using (ogrenci_id in (select private.student_ids()) or ders_id in (select private.lesson_ids(true,false)));

create policy qa_scoped_read on public.yoklamalar as restrictive for select to authenticated using (ogrenci_id in (select private.student_ids()) or ders_id in (select private.lesson_ids(true,true)));

create policy qa_scoped_read on public.sinavlar as restrictive for select to authenticated using (ders_id in (select id from public.dersler));

create policy qa_scoped_read on public.odevler as restrictive for select to authenticated using (program_id in (select private.program_ids(false)));

create policy qa_scoped_read on public.odev_teslimleri as restrictive for select to authenticated using (ogrenci_id in (select private.student_ids()) or ders_id in (select private.lesson_ids(true,false)));

create policy qa_scoped_read on public.ders_oturumlari as restrictive for select to authenticated using (ders_id in (select id from public.dersler));

create policy qa_scoped_read on public.duyurular as restrictive for select to authenticated using (program_id in (select private.program_ids(true)) or (program_id in (select private.program_ids(false)) and (hedef_tipi = 'tumu' or hedef_kullanici_id = (select auth.uid()) or hedef_sinif_id in (select sinif_id from public.ogrenciler where kullanici_id=(select auth.uid())))));
create policy staff_read on public.yoklamalar for select to authenticated using (ders_id in (select private.lesson_ids(true,true)));
create policy staff_read on public.ders_oturumlari for select to authenticated using (ders_id in (select private.lesson_ids(true,true)));
create policy admin_membership_read on public.kullanici_programlar for select to authenticated using (program_id in (select private.program_ids(true)));
create policy qa_scoped_insert on public.siniflar as restrictive for insert to authenticated with check (program_id in (select private.program_ids(true)));
create policy qa_scoped_update on public.siniflar as restrictive for update to authenticated using (program_id in (select private.program_ids(true))) with check (program_id in (select private.program_ids(true)));
create policy qa_scoped_delete on public.siniflar as restrictive for delete to authenticated using (program_id in (select private.program_ids(true)));
create policy qa_scoped_insert on public.dersler as restrictive for insert to authenticated with check (sinif_id in (select id from public.siniflar where program_id in (select private.program_ids(true))));
create policy qa_scoped_update on public.dersler as restrictive for update to authenticated using (sinif_id in (select id from public.siniflar where program_id in (select private.program_ids(true)))) with check (sinif_id in (select id from public.siniflar where program_id in (select private.program_ids(true))));
create policy qa_scoped_delete on public.dersler as restrictive for delete to authenticated using (sinif_id in (select id from public.siniflar where program_id in (select private.program_ids(true))));
create policy qa_scoped_insert on public.ogrenciler as restrictive for insert to authenticated with check (sinif_id in (select id from public.siniflar where program_id in (select private.program_ids(true))));
create policy qa_scoped_update on public.ogrenciler as restrictive for update to authenticated using (sinif_id in (select id from public.siniflar where program_id in (select private.program_ids(true)))) with check (sinif_id in (select id from public.siniflar where program_id in (select private.program_ids(true))));
create policy qa_scoped_delete on public.ogrenciler as restrictive for delete to authenticated using (sinif_id in (select id from public.siniflar where program_id in (select private.program_ids(true))));
create policy qa_scoped_insert on public.ogretmen_dersleri as restrictive for insert to authenticated with check (ders_id in (select private.lesson_ids(false,false)));
create policy qa_scoped_update on public.ogretmen_dersleri as restrictive for update to authenticated using (ders_id in (select private.lesson_ids(false,false))) with check (ders_id in (select private.lesson_ids(false,false)));
create policy qa_scoped_delete on public.ogretmen_dersleri as restrictive for delete to authenticated using (ders_id in (select private.lesson_ids(false,false)));
create policy qa_scoped_insert on public.ders_sorumlulari as restrictive for insert to authenticated with check (ders_id in (select private.lesson_ids(false,false)) and private.student_matches_lesson(ogrenci_id, ders_id));
create policy qa_scoped_update on public.ders_sorumlulari as restrictive for update to authenticated using (ders_id in (select private.lesson_ids(false,false)) and private.student_matches_lesson(ogrenci_id, ders_id)) with check (ders_id in (select private.lesson_ids(false,false)) and private.student_matches_lesson(ogrenci_id, ders_id));
create policy qa_scoped_delete on public.ders_sorumlulari as restrictive for delete to authenticated using (ders_id in (select private.lesson_ids(false,false)) and private.student_matches_lesson(ogrenci_id, ders_id));
create policy qa_scoped_insert on public.notlar as restrictive for insert to authenticated with check (ders_id in (select private.lesson_ids(true,false)) and private.student_matches_lesson(ogrenci_id, ders_id));
create policy qa_scoped_update on public.notlar as restrictive for update to authenticated using (ders_id in (select private.lesson_ids(true,false)) and private.student_matches_lesson(ogrenci_id, ders_id)) with check (ders_id in (select private.lesson_ids(true,false)) and private.student_matches_lesson(ogrenci_id, ders_id));
create policy qa_scoped_delete on public.notlar as restrictive for delete to authenticated using (ders_id in (select private.lesson_ids(true,false)) and private.student_matches_lesson(ogrenci_id, ders_id));
create policy qa_scoped_insert on public.sinavlar as restrictive for insert to authenticated with check (ders_id in (select private.lesson_ids(true,false)));
create policy qa_scoped_update on public.sinavlar as restrictive for update to authenticated using (ders_id in (select private.lesson_ids(true,false))) with check (ders_id in (select private.lesson_ids(true,false)));
create policy qa_scoped_delete on public.sinavlar as restrictive for delete to authenticated using (ders_id in (select private.lesson_ids(true,false)));
create policy qa_scoped_insert on public.yoklamalar as restrictive for insert to authenticated with check (ders_id in (select private.lesson_ids(true,true)) and private.student_matches_lesson(ogrenci_id, ders_id));
create policy qa_scoped_update on public.yoklamalar as restrictive for update to authenticated using (ders_id in (select private.lesson_ids(true,true)) and private.student_matches_lesson(ogrenci_id, ders_id)) with check (ders_id in (select private.lesson_ids(true,true)) and private.student_matches_lesson(ogrenci_id, ders_id));
create policy qa_scoped_delete on public.yoklamalar as restrictive for delete to authenticated using (ders_id in (select private.lesson_ids(true,true)) and private.student_matches_lesson(ogrenci_id, ders_id));
create policy qa_scoped_insert on public.ders_oturumlari as restrictive for insert to authenticated with check (ders_id in (select private.lesson_ids(true,true)));
create policy qa_scoped_update on public.ders_oturumlari as restrictive for update to authenticated using (ders_id in (select private.lesson_ids(true,true))) with check (ders_id in (select private.lesson_ids(true,true)));
create policy qa_scoped_delete on public.ders_oturumlari as restrictive for delete to authenticated using (ders_id in (select private.lesson_ids(true,true)));
create policy qa_scoped_insert on public.odevler as restrictive for insert to authenticated with check (program_id in (select private.program_ids(true)) and (ders_id is null or ders_id in (select private.lesson_ids(false,false))));
create policy qa_scoped_update on public.odevler as restrictive for update to authenticated using (program_id in (select private.program_ids(true)) and (ders_id is null or ders_id in (select private.lesson_ids(false,false)))) with check (program_id in (select private.program_ids(true)) and (ders_id is null or ders_id in (select private.lesson_ids(false,false))));
create policy qa_scoped_delete on public.odevler as restrictive for delete to authenticated using (program_id in (select private.program_ids(true)) and (ders_id is null or ders_id in (select private.lesson_ids(false,false))));
create policy qa_scoped_insert on public.odev_teslimleri as restrictive for insert to authenticated with check (ogrenci_id in (select private.student_ids()) and private.student_matches_lesson(ogrenci_id, ders_id) and exists (select 1 from public.odevler o where o.id=odev_id and o.ders_id=odev_teslimleri.ders_id));
create policy qa_scoped_update on public.odev_teslimleri as restrictive for update to authenticated using (ogrenci_id in (select private.student_ids()) and private.student_matches_lesson(ogrenci_id, ders_id) and exists (select 1 from public.odevler o where o.id=odev_id and o.ders_id=odev_teslimleri.ders_id)) with check (ogrenci_id in (select private.student_ids()) and private.student_matches_lesson(ogrenci_id, ders_id) and exists (select 1 from public.odevler o where o.id=odev_id and o.ders_id=odev_teslimleri.ders_id));
create policy qa_scoped_delete on public.odev_teslimleri as restrictive for delete to authenticated using (ogrenci_id in (select private.student_ids()) and private.student_matches_lesson(ogrenci_id, ders_id) and exists (select 1 from public.odevler o where o.id=odev_id and o.ders_id=odev_teslimleri.ders_id));
create policy qa_scoped_insert on public.duyurular as restrictive for insert to authenticated with check (program_id in (select private.program_ids(true)));
create policy qa_scoped_update on public.duyurular as restrictive for update to authenticated using (program_id in (select private.program_ids(true))) with check (program_id in (select private.program_ids(true)));
create policy qa_scoped_delete on public.duyurular as restrictive for delete to authenticated using (program_id in (select private.program_ids(true)));
create policy qa_scoped_delete on public.kullanicilar as restrictive for delete to authenticated using (false);
create index if not exists idx_siniflar_program_id on public.siniflar (program_id);
create index if not exists idx_dersler_sinif_id on public.dersler (sinif_id);
create index if not exists idx_ogrenciler_kullanici_id on public.ogrenciler (kullanici_id);
create index if not exists idx_ogrenciler_sinif_id on public.ogrenciler (sinif_id);
create index if not exists idx_yoklamalar_ders_id_tarih on public.yoklamalar (ders_id, tarih);
create index if not exists idx_yoklamalar_ogrenci_id on public.yoklamalar (ogrenci_id);
create index if not exists idx_notlar_ders_id on public.notlar (ders_id);
create index if not exists idx_notlar_ogrenci_id on public.notlar (ogrenci_id);
create index if not exists idx_ogretmen_dersleri_ders_id on public.ogretmen_dersleri (ders_id);
create index if not exists idx_ders_sorumlulari_ders_id on public.ders_sorumlulari (ders_id);

create policy enrolled_session_read on public.ders_oturumlari for select to authenticated using (ders_id in (select id from public.dersler));
