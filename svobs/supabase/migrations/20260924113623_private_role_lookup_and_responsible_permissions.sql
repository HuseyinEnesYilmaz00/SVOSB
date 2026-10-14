-- Role lookup stays recursion-safe, with no privileged function in the exposed schema.
create or replace function private.current_role()
returns text language sql stable security definer set search_path = '' as $$
  select k.rol from public.kullanicilar k where k.id=(select auth.uid());
$$;
revoke all on function private.current_role() from public, anon;
grant execute on function private.current_role() to authenticated;
create or replace function public.get_rol()
returns text language sql stable security invoker set search_path = '' as $$
  select private.current_role();
$$;
create or replace function public.get_program_idleri()
returns setof uuid language sql stable security invoker set search_path = '' as $$
  select kp.program_id from public.kullanici_programlar kp where kp.kullanici_id=(select auth.uid())
  union select p.id from public.programlar p where (select private.current_role())='super_admin';
$$;
-- Students assigned attendance responsibility may create, but may not rewrite saved attendance.
alter policy scoped_update on public.yoklamalar using (
  ders_id in (select private.lesson_ids(true,false)) and private.student_matches_lesson(ogrenci_id, ders_id)
) with check (
  ders_id in (select private.lesson_ids(true,false)) and private.student_matches_lesson(ogrenci_id, ders_id)
);
